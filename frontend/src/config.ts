import Constants from 'expo-constants';

// Native uses Expo config. Metro's statically inlined public variables cover
// web previews where Expo SDK 57 does not expose dynamic config extras.
const extra = Constants.expoConfig?.extra;
export const appConfig = {
  backendUrl: extra?.backendUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL,
  revenueCat: {
    testApiKey: extra?.revenueCat?.testApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
    iosApiKey: extra?.revenueCat?.iosApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    androidApiKey: extra?.revenueCat?.androidApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    entitlement: extra?.revenueCat?.entitlement ?? 'pro',
    offering: extra?.revenueCat?.offering ?? 'default',
    liveSalesEnabled: extra?.revenueCat?.liveSalesEnabled ?? process.env.EXPO_PUBLIC_ENABLE_LIVE_SUBSCRIPTIONS === 'true',
  },
};