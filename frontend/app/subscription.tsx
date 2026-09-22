import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { appConfig } from '../src/config';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import { Button, Dialog, Notice, Screen } from '../src/components/ui';
import { useSubscription } from '../src/billing/context';
import { billingError, entitlementId, simulated } from '../src/billing/client';
import { periodLabel, PlanCard } from '../src/billing/plan-card';
import { fonts, makeStyles, useTheme } from '../src/theme';

export default function Subscription() {
  const s = useStyles(); const { colors } = useTheme(); const billing = useSubscription();
  const [selectedId, setSelectedId] = useState('$rc_annual');
  const [pendingPackage, setPendingPackage] = useState<PurchasesPackage | null>(null);
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<'terms' | 'privacy' | 'manage' | null>(null);
  const selected = billing.packages.find(pkg => pkg.identifier === selectedId) ?? billing.packages[0];
  const monthly = billing.packages.find(pkg => pkg.identifier === '$rc_monthly');
  const annual = billing.packages.find(pkg => pkg.identifier === '$rc_annual');
  const savings = monthly && annual && monthly.product.currencyCode === annual.product.currencyCode && monthly.product.price > 0
    ? Math.floor((1 - annual.product.price / (monthly.product.price * 12)) * 100) : 0;
  const busy = billing.isPurchasing || billing.isRestoring;
  const liveReady = simulated || appConfig.revenueCat.liveSalesEnabled;

  async function purchase(pkg: PurchasesPackage) {
    setError(null); setMessage(null); setPendingPackage(null);
    try {
      const info = await billing.purchase(pkg);
      if (info.entitlements.active[entitlementId]) setMessage(simulated ? 'Simulated purchase complete. Your Pro entitlement is active.' : 'Welcome to Pro. Your subscription is active.');
      else setMessage('Purchase received. Pro is not active yet; refresh your membership once the store confirms it.');
    } catch (err) {
      if (!(err as { userCancelled?: boolean }).userCancelled) setError(billingError(err));
    }
  }
  async function restore() {
    setError(null); setMessage(null);
    try {
      const info = await billing.restore();
      setMessage(info.entitlements.active[entitlementId] ? 'Your Pro subscription has been restored.' : 'No active Pro subscription was found for this account.');
    } catch (err) { setError(billingError(err)); }
  }
  async function manage() {
    if (simulated) { setInfo('manage'); return; }
    const url = billing.customerInfo?.managementURL;
    if (!url) { setInfo('manage'); return; }
    try { await Linking.openURL(url); } catch { setError('Unable to open subscription settings. Manage your subscription in your app store account.'); }
  }

  return <Screen testID="subscription-screen">
    <View style={s.header}><Pressable testID="subscription-back-button" accessibilityLabel="Back to workspace" accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.iconButton} disabled={busy}><Ionicons name="arrow-back" size={23} color={colors.onSurface} /></Pressable><Text style={s.headerTitle}>MEMBERSHIP</Text><View style={s.proBadge}><Text style={s.proText}>PRO</Text></View></View>
    <View style={s.hero}><View style={s.heroIcon}><Ionicons name="shield-checkmark-outline" size={34} color={colors.brand} /></View><Text style={s.eyebrow}>ZEROTRUST / PRO</Text><Text testID="subscription-title" style={s.title}>{billing.isSubscribed ? 'MORE CLARITY.\nYOU’RE PRO.' : 'MORE CLARITY.\nMORE CONTROL.'}</Text><Text style={s.subtitle}>A deeper perspective on your security.</Text></View>
    <View style={s.features}>
      <Benefit icon="sparkles-outline" title="AI security assistant" text="Contextual guidance, powered by GPT-5.4" />
      <Benefit icon="document-text-outline" title="Advanced security reports" text="Deeper findings. Clearer priorities." />
    </View>
    <Text testID="pro-feature-availability" style={s.availability}>Includes AI guidance and saved reports from your workspace data.</Text>
    {simulated && <Notice testID="subscription-simulated-notice" text="SIMULATED PURCHASES · RevenueCat Test Store. No real charges. Security guidance uses your recorded workspace data, not automatic endpoint monitoring." />}
    {!liveReady && <Notice testID="subscription-live-disabled" text="Live subscriptions are not open yet. Store credentials, operator policies and device purchase testing must be completed before real purchases are enabled." />}
    {!!billing.identityError && <><Notice testID="subscription-identity-error" text={billing.identityError} error /><Button testID="subscription-retry-identity-button" secondary title="Reconnect subscription account" onPress={billing.retryIdentity} /></>}
    {!!error && <Notice testID="subscription-action-error" text={error} error />}
    {!!message && <Notice testID="subscription-action-message" text={message} />}

    {billing.isSubscribed ? <View style={s.activeCard}>
      <View style={s.activeHeading}><Ionicons name="checkmark-circle" size={23} color={colors.success} /><Text testID="subscription-active-status" style={s.activeTitle}>Pro is active{simulated ? ' · Test Store' : ''}</Text></View>
      <Text testID="subscription-expiry" style={s.activeDetail}>{billing.entitlement?.expirationDate ? `${billing.entitlement.willRenew ? 'Renews' : 'Access until'} ${new Date(billing.entitlement.expirationDate).toLocaleDateString()}` : 'Access verified by RevenueCat'}</Text>
      <Button testID="subscription-manage-button" title="Manage subscription" secondary onPress={() => void manage()} disabled={busy} />
    </View> : <View style={s.plans}>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>CHOOSE YOUR PLAN</Text><Text style={s.sectionHint}>Cancel anytime</Text></View>
      {billing.isLoading && <ActivityIndicator testID="subscription-loading" color={colors.brand} style={s.loader} />}
      {!billing.isLoading && (!!billing.loadError || billing.packages.length === 0) ? <>
        <Notice testID="subscription-options-unavailable" text="Subscription options are unavailable right now. Please try again later." error />
        <Button testID="subscription-retry-offerings-button" title="Try again" secondary onPress={() => void billing.refresh()} />
      </> : billing.packages.map(pkg => <PlanCard key={pkg.identifier} pkg={pkg} selected={pkg.identifier === selected?.identifier} onPress={() => setSelectedId(pkg.identifier)} disabled={busy} savings={pkg.identifier === '$rc_annual' ? savings : 0} />)}
      {!!selected && !billing.loadError && <>
        <View style={s.buy}><Button testID="subscription-purchase-button" title={simulated ? 'Test Pro subscription' : 'Subscribe to Pro'} loading={billing.isPurchasing} disabled={!billing.identityReady || busy || !liveReady || billing.isLoading}
          onPress={() => simulated ? setPendingPackage(selected) : void purchase(selected)} /></View>
        <Text testID="subscription-billing-disclosure" style={s.disclosure}>{selected.product.priceString} per {periodLabel(selected.product.subscriptionPeriod)}. {simulated ? 'Simulated billing only. No payment will be taken.' : 'Payment is charged to your store account. Renews automatically unless canceled at least 24 hours before the end of the current period.'}</Text>
      </>}
    </View>}
    <Pressable testID="subscription-restore-button" accessibilityRole="button" disabled={!billing.identityReady || busy} onPress={() => void restore()} style={s.restore}>
      {billing.isRestoring ? <ActivityIndicator color={colors.muted} /> : <Text style={[s.restoreText, (!billing.identityReady || busy) && { opacity: 0.4 }]}>Restore purchases</Text>}
    </Pressable>
    <View style={s.bottomLinks}>
      <Pressable testID="subscription-terms-button" accessibilityRole="button" style={s.link} onPress={() => setInfo('terms')}><Text style={s.linkText}>Subscription terms</Text></Pressable>
      <Text style={s.linkText}>/</Text><Pressable testID="subscription-privacy-button" accessibilityRole="button" style={s.link} onPress={() => setInfo('privacy')}><Text style={s.linkText}>Data & privacy</Text></Pressable>
    </View>
    <View style={s.powered}><Ionicons name="lock-closed-outline" size={11} color={colors.muted} /><Text style={s.poweredText}>SUBSCRIPTIONS POWERED BY REVENUECAT</Text></View>

    <Dialog testID="test-purchase-dialog" visible={!!pendingPackage} title="Confirm simulated purchase" onClose={() => setPendingPackage(null)}>
      <Text testID="test-purchase-summary" style={s.dialogText}>{pendingPackage?.product.title} · {pendingPackage?.product.priceString} / {periodLabel(pendingPackage?.product.subscriptionPeriod ?? null)}</Text>
      <Text style={s.dialogDescription}>This is a RevenueCat Test Store transaction. It verifies the purchase flow and can activate a test Pro entitlement. You won’t be charged.</Text>
      <Button testID="test-purchase-confirm-button" title="Continue with test purchase" onPress={() => pendingPackage && void purchase(pendingPackage)} disabled={busy || !billing.identityReady} />
      <Button testID="test-purchase-cancel-button" title="Not now" secondary onPress={() => setPendingPackage(null)} />
    </Dialog>
    <Dialog testID="subscription-info-dialog" visible={!!info} title={info === 'terms' ? 'Subscription terms' : info === 'privacy' ? 'Data & privacy' : 'Manage your subscription'} onClose={() => setInfo(null)}>
      <Text testID="subscription-info-content" style={s.dialogDescription}>{info === 'terms' ? 'This is an early-access build. Test Store transactions are simulated and incur no charges. Pro includes AI guidance and saved inventory-based reports, not automatic endpoint protection or compliance certification. When real subscriptions open, your store will show the final price, billing period and renewal terms. Subscriptions renew until canceled in the Apple App Store or Google Play. Cancellation stops future renewals; access continues through the paid period. Restoring purchases checks the active account’s store entitlement.' : info === 'privacy' ? 'ZeroTrust AI stores your name, email, session records, devices, incidents, reports and conversation history. Passwords are hashed; mobile session tokens use device secure storage. The preview uses an HttpOnly cookie. When you ask the AI assistant, your question, recent conversation and workspace posture summary are sent to the AI provider. Do not include secrets or classified information. RevenueCat receives your app account ID and purchase information, not your password. Google sign-in is optional. Full operator policies and contact details must be finalized before live sales.' : simulated ? 'This subscription belongs to the RevenueCat Test Store. No real payment or store renewal has been created. Test subscriptions are managed in the RevenueCat project, not the Apple App Store or Google Play.' : 'Manage or cancel your subscription in the store where you purchased it: Apple ID → Subscriptions, or Google Play → Payments & subscriptions. Restoring purchases does not cancel a subscription.'}</Text>
      <Button testID="subscription-info-done-button" title="Got it" secondary onPress={() => setInfo(null)} />
    </Dialog>
  </Screen>;
}
function Benefit({ icon, title, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string }) {
  const s = useStyles(); const { colors } = useTheme();
  return <View style={s.benefit}><Ionicons name={icon} size={21} color={colors.brand} /><View style={s.benefitCopy}><Text style={s.benefitTitle}>{title}</Text><Text style={s.benefitText}>{text}</Text></View><Ionicons name="checkmark" size={17} color={colors.onSurfaceSecondary} /></View>;
}
const useStyles = makeStyles(c => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginBottom: 20 }, iconButton: { width: 44, minHeight: 44, justifyContent: 'center' }, headerTitle: { color: c.muted, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 2 }, proBadge: { backgroundColor: c.brandWash, borderColor: c.brandTertiary, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 2 }, proText: { color: c.brand, fontFamily: fonts.display, fontSize: 14, letterSpacing: 1 },
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 24 }, heroIcon: { height: 64, width: 64, backgroundColor: c.brandWash, borderColor: c.brandTertiary, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 22, borderRadius: 4 }, eyebrow: { fontFamily: fonts.medium, color: c.brand, fontSize: 10, letterSpacing: 2 }, title: { fontFamily: fonts.display, color: c.onSurface, fontSize: 38, lineHeight: 40, textAlign: 'center', marginTop: 12 }, subtitle: { fontFamily: fonts.body, color: c.muted, fontSize: 13, marginTop: 12 },
  features: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border, paddingVertical: 8 }, benefit: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 13 }, benefitCopy: { flex: 1 }, benefitTitle: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface }, benefitText: { fontFamily: fonts.body, fontSize: 11, color: c.muted, marginTop: 4, lineHeight: 18 }, availability: { fontSize: 10, fontFamily: fonts.body, color: c.muted, marginTop: 9, marginBottom: 4 },
  plans: { marginTop: 18 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, sectionTitle: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.4, color: c.muted }, sectionHint: { fontFamily: fonts.body, fontSize: 10, color: c.muted }, loader: { marginBottom: 16 }, buy: { marginTop: 6 }, disclosure: { fontFamily: fonts.body, color: c.muted, fontSize: 10, lineHeight: 17, textAlign: 'center', marginTop: 12 },
  restore: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, restoreText: { fontFamily: fonts.medium, color: c.onSurfaceTertiary, fontSize: 12 }, bottomLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, linkText: { fontSize: 10, fontFamily: fonts.body, color: c.muted }, powered: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }, poweredText: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.2, color: c.muted },
  activeCard: { marginTop: 20, borderWidth: 1, borderColor: c.borderStrong, padding: 20, backgroundColor: c.surfaceSecondary, gap: 18, borderRadius: 4 }, activeHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, activeTitle: { fontFamily: fonts.medium, fontSize: 16, color: c.onSurface }, activeDetail: { color: c.muted, fontFamily: fonts.body, fontSize: 13 }, dialogText: { fontFamily: fonts.bold, fontSize: 16, color: c.onSurface }, dialogDescription: { fontFamily: fonts.body, fontSize: 13, lineHeight: 22, color: c.onSurfaceTertiary },
}));