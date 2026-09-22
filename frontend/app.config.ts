import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ZeroTrust AI',
  slug: config.slug ?? 'frontend',
  userInterfaceStyle: 'dark',
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
    revenueCat: {
      testApiKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
      iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      entitlement: 'pro',
      offering: 'default',
      liveSalesEnabled: process.env.EXPO_PUBLIC_ENABLE_LIVE_SUBSCRIPTIONS === 'true',
    },
  },
});