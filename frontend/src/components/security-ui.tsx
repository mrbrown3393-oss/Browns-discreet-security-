import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Href, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, makeStyles, useTheme } from '../theme';
import { Button, Notice, Screen } from './ui';
import { useSubscription } from '../billing/context';

const tabs: { name: string; route: Href; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { name: 'Overview', route: '/', icon: 'grid-outline' }, { name: 'Devices', route: '/devices', icon: 'laptop-outline' },
  { name: 'Alerts', route: '/alerts', icon: 'pulse-outline' }, { name: 'Assistant', route: '/assistant', icon: 'sparkles-outline' }, { name: 'Reports', route: '/reports', icon: 'document-text-outline' },
];
export function AppShell({ children, active, testID, footer, scrollRef, onContentSizeChange }: { children: React.ReactNode; active: string; testID: string; footer?: React.ReactNode; scrollRef?: React.RefObject<ScrollView | null>; onContentSizeChange?: () => void }) {
  const s = useStyles(); const { colors } = useTheme(); const insets = useSafeAreaInsets();
  return <KeyboardAvoidingView behavior="padding" style={s.fill}><Screen testID={testID} scrollRef={scrollRef} onContentSizeChange={onContentSizeChange}>{children}</Screen>{footer}<View style={[s.nav, { paddingBottom: Math.max(8, insets.bottom) }]}>
    {tabs.map(tab => <Pressable key={tab.name} testID={`nav-${tab.name.toLowerCase()}`} accessibilityRole="tab" accessibilityState={{ selected: active === tab.name }} onPress={() => { if (active !== tab.name) router.replace(tab.route); }} style={s.navItem}>
      <Ionicons name={tab.icon} color={active === tab.name ? colors.brand : colors.muted} size={21} /><Text style={[s.navText, active === tab.name && { color: colors.brand }]}>{tab.name}</Text>
    </Pressable>)}
  </View></KeyboardAvoidingView>;
}
export function Heading({ title, eyebrow, action }: { title: string; eyebrow: string; action?: React.ReactNode }) {
  const s = useStyles(); return <View style={s.heading}><View style={s.grow}><Text style={s.eyebrow}>{eyebrow}</Text><Text testID={`${eyebrow.toLowerCase().replace(/[^a-z]/g, '-')}-heading`} style={s.title}>{title}</Text></View>{action}</View>;
}
export function Field({ label, testID, value, onChange, multiline = false }: { label: string; testID: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const s = useStyles(); const { colors } = useTheme(); return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput testID={testID} accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multiline} maxLength={multiline ? 2000 : 100} placeholderTextColor={colors.muted} style={[s.input, multiline && s.multiline]} /></View>;
}
export function Choices({ values, value, onChange, testID }: { values: string[]; value: string; onChange: (v: string) => void; testID: string }) {
  const s = useStyles(); return <View style={s.choices}>{values.map(item => <Pressable key={item} testID={`${testID}-${item.toLowerCase()}`} accessibilityRole="radio" accessibilityState={{ selected: item === value }} onPress={() => onChange(item)} style={[s.choice, item === value && s.selected]}><Text style={[s.choiceText, item === value && s.selectedText]}>{item}</Text></Pressable>)}</View>;
}
export function Loading({ text = 'Loading workspace…' }: { text?: string }) {
  const s = useStyles(); const { colors } = useTheme(); return <View testID="security-loading" style={s.empty}><ActivityIndicator color={colors.brand} /><Text style={s.body}>{text}</Text></View>;
}
export function Empty({ title, text }: { title: string; text: string }) {
  const s = useStyles(); return <View testID="security-empty-state" style={s.empty}><Text style={s.emptyTitle}>{title}</Text><Text style={s.body}>{text}</Text></View>;
}
export function QueryError({ error, retry }: { error: Error; retry: () => void }) {
  return <><Notice testID="security-query-error" text={error.message} error /><Button testID="security-query-retry" title="Try again" secondary onPress={retry} /></>;
}
export function PremiumGate({ children }: { children: React.ReactNode }) {
  const billing = useSubscription();
  if (!billing.identityReady && !billing.identityError) return <Loading text="Verifying your Pro membership…" />;
  if (billing.identityError || billing.loadError) return <><Notice testID="premium-identity-error" error text={billing.identityError || billing.loadError!.message} /><Button testID="premium-retry-button" title="Reconnect membership" secondary onPress={billing.retryIdentity} /></>;
  if (!billing.isSubscribed) return <><Empty title="A clearer view, with Pro." text="Your Pro subscription includes the GPT-5.4 security assistant and saved advanced audit reports." /><Button testID="premium-explore-button" title="Explore Pro plans" onPress={() => router.push('/subscription')} /></>;
  return <>{children}</>;
}
const useStyles = makeStyles(c => ({
  fill: { flex: 1, backgroundColor: c.surface }, grow: { flex: 1 }, nav: { flexDirection: 'row', backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderColor: c.border, paddingTop: 10, paddingHorizontal: 8 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, gap: 5 }, navText: { color: c.muted, fontFamily: fonts.medium, fontSize: 9 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 24 }, eyebrow: { fontFamily: fonts.medium, color: c.brand, fontSize: 9, letterSpacing: 1.8 }, title: { color: c.onSurface, fontFamily: fonts.display, fontSize: 32, marginTop: 6 },
  field: { gap: 8, marginBottom: 16 }, label: { fontFamily: fonts.medium, color: c.muted, fontSize: 11 }, input: { color: c.onSurface, fontFamily: fonts.body, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 4, minHeight: 48, padding: 12, fontSize: 15 }, multiline: { minHeight: 96, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, choice: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 4 }, selected: { backgroundColor: c.brandWash, borderColor: c.brand }, choiceText: { color: c.muted, fontFamily: fonts.medium, fontSize: 12 }, selectedText: { color: c.brand },
  empty: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 40, gap: 14 }, emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface, textAlign: 'center' }, body: { fontFamily: fonts.body, color: c.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
}));