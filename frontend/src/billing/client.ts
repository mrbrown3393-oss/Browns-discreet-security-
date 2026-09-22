import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { appConfig } from '../config';

export const simulated = __DEV__ || Constants.appOwnership === 'expo' || Platform.OS === 'web';
export const rcEnabled = Platform.OS !== 'web' || __DEV__;
export const entitlementId: string = appConfig.revenueCat.entitlement;
export const offeringId: string = appConfig.revenueCat.offering;
export let billingConfigError: string | null = null;
let initialized = false;
let identityQueue: Promise<unknown> = Promise.resolve();

export function initializeRevenueCat() {
  if (initialized || !rcEnabled) return;
  const keys = appConfig.revenueCat;
  const apiKey = simulated ? keys?.testApiKey : Platform.OS === 'ios' ? keys?.iosApiKey : keys?.androidApiKey;
  if (!apiKey) {
    billingConfigError = 'Subscription configuration is missing. Please contact the app owner.';
    throw new Error(billingConfigError);
  }
  try {
    void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN).catch(() => {});
    Purchases.configure({ apiKey });
    initialized = true;
  } catch (error) {
    billingConfigError = error instanceof Error ? error.message : 'Subscriptions could not start.';
    throw error;
  }
}

// Serialize identity changes so a delayed login cannot overwrite a newer user.
export function bindRevenueCat(userId: string | null) {
  const task = identityQueue.catch(() => {}).then(async () => {
    if (!rcEnabled || billingConfigError) throw new Error(billingConfigError ?? 'Use the mobile app for subscriptions.');
    if (userId) {
      const { customerInfo } = await Purchases.logIn(userId);
      if (await Purchases.getAppUserID() !== userId || customerInfo.originalAppUserId.startsWith('$RCAnonymousID:')) {
        throw new Error('Your subscription identity could not be verified. Please retry.');
      }
      return customerInfo;
    }
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
    return null;
  });
  identityQueue = task;
  return task;
}

export function billingError(error: unknown): string {
  const value = error as { message?: string; code?: string };
  if (String(value?.code) === '20') return 'Payment is pending approval. Pro will unlock after the store confirms it.';
  return value?.message || 'Subscriptions are unavailable. Please try again.';
}