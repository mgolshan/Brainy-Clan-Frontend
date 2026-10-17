import type { AdRequestPolicy } from '@/api/types';
import type { AdConsent } from '@/features/play/adConsent';

/** Shared shapes for the AdMob wrapper (`rewardedAd.ts` native, `rewardedAd.web.ts` stub). */

export type AdErrorKind = 'noFill' | 'failed';

/** The rewarded ad couldn't be loaded or shown (`play.ad.<kind>`). */
export class AdError extends Error {
  constructor(
    readonly kind: AdErrorKind,
    message?: string,
  ) {
    super(message ?? kind);
    this.name = 'AdError';
  }
}

export interface RewardedAdRequest {
  /** AdMob SSV `user_id`: the member id (contract). */
  userId: string;
  /** AdMob SSV `custom_data`: `"<reward_ref>:<session_id>"` (contract). */
  customData: string;
  /**
   * How to request the ad: the member's `policy.ad_request` (server decides). Absent on older
   * backends → safe defaults (non-personalized, rating G, no under-age tag).
   */
  adRequest?: AdRequestPolicy;
  /** Called when the ad is loaded and about to be shown. */
  onShowing?: () => void;
}

/** `earned`: the user watched long enough for the reward; `dismissed`: closed before that. */
export type RewardedAdOutcome = 'earned' | 'dismissed';

export interface RewardedAds {
  /** Rewarded ads can be shown in this build (native build with an ad unit, not Expo Go). */
  readonly available: boolean;
  /** Loads and shows one non-personalized rewarded ad; resolves once it is closed. */
  show(request: RewardedAdRequest): Promise<RewardedAdOutcome>;
  /** Google UMP consent: gathered by `show`, privacy options for Profile → Privacy. */
  readonly consent: AdConsent;
}
