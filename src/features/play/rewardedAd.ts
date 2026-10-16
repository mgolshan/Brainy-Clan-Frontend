import { ADMOB_REWARDED_UNIT_ID, adsSupported } from '@/config/monetization';
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
 * Only non-personalized ads (`requestNonPersonalizedAdsOnly`, no tracking / ATT prompt), rated
 * G for a family app. Whether a member may see an ad at all is decided by the server
 * (`policy.second_chance.ad_allowed`, `session.second_chance.ad_available`); this only shows one.
 */

type AdsModule = typeof import('react-native-google-mobile-ads');

const LOAD_TIMEOUT_MS = 20_000;

let ready: Promise<AdsModule> | null = null;

function loadSdk(): Promise<AdsModule> {
  ready ??= import('react-native-google-mobile-ads')
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

function adErrorFrom(error: unknown): AdError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : undefined;
  return new AdError(code.includes('no-fill') ? 'noFill' : 'failed', message);
}

async function show({ userId, customData, onShowing }: RewardedAdRequest) {
  const unitId = ADMOB_REWARDED_UNIT_ID;
  if (!unitId) throw new AdError('failed');
  const { RewardedAd, RewardedAdEventType, AdEventType } = await loadSdk();

  const ad = RewardedAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
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

export const rewardedAds: RewardedAds = {
  available: adsSupported,
  show,
};
