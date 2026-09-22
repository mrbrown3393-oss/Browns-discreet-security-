import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Button, Notice, Screen } from '../src/components/ui';
import { fonts, makeStyles, useTheme } from '../src/theme';
import { useAuth } from '../src/auth/context';

export default function Login() {
  const s = useStyles(); const { colors } = useTheme(); const auth = useAuth();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [visible, setVisible] = useState(false); const [validation, setValidation] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: Platform.OS !== 'web' }).start(); }, [opacity]);
  function submit() {
    setValidation('');
    if (!email.trim() || !password || (register && !name.trim())) { setValidation('Please complete all fields.'); return; }
    if (password.length < 10) { setValidation('Use a password with at least 10 characters.'); return; }
    auth.signIn({ email: email.trim(), password, ...(register ? { name: name.trim() } : {}) }, register);
  }
  return <KeyboardAvoidingView behavior="padding" style={s.fill}><Screen testID="login-screen">
    <View style={s.header}><Brand /><Text style={s.version}>EARLY ACCESS / 01</Text></View>
    <Animated.View style={{ opacity }}>
      <View style={s.emblem}><Ionicons name="finger-print-outline" size={64} color={colors.brand} /><View style={s.corner} /></View>
      <Text testID="login-heading" style={s.title}>TRUST NOTHING.{'\n'}VERIFY EVERYTHING.</Text>
      <Text style={s.subtitle}>Your security starts with your identity.{'\n'}Sign in to your ZeroTrust AI workspace.</Text>
      <View style={s.tabs}>
        <Pressable testID="login-mode-sign-in" disabled={auth.busy} onPress={() => { setRegister(false); setValidation(''); auth.clearError(); }} style={[s.tab, !register && s.selectedTab]}><Text style={[s.tabText, !register && s.activeText]}>Sign in</Text></Pressable>
        <Pressable testID="login-mode-create-account" disabled={auth.busy} onPress={() => { setRegister(true); setValidation(''); auth.clearError(); }} style={[s.tab, register && s.selectedTab]}><Text style={[s.tabText, register && s.activeText]}>Create account</Text></Pressable>
      </View>
      {register && <><Text style={s.label}>FULL NAME</Text><TextInput testID="register-name-input" accessibilityLabel="Full name" value={name} onChangeText={setName} style={s.input} placeholder="Your name" placeholderTextColor={colors.muted} autoComplete="name" maxLength={80} editable={!auth.busy} /></>}
      <Text style={s.label}>EMAIL ADDRESS</Text><TextInput testID="login-email-input" accessibilityLabel="Email address" value={email} onChangeText={setEmail} style={s.input} placeholder="you@organization.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!auth.busy} />
      <Text style={s.label}>PASSWORD</Text><View style={s.passwordRow}><TextInput testID="login-password-input" accessibilityLabel="Password" value={password} onChangeText={setPassword} style={[s.input, s.passwordInput]} placeholder={register ? 'At least 10 characters' : 'Enter your password'} placeholderTextColor={colors.muted} secureTextEntry={!visible} autoComplete={register ? 'new-password' : 'current-password'} editable={!auth.busy} onSubmitEditing={submit} />
        <Pressable testID="login-toggle-password" accessibilityLabel={visible ? 'Hide password' : 'Show password'} accessibilityRole="button" onPress={() => setVisible(!visible)} style={s.eye}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} /></Pressable></View>
      {!!(validation || auth.error) && <Notice testID="login-error-message" text={validation || auth.error!} error />}
      <View style={s.submit}><Button testID="login-submit-button" title={register ? 'Create your account' : 'Enter workspace'} onPress={submit} loading={auth.busy} /></View>
      <View style={s.or}><View style={s.line} /><Text style={s.orText}>OR CONTINUE WITH</Text><View style={s.line} /></View>
      <Pressable testID="google-sign-in-button" accessibilityRole="button" onPress={auth.google} disabled={auth.busy} style={({ pressed }) => [s.google, pressed && { opacity: 0.7 }]}><Ionicons name="logo-google" size={19} color={colors.onSurface} /><Text style={s.googleText}>Google</Text></Pressable>
      <View style={s.footer}><Ionicons name="lock-closed-outline" color={colors.muted} size={13} /><Text style={s.footerText}>One identity. Your workspace. Your subscription.</Text></View>
    </Animated.View>
  </Screen></KeyboardAvoidingView>;
}
const useStyles = makeStyles(c => ({
  fill: { flex: 1 }, header: { paddingTop: 24, paddingBottom: 32, gap: 6 }, version: { marginLeft: 34, fontSize: 9, fontFamily: fonts.medium, letterSpacing: 2, color: c.muted },
  emblem: { width: 94, height: 94, backgroundColor: c.brandWash, borderWidth: 1, borderColor: c.brandTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, corner: { position: 'absolute', bottom: -1, right: -1, width: 16, height: 16, borderBottomWidth: 3, borderRightWidth: 3, borderColor: c.brand },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 36, letterSpacing: 0.3, color: c.onSurface }, subtitle: { color: c.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginTop: 12 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: c.border, marginTop: 24, marginBottom: 20 }, tab: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: c.surface }, selectedTab: { borderBottomColor: c.brand }, tabText: { color: c.muted, fontFamily: fonts.medium, fontSize: 14 }, activeText: { color: c.onSurface },
  label: { fontFamily: fonts.medium, color: c.muted, fontSize: 10, letterSpacing: 1.5, marginBottom: 9 },
  input: { minHeight: 52, color: c.onSurface, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 4, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 15, marginBottom: 18 },
  passwordRow: { position: 'relative' }, passwordInput: { paddingRight: 52, marginBottom: 0 }, eye: { position: 'absolute', right: 0, width: 50, height: 52, alignItems: 'center', justifyContent: 'center' },
  submit: { marginTop: 20 }, or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }, line: { flex: 1, height: 1, backgroundColor: c.border }, orText: { fontFamily: fonts.medium, color: c.muted, fontSize: 9, letterSpacing: 1 },
  google: { flexDirection: 'row', gap: 12, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderStrong, borderRadius: 4 }, googleText: { color: c.onSurface, fontFamily: fonts.medium, fontSize: 15 },
  footer: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, footerText: { fontFamily: fonts.body, fontSize: 10, color: c.muted },
}));