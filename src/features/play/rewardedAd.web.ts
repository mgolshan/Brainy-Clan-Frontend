import { noAdConsent } from '@/features/play/adConsent';
import { AdError, type RewardedAds } from '@/features/play/rewardedAdTypes';

/** Web: AdMob is mobile-only, so the "Watch a short video" option is hidden. */
export const rewardedAds: RewardedAds = {
  available: false,
  show: () => Promise.reject(new AdError('failed')),
  consent: noAdConsent,
};
