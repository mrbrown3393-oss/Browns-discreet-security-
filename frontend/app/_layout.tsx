import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Rajdhani_600SemiBold } from '@expo-google-fonts/rajdhani';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { ErrorBoundary } from '@/src/components/error-boundary';
import { queryClient } from '@/src/query-client';
import { AuthProvider, useAuth } from '@/src/auth/context';
import { initializeRevenueCat } from '@/src/billing/client';
import { SubscriptionProvider } from '@/src/billing/context';
import { colors } from '@/src/theme';

// Once per launch, before any component mounts. Errors are also exposed in the paywall UI.
try { initializeRevenueCat(); } catch (error) { console.warn('Subscriptions unavailable:', error); }

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <View testID="session-loading" style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center' }}><ActivityIndicator color={colors.brand} /></View>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
    <Stack.Protected guard={!user}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={!!user}><Stack.Screen name="index" /><Stack.Screen name="subscription" /><Stack.Screen name="feature" /><Stack.Screen name="devices" /><Stack.Screen name="alerts" /><Stack.Screen name="assistant" /><Stack.Screen name="reports" /><Stack.Screen name="support" /></Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  const [loaded, fontError] = useFonts({ Rajdhani_600SemiBold, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  if (!loaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  return <ErrorBoundary><QueryClientProvider client={queryClient}><KeyboardProvider><AuthProvider><SubscriptionProvider>
    <StatusBar style="light" /><AuthGate />
  </SubscriptionProvider></AuthProvider></KeyboardProvider></QueryClientProvider></ErrorBoundary>;
}