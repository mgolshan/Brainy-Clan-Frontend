/**
 * Google UMP ad consent (AdMob "Privacy & messaging") around the rewarded ad, independent of the
 * native module so it can be unit-tested: `rewardedAd.ts` passes the `AdsConsent` API of
 * react-native-google-mobile-ads, the web stub uses `noAdConsent`.
 *
 * - Consent is gathered lazily, right before the first rewarded ad of the session (never at app
 *   start, so devices only children use never see a consent message). Whether a member may see an
 *   ad at all is still the server's decision; this only runs once the ad option was tapped.
 * - The result is cached for the session (per `tagForUnderAgeOfConsent` value). A failure
 *   (network, form error) is not cached, so the next ad tries again.
 * - `canRequestAds === false` → no ad is requested; the caller shows "no video available".
 * - The privacy options entry point ("Privacy choices for ads") is only offered when UMP says it
 *   is required (`privacyOptionsRequirementStatus === 'REQUIRED'`, e.g. GDPR regions).
 */

/** The subset of `AdsConsentInfo` used here (its enums are string enums). */
export interface ConsentInfoLike {
  canRequestAds: boolean;
  privacyOptionsRequirementStatus: string;
}

/** `AdsConsentInfoOptions` (debug geography values are `AdsConsentDebugGeography` numbers). */
export interface ConsentRequestOptions {
  tagForUnderAgeOfConsent?: boolean;
  debugGeography?: number;
  testDeviceIdentifiers?: string[];
}

/** The subset of the `AdsConsent` API used here. */
export interface ConsentApiLike {
  requestInfoUpdate(options?: ConsentRequestOptions): Promise<ConsentInfoLike>;
  loadAndShowConsentFormIfRequired(): Promise<ConsentInfoLike>;
  getConsentInfo(): Promise<ConsentInfoLike>;
  showPrivacyOptionsForm(): Promise<ConsentInfoLike>;
}

export interface AdConsent {
  /**
   * Gathers consent if needed (may show Google's consent message) and resolves whether ads may be
   * requested. Never rejects. `underAgeOfConsent` is the member's `policy.ad_request` value
   * (undefined = not specified).
   */
  canRequestAds(underAgeOfConsent?: boolean): Promise<boolean>;
  /** Re-reads the stored consent info (no network, no UI) to update `privacyOptionsRequired`. */
  refreshPrivacyOptions(): Promise<void>;
  /** Whether the "Privacy choices for ads" entry must be offered (last known UMP status). */
  privacyOptionsRequired(): boolean;
  /** Opens Google's privacy options form; rejects when it couldn't be shown. */
  showPrivacyOptions(): Promise<void>;
  /** Listens to `privacyOptionsRequired` changes (for `useSyncExternalStore`). */
  subscribe(listener: () => void): () => void;
}

const REQUIRED = 'REQUIRED';

/** `AdsConsentDebugGeography` values (react-native-google-mobile-ads). */
const DEBUG_GEOGRAPHY: Record<string, number> = {
  EEA: 1,
  NOT_EEA: 2,
  REGULATED_US_STATE: 3,
  OTHER: 4,
};

/**
 * Debug options for testing the consent message (README "Rewarded ads — AdMob setup"), only in
 * development builds: `EXPO_PUBLIC_ADMOB_CONSENT_DEBUG_GEOGRAPHY` (`EEA`, `NOT_EEA`,
 * `REGULATED_US_STATE`, `OTHER`) and `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS` (comma-separated hashed
 * device IDs from the UMP log line). UMP only honours them on the listed test devices.
 */
export function consentDebugOptions(
  geography: string | undefined,
  deviceIds: string | undefined,
  dev: boolean,
): ConsentRequestOptions {
  if (!dev) return {};
  const geo = DEBUG_GEOGRAPHY[geography?.trim().toUpperCase() ?? ''];
  const ids = (deviceIds ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return {
    ...(geo !== undefined ? { debugGeography: geo } : {}),
    ...(ids.length > 0 ? { testDeviceIdentifiers: ids } : {}),
  };
}

export function createAdConsent(
  load: () => Promise<ConsentApiLike>,
  baseOptions: ConsentRequestOptions = {},
): AdConsent {
  let cached: { key: string; result: Promise<boolean> } | null = null;
  let privacyRequired = false;
  const listeners = new Set<() => void>();

  const note = (info: ConsentInfoLike) => {
    const required = info.privacyOptionsRequirementStatus === REQUIRED;
    if (required === privacyRequired) return;
    privacyRequired = required;
    listeners.forEach((listener) => listener());
  };

  /** `cache: false` for failures, so the next ad asks again. */
  const gather = async (
    underAge: boolean | undefined,
  ): Promise<{ allowed: boolean; cache: boolean }> => {
    let api: ConsentApiLike;
    try {
      api = await load();
    } catch {
      return { allowed: false, cache: false };
    }
    try {
      await api.requestInfoUpdate({
        ...baseOptions,
        ...(underAge !== undefined ? { tagForUnderAgeOfConsent: underAge } : {}),
      });
      const info = await api.loadAndShowConsentFormIfRequired();
      note(info);
      return { allowed: info.canRequestAds, cache: true };
    } catch {
      // Offline or the form failed: consent from an earlier session may still allow ads.
      try {
        const info = await api.getConsentInfo();
        note(info);
        return { allowed: info.canRequestAds, cache: false };
      } catch {
        return { allowed: false, cache: false };
      }
    }
  };

  return {
    canRequestAds(underAgeOfConsent) {
      const key = String(underAgeOfConsent);
      if (cached?.key === key) return cached.result;
      const entry = {
        key,
        result: gather(underAgeOfConsent).then(({ allowed, cache }) => {
          if (!cache && cached === entry) cached = null;
          return allowed;
        }),
      };
      cached = entry;
      return entry.result;
    },

    async refreshPrivacyOptions() {
      try {
        note(await (await load()).getConsentInfo());
      } catch {
        // Unknown: keep the last known status.
      }
    },

    privacyOptionsRequired: () => privacyRequired,

    async showPrivacyOptions() {
      const info = await (await load()).showPrivacyOptionsForm();
      note(info);
      // The member may have changed their choices: the next ad uses the new answer.
      if (cached) cached = { key: cached.key, result: Promise.resolve(info.canRequestAds) };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Web / builds without ads: no consent message, no privacy options entry. */
export const noAdConsent: AdConsent = {
  canRequestAds: () => Promise.resolve(false),
  refreshPrivacyOptions: () => Promise.resolve(),
  privacyOptionsRequired: () => false,
  showPrivacyOptions: () => Promise.reject(new Error('ads unavailable')),
  subscribe: () => () => undefined,
};
