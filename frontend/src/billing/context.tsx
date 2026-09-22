import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from '../auth/context';
import { billingConfigError, billingError, bindRevenueCat, entitlementId, offeringId, rcEnabled } from './client';

function useBillingState() {
  const { user, loading } = useAuth();
  const client = useQueryClient();
  const [boundId, setBoundId] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const identityReady = !!user && user.id === boundId && !identityError;
  const key = ['revenuecat', 'customer-info', user?.id];
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;

  useEffect(() => {
    if (loading) return;
    let active = true;
    setBoundId(null);
    setIdentityError(null);
    void bindRevenueCat(user?.id ?? null).then(info => {
      if (!active) return;
      if (user && info) {
        client.setQueryData(['revenuecat', 'customer-info', user.id], info);
        setBoundId(user.id);
      }
    }).catch(err => { if (active) setIdentityError(billingError(err)); });
    return () => { active = false; };
  }, [user, loading, retry, client]);

  const customer = useQuery({ queryKey: key, queryFn: () => Purchases.getCustomerInfo(),
    enabled: identityReady && rcEnabled, staleTime: 60000, retry: 1 });
  const offerings = useQuery({ queryKey: ['revenuecat', 'offerings', user?.id], queryFn: () => Purchases.getOfferings(),
    enabled: identityReady && rcEnabled, staleTime: 300000, retry: 1 });

  useEffect(() => {
    if (!identityReady) return;
    const userId = user!.id;
    const listener = (info: CustomerInfo) => {
      if (activeUser.current === userId && info.originalAppUserId === userId) {
        client.setQueryData(['revenuecat', 'customer-info', userId], info);
      }
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void client.invalidateQueries({ queryKey: ['revenuecat', 'customer-info', userId] });
    });
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); appState.remove(); };
  }, [identityReady, user, client]);

  async function verifyIdentity() {
    if (!identityReady || !user) throw new Error(identityError ?? 'Please wait while we verify your account.');
    const info = await Purchases.getCustomerInfo();
    if (await Purchases.getAppUserID() !== user.id || info.originalAppUserId.startsWith('$RCAnonymousID:')) {
      throw new Error('Account identity changed. Sign in again before purchasing.');
    }
  }
  const operationLock = useRef(false);
  const purchase = useMutation({ mutationFn: async (pkg: PurchasesPackage) => {
    if (operationLock.current) throw new Error('A subscription action is already in progress.');
    operationLock.current = true;
    try { await verifyIdentity(); return (await Purchases.purchasePackage(pkg)).customerInfo; }
    finally { operationLock.current = false; }
  }, onSuccess: info => client.setQueryData(key, info) });
  const restore = useMutation({ mutationFn: async () => {
    if (operationLock.current) throw new Error('A subscription action is already in progress.');
    operationLock.current = true;
    try { await verifyIdentity(); return await Purchases.restorePurchases(); }
    finally { operationLock.current = false; }
  }, onSuccess: info => client.setQueryData(key, info) });
  const entitlement = identityReady ? customer.data?.entitlements.active[entitlementId] : undefined;
  return { identityReady, identityError: billingConfigError ?? identityError,
    retryIdentity: () => setRetry(value => value + 1),
    customerInfo: identityReady ? customer.data : undefined,
    packages: (offerings.data?.all[offeringId] ?? offerings.data?.current)?.availablePackages ?? [],
    isSubscribed: !!entitlement, entitlement,
    isLoading: !identityError && (!identityReady || customer.isFetching || offerings.isFetching),
    loadError: customer.error || offerings.error,
    refresh: () => client.invalidateQueries({ queryKey: ['revenuecat'] }),
    purchase: purchase.mutateAsync, restore: restore.mutateAsync,
    isPurchasing: purchase.isPending, isRestoring: restore.isPending,
  };
}
const Context = createContext<ReturnType<typeof useBillingState> | null>(null);
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={useBillingState()}>{children}</Context.Provider>;
}
export function useSubscription() {
  const value = useContext(Context);
  if (!value) throw new Error('SubscriptionProvider is missing');
  return value;
}