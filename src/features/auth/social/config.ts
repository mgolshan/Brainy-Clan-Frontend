import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { SocialProvider } from '@/api/types';

/**
 * Social sign-in configuration from `EXPO_PUBLIC_*` variables (see `.env.example` and the README
 * setup guide). A provider without its client ID is simply not offered.
 * Read as `process.env.EXPO_PUBLIC_X` (no destructuring) so Expo inlines them.
 */
export const socialConfig = {
  /** Google "Web application" OAuth client: web sign-in and the ID-token audience on Android. */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '',
  /** Google "iOS" OAuth client (its reversed form is the iOS URL scheme, see app.config.ts). */
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '',
  /** Meta app ID (Facebook Login). */
  facebookAppId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim() ?? '',
} as const;

/** Display names are brand names: never translated. */
export const PROVIDER_NAMES: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
};

/** Running inside Expo Go: native sign-in modules and custom URL schemes are unavailable. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Dev-only fake provider: `EXPO_PUBLIC_SOCIAL_FAKE=1` makes both buttons return a fake token
 * (`dev-fake-<provider>-token`) so the flow after the provider (API call, birth step, errors,
 * linking) can be exercised against a mock without real client IDs. `__DEV__` is `false` in
 * production bundles, so this whole path is removed there.
 */
export const fakeSocial = __DEV__ && process.env.EXPO_PUBLIC_SOCIAL_FAKE === '1';

/** Whether the real provider can run on this platform with the current configuration. */
export function providerConfigured(provider: SocialProvider): boolean {
  if (provider === 'google') {
    if (!socialConfig.googleWebClientId) return false;
    if (Platform.OS === 'web') return true;
    if (isExpoGo) return false;
    return Platform.OS === 'ios' ? !!socialConfig.googleIosClientId : Platform.OS === 'android';
  }
  if (!socialConfig.facebookAppId) return false;
  // Native receives the redirect on the fb<APP_ID> scheme, which Expo Go doesn't register.
  return Platform.OS === 'web' || !isExpoGo;
}
