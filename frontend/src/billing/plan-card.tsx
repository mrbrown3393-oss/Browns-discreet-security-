import { Pressable, Text, View } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { fonts, makeStyles, useTheme } from '../theme';

export function periodLabel(period: string | null) {
  if (period === 'P1M') return 'month';
  if (period === 'P1Y') return 'year';
  if (period === 'P1W') return 'week';
  return period ?? 'billing period';
}
export function packageTestId(pkg: PurchasesPackage) { return `plan-${pkg.identifier.replace(/[^a-z0-9]/gi, '')}`; }
export function PlanCard({ pkg, selected, onPress, disabled, savings }: { pkg: PurchasesPackage; selected: boolean; onPress: () => void; disabled: boolean; savings?: number }) {
  const s = useStyles(); const { colors } = useTheme();
  const period = periodLabel(pkg.product.subscriptionPeriod);
  return <Pressable testID={packageTestId(pkg)} accessibilityRole="radio" accessibilityState={{ selected, disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [s.card, selected && s.selected, pressed && { opacity: 0.8 }]}>
    <View style={[s.radio, selected && s.radioSelected]}>{selected && <View style={s.radioDot} />}</View>
    <View style={s.copy}><View style={s.titleRow}><Text testID={`${packageTestId(pkg)}-title`} style={s.title}>{pkg.product.title}</Text>{!!savings && savings > 0 && <Text testID={`${packageTestId(pkg)}-savings`} style={s.savings}>SAVE {savings}%</Text>}</View>
      <Text testID={`${packageTestId(pkg)}-period`} style={s.period}>Billed every {period}</Text>
    </View>
    <View style={s.priceColumn}><Text testID={`${packageTestId(pkg)}-price`} style={s.price}>{pkg.product.priceString}</Text><Text style={s.pricePeriod}>/ {period}</Text></View>
    {selected && <Ionicons name="checkmark" size={14} color={colors.brand} style={s.check} />}
  </Pressable>;
}
const useStyles = makeStyles(c => ({
  card: { minHeight: 94, padding: 16, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }, selected: { borderColor: c.brand, backgroundColor: c.brandWash },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: c.muted, alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: c.brand }, radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand },
  copy: { flex: 1 }, titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }, title: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface }, savings: { fontSize: 8, letterSpacing: 0.5, fontFamily: fonts.bold, color: c.brand }, period: { fontFamily: fonts.body, fontSize: 11, color: c.muted, marginTop: 6 },
  priceColumn: { alignItems: 'flex-end' }, price: { fontFamily: fonts.display, fontSize: 27, color: c.onSurface }, pricePeriod: { color: c.muted, fontFamily: fonts.body, fontSize: 10 }, check: { position: 'absolute', top: 5, right: 5 },
}));