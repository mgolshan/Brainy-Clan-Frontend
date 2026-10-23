import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { WEBSITE_LINKS } from '@/config/links';

/**
 * RevenueCat (purchases) and AdMob (rewarded ads) settings, read from `EXPO_PUBLIC_*` env vars
 * (README "RevenueCat setup" / "AdMob setup"). Both are native modules: they only work in an EAS
 * development/production build, never on web or in Expo Go, so the features hide themselves there.
 * Whether a member may buy or watch an ad is still decided by the server policy.
 */

/** Expo Go has none of the native modules this app adds. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const isNativeBuild = Platform.OS !== 'web' && !isExpoGo;

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** RevenueCat public SDK key for this platform (`appl_...` / `goog_...`), or null. */
export const REVENUECAT_API_KEY: string | null =
  Platform.OS === 'ios'
    ? clean(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY)
    : Platform.OS === 'android'
      ? clean(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY)
      : null;

/** The paywall can work in this build (RevenueCat key set, native build). */
export const purchasesSupported = isNativeBuild && REVENUECAT_API_KEY !== null;

/** RevenueCat entitlement that unlocks the Family plan (contract: entitlement id `family`). */
export const FAMILY_ENTITLEMENT = 'family';

/**
 * Google's official sample rewarded ad units (always fill, never pay). Used in development
 * builds when no unit is configured; release builds without a configured unit show no ads.
 */
const TEST_REWARDED_UNIT = {
  ios: 'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-3940256099942544/5224354917',
} as const;

function rewardedUnitId(): string | null {
  if (Platform.OS === 'ios') {
    return (
      clean(process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS) ?? (__DEV__ ? TEST_REWARDED_UNIT.ios : null)
    );
  }
  if (Platform.OS === 'android') {
    return (
      clean(process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID) ??
      (__DEV__ ? TEST_REWARDED_UNIT.android : null)
    );
  }
  return null;
}

/** AdMob rewarded ad unit for this platform, or null (no ads in this build). */
export const ADMOB_REWARDED_UNIT_ID: string | null = isNativeBuild ? rewardedUnitId() : null;

/** Rewarded ads can be shown in this build. */
export const adsSupported = ADMOB_REWARDED_UNIT_ID !== null;

/**
 * Fallback paywall legal links when the backend serves no `GET /legal`: the env values, else the
 * website pages (`https://brainyclan.com/terms`, `/privacy`).
 */
export const TERMS_URL: string = clean(process.env.EXPO_PUBLIC_TERMS_URL) ?? WEBSITE_LINKS.terms;
export const PRIVACY_URL: string =
  clean(process.env.EXPO_PUBLIC_PRIVACY_URL) ?? WEBSITE_LINKS.privacy;
