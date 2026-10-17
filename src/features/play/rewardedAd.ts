import { ADMOB_REWARDED_UNIT_ID, adsSupported } from '@/config/monetization';
import type { AdRequestPolicy } from '@/api/types';
import { consentDebugOptions, createAdConsent, noAdConsent } from '@/features/play/adConsent';
import {
  AdError,
  type RewardedAdOutcome,
  type RewardedAdRequest,
  type RewardedAds,
} from '@/features/play/rewardedAdTypes';

/**
 * AdMob rewarded ads on iOS/Android (`rewardedAd.web.ts` is the web stub). The SDK is imported
 * lazily and only when `adsSupported` (native build with an ad unit, never Expo Go, where the
 * native module is missing and importing it would throw).
 *
 * How ads are requested comes from the member policy (`policy.ad_request`:
 * `requestNonPersonalizedAdsOnly`, `tagForUnderAgeOfConsent`, `maxAdContentRating`); without it
 * the safe defaults are non-personalized and rated G (no tracking / ATT prompt). Whether a member may see an ad at all is decided by the server
 * (`policy.second_chance.ad_allowed`, `session.second_chance.ad_available`); this only shows one.
 *
 * Google UMP consent (`adConsent.ts`) is gathered right before the first ad of the session, before
 * the SDK is initialized; when UMP says ads can't be requested, `show` fails with `noFill`.
 */

type AdsModule = typeof import('react-native-google-mobile-ads');

const LOAD_TIMEOUT_MS = 20_000;

function adErrorFrom(error: unknown): AdError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : undefined;
  return new AdError(code.includes('no-fill') ? 'noFill' : 'failed', message);
}

function contentRating(
  mod: AdsModule,
  rating: AdRequestPolicy['max_ad_content_rating'] | undefined,
) {
  const { MaxAdContentRating } = mod;
  switch (rating) {
    case 'PG':
      return MaxAdContentRating.PG;
    case 'T':
      return MaxAdContentRating.T;
    case 'MA':
      return MaxAdContentRating.MA;
    default:
      // 'G', absent or unknown: the safest rating.
      return MaxAdContentRating.G;
  }
}

async function showAd(
  mod: AdsModule,
  unitId: string,
  { userId, customData, adRequest, onShowing }: RewardedAdRequest,
) {
  const { RewardedAd, RewardedAdEventType, AdEventType } = mod;

  try {
    // Global request configuration, re-applied per ad: the signed-in member may have changed.
    await mod.default().setRequestConfiguration({
      maxAdContentRating: contentRating(mod, adRequest?.max_ad_content_rating),
      // Left unspecified without a policy (the client never decides age rules).
      ...(adRequest ? { tagForUnderAgeOfConsent: adRequest.under_age_of_consent } : {}),
    });
  } catch (error) {
    throw adErrorFrom(error);
  }

  const ad = RewardedAd.createForAdRequest(unitId, {
    // Default true: personalized ads only when the policy explicitly allows them.
    requestNonPersonalizedAdsOnly: adRequest?.non_personalized ?? true,
    serverSideVerificationOptions: { userId, customData },
  });

  return new Promise<RewardedAdOutcome>((resolve, reject) => {
    let earned = false;
    let settled = false;
    const unsubscribes: (() => void)[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribes.forEach((off) => off());
      ad.destroy();
      fn();
    };
    timer = setTimeout(
      () => finish(() => reject(new AdError('noFill', 'load timeout'))),
      LOAD_TIMEOUT_MS,
    );

    unsubscribes.push(
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        clearTimeout(timer);
        onShowing?.();
        ad.show().catch((error: unknown) => finish(() => reject(adErrorFrom(error))));
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        finish(() => resolve(earned ? 'earned' : 'dismissed'));
      }),
      ad.addAdEventListener(AdEventType.ERROR, (error) => {
        finish(() => reject(adErrorFrom(error)));
      }),
    );
    ad.load();
  });
}

/**
 * Rewarded ads backed by `importSdk` (the lazily imported react-native-google-mobile-ads module;
 * injectable so tests can pass a mock).
 */
export function createRewardedAds(importSdk: () => Promise<AdsModule>): RewardedAds {
  let ready: Promise<AdsModule> | null = null;

  const consent = createAdConsent(
    () => importSdk().then((mod) => mod.AdsConsent),
    consentDebugOptions(
      process.env.EXPO_PUBLIC_ADMOB_CONSENT_DEBUG_GEOGRAPHY,
      process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS,
      __DEV__,
    ),
  );

  function loadSdk(): Promise<AdsModule> {
    ready ??= importSdk()
      .then(async (mod) => {
        const ads = mod.default();
        await ads.setRequestConfiguration({ maxAdContentRating: mod.MaxAdContentRating.G });
        await ads.initialize();
        return mod;
      })
      .catch((error: unknown) => {
        ready = null;
        throw new AdError('failed', error instanceof Error ? error.message : undefined);
      });
    return ready;
  }

  return {
    available: adsSupported,
    async show(request) {
      const unitId = ADMOB_REWARDED_UNIT_ID;
      if (!unitId) throw new AdError('failed');
      // Consent first (Google's message may appear here), then initialize and request the ad.
      if (!(await consent.canRequestAds(request.adRequest?.under_age_of_consent))) {
        throw new AdError('noFill', 'consent: ads cannot be requested');
      }
      return showAd(await loadSdk(), unitId, request);
    },
    // Never touch the native module where ads can't run (Expo Go, no ad unit).
    consent: adsSupported ? consent : noAdConsent,
  };
}

export const rewardedAds: RewardedAds = createRewardedAds(
  () => import('react-native-google-mobile-ads'),
);
