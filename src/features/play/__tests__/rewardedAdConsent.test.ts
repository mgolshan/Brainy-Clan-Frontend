/**
 * The rewarded ad gates on Google UMP consent before initializing the SDK or requesting an ad.
 * react-native-google-mobile-ads is mocked: its native module cannot load in Jest.
 */
import { createRewardedAds } from '@/features/play/rewardedAd';
import { AdError, type RewardedAds, type RewardedAdRequest } from '@/features/play/rewardedAdTypes';

const mockConsent = {
  requestInfoUpdate: jest.fn(),
  loadAndShowConsentFormIfRequired: jest.fn(),
  getConsentInfo: jest.fn(),
  showPrivacyOptionsForm: jest.fn(),
};
const mockInitialize = jest.fn();
const mockCreateForAdRequest = jest.fn();

jest.mock('@/config/monetization', () => ({
  adsSupported: true,
  ADMOB_REWARDED_UNIT_ID: 'ca-app-pub-test/unit',
}));

jest.mock('react-native-google-mobile-ads', () => {
  const ad = () => {
    const listeners = new Map<string, () => void>();
    return {
      addAdEventListener: (type: string, listener: () => void) => {
        listeners.set(type, listener);
        return () => undefined;
      },
      load: () => {
        listeners.get('loaded')?.();
        listeners.get('rewarded_earned_reward')?.();
        listeners.get('closed')?.();
      },
      show: () => Promise.resolve(),
      destroy: () => undefined,
    };
  };
  return {
    __esModule: true,
    default: () => ({
      setRequestConfiguration: () => Promise.resolve(),
      initialize: mockInitialize,
    }),
    AdsConsent: mockConsent,
    MaxAdContentRating: { G: 'G', PG: 'PG', T: 'T', MA: 'MA' },
    RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'rewarded_earned_reward' },
    AdEventType: { CLOSED: 'closed', ERROR: 'error' },
    RewardedAd: {
      createForAdRequest: (...args: unknown[]) => {
        mockCreateForAdRequest(...args);
        return ad();
      },
    },
  };
});

const request: RewardedAdRequest = {
  userId: '12',
  customData: 'ref:7',
  adRequest: { non_personalized: true, under_age_of_consent: false, max_ad_content_rating: 'G' },
};

function info(canRequestAds: boolean, privacy = 'NOT_REQUIRED') {
  return { canRequestAds, privacyOptionsRequirementStatus: privacy };
}

describe('rewardedAds consent gate', () => {
  let rewardedAds: RewardedAds;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialize.mockResolvedValue([]);
    mockConsent.requestInfoUpdate.mockResolvedValue(info(false));
    mockConsent.getConsentInfo.mockResolvedValue(info(false));
    // A fresh instance (and session cache) per test. The app loads the SDK with a dynamic
    // import, which Jest can't run: pass the mocked module instead.
    rewardedAds = createRewardedAds(() =>
      Promise.resolve(jest.requireMock('react-native-google-mobile-ads')),
    );
  });

  it('shows no ad and never initializes the SDK when consent does not allow ads', async () => {
    mockConsent.loadAndShowConsentFormIfRequired.mockResolvedValue(info(false));

    const result = rewardedAds.show(request);
    await expect(result).rejects.toBeInstanceOf(AdError);
    await expect(result).rejects.toMatchObject({ kind: 'noFill' });
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockCreateForAdRequest).not.toHaveBeenCalled();
  });

  it('gathers consent once, then requests a non-personalized ad', async () => {
    mockConsent.loadAndShowConsentFormIfRequired.mockResolvedValue(info(true, 'REQUIRED'));

    await expect(rewardedAds.show(request)).resolves.toBe('earned');
    await expect(rewardedAds.show(request)).resolves.toBe('earned');

    expect(mockConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
    expect(mockConsent.requestInfoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ tagForUnderAgeOfConsent: false }),
    );
    expect(mockConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockCreateForAdRequest).toHaveBeenCalledWith(
      'ca-app-pub-test/unit',
      expect.objectContaining({ requestNonPersonalizedAdsOnly: true }),
    );
    expect(rewardedAds.consent.privacyOptionsRequired()).toBe(true);
  });

  it('opens the privacy options form through the consent API', async () => {
    mockConsent.showPrivacyOptionsForm.mockResolvedValue(info(true, 'REQUIRED'));
    await rewardedAds.consent.showPrivacyOptions();
    expect(mockConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
    expect(rewardedAds.consent.privacyOptionsRequired()).toBe(true);
  });
});
