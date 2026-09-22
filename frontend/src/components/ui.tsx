import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { fonts, makeStyles, useTheme } from '../theme';

export function Screen({ children, testID, scrollRef, onContentSizeChange }: { children: React.ReactNode; testID: string; scrollRef?: React.RefObject<ScrollView | null>; onContentSizeChange?: () => void }) {
  const s = useStyles(); const insets = useSafeAreaInsets();
  return <View testID={testID} style={[s.screen, { paddingTop: insets.top }]}>
    <ScrollView ref={scrollRef} onContentSizeChange={onContentSizeChange} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>{children}</ScrollView>
  </View>;
}
export function Button({ title, onPress, testID, secondary, disabled, loading }: {
  title: string; onPress: () => void; testID: string; secondary?: boolean; disabled?: boolean; loading?: boolean;
}) {
  const s = useStyles(); const { colors } = useTheme();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title}
    accessibilityState={{ disabled: !!disabled || !!loading }} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || loading) && s.disabled, pressed && s.pressed]}>
    {loading ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={s.buttonText}>{title}</Text>}
  </Pressable>;
}
export function Notice({ text, testID, error = false }: { text: string; testID: string; error?: boolean }) {
  const s = useStyles(); const { colors } = useTheme();
  return <View testID={testID} accessibilityLiveRegion="polite" style={[s.notice, error && s.errorNotice]}>
    <Ionicons name={error ? 'alert-circle-outline' : 'information-circle-outline'} size={18} color={error ? colors.error : colors.warning} />
    <Text style={s.noticeText}>{text}</Text>
  </View>;
}
export function Brand() {
  const s = useStyles(); const { colors } = useTheme();
  return <View style={s.brand}><Ionicons name="shield-checkmark" size={24} color={colors.brand} /><Text testID="app-brand-name" style={s.brandText}>ZEROTRUST<Text style={s.brandAccent}> / AI</Text></Text></View>;
}
export function Dialog({ visible, title, children, onClose, testID }: {
  visible: boolean; title: string; children: React.ReactNode; onClose: () => void; testID: string;
}) {
  const s = useStyles(); const { colors } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior="padding" style={s.overlay}><View testID={testID} accessibilityViewIsModal style={s.dialog}>
      <View style={s.dialogHeader}><Text testID={`${testID}-title`} style={s.dialogTitle}>{title}</Text>
        <Pressable testID={`${testID}-close`} accessibilityRole="button" accessibilityLabel="Close dialog" onPress={onClose} style={s.iconButton}><Ionicons name="close" size={24} color={colors.onSurface} /></Pressable>
      </View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.dialogBody}>{children}</ScrollView>
    </View></KeyboardAvoidingView>
  </Modal>;
}
const useStyles = makeStyles(c => ({
  screen: { flex: 1, backgroundColor: c.surface }, content: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 24 },
  button: { minHeight: 54, backgroundColor: c.brandPrimary, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 4 },
  secondary: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong },
  buttonText: { color: c.onBrandPrimary, fontFamily: fonts.bold, fontSize: 15 }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: c.surfaceSecondary, borderLeftWidth: 2, borderLeftColor: c.warning, marginVertical: 10 },
  errorNotice: { borderLeftColor: c.error }, noticeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: c.onSurfaceTertiary },
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center' }, brandText: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: c.onSurface }, brandAccent: { color: c.brand },
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { backgroundColor: c.surfaceSecondary, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 8, padding: 20, gap: 16, width: '100%', maxWidth: 450, maxHeight: '90%' },
  dialogBody: { gap: 16 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center' }, dialogTitle: { flex: 1, fontFamily: fonts.display, fontSize: 25, color: c.onSurface }, iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
}));