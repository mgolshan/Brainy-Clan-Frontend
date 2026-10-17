import {
  type ConsentApiLike,
  type ConsentInfoLike,
  consentDebugOptions,
  createAdConsent,
  noAdConsent,
} from '@/features/play/adConsent';

function info(canRequestAds: boolean, privacy = 'NOT_REQUIRED'): ConsentInfoLike {
  return { canRequestAds, privacyOptionsRequirementStatus: privacy };
}

function fakeApi(overrides: Partial<jest.Mocked<ConsentApiLike>> = {}) {
  const api: jest.Mocked<ConsentApiLike> = {
    requestInfoUpdate: jest.fn().mockResolvedValue(info(false)),
    loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue(info(true)),
    getConsentInfo: jest.fn().mockResolvedValue(info(true)),
    showPrivacyOptionsForm: jest.fn().mockResolvedValue(info(true, 'REQUIRED')),
    ...overrides,
  };
  return api;
}

describe('createAdConsent', () => {
  it('does nothing until an ad is requested (lazy)', () => {
    const load = jest.fn();
    createAdConsent(load);
    expect(load).not.toHaveBeenCalled();
  });

  it('gathers consent before the first ad and caches it for the session', async () => {
    const api = fakeApi();
    const consent = createAdConsent(() => Promise.resolve(api));

    await expect(consent.canRequestAds(false)).resolves.toBe(true);
    await expect(consent.canRequestAds(false)).resolves.toBe(true);

    expect(api.requestInfoUpdate).toHaveBeenCalledTimes(1);
    expect(api.requestInfoUpdate).toHaveBeenCalledWith({ tagForUnderAgeOfConsent: false });
    expect(api.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  });

  it('shares one consent flow between concurrent requests', async () => {
    const api = fakeApi();
    const consent = createAdConsent(() => Promise.resolve(api));
    await Promise.all([consent.canRequestAds(), consent.canRequestAds()]);
    expect(api.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  });

  it('passes debug options and leaves the under-age tag out when the policy has none', async () => {
    const api = fakeApi();
    const consent = createAdConsent(() => Promise.resolve(api), {
      debugGeography: 1,
      testDeviceIdentifiers: ['HASH'],
    });
    await consent.canRequestAds(undefined);
    expect(api.requestInfoUpdate).toHaveBeenCalledWith({
      debugGeography: 1,
      testDeviceIdentifiers: ['HASH'],
    });
  });

  it('asks again when the under-age tag changes (another member)', async () => {
    const api = fakeApi();
    const consent = createAdConsent(() => Promise.resolve(api));
    await consent.canRequestAds(false);
    await consent.canRequestAds(true);
    expect(api.requestInfoUpdate).toHaveBeenLastCalledWith({ tagForUnderAgeOfConsent: true });
    expect(api.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(2);
  });

  it('reports false when UMP says ads cannot be requested, and caches it', async () => {
    const api = fakeApi({
      loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue(info(false)),
    });
    const consent = createAdConsent(() => Promise.resolve(api));
    await expect(consent.canRequestAds(false)).resolves.toBe(false);
    await expect(consent.canRequestAds(false)).resolves.toBe(false);
    expect(api.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  });

  it('falls back to the stored consent when the update fails, without caching', async () => {
    const api = fakeApi({ requestInfoUpdate: jest.fn().mockRejectedValue(new Error('offline')) });
    const consent = createAdConsent(() => Promise.resolve(api));

    await expect(consent.canRequestAds(false)).resolves.toBe(true);
    expect(api.getConsentInfo).toHaveBeenCalledTimes(1);
    expect(api.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();

    api.requestInfoUpdate.mockResolvedValue(info(false));
    await consent.canRequestAds(false);
    expect(api.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  });

  it('never rejects: everything failing means no ad', async () => {
    const api = fakeApi({
      requestInfoUpdate: jest.fn().mockRejectedValue(new Error('offline')),
      getConsentInfo: jest.fn().mockRejectedValue(new Error('native')),
    });
    const consent = createAdConsent(() => Promise.resolve(api));
    await expect(consent.canRequestAds(false)).resolves.toBe(false);

    const missing = createAdConsent(() => Promise.reject(new Error('no native module')));
    await expect(missing.canRequestAds(false)).resolves.toBe(false);
  });

  it('offers privacy options only when UMP requires them, and notifies listeners', async () => {
    const api = fakeApi({
      loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue(info(true, 'REQUIRED')),
    });
    const consent = createAdConsent(() => Promise.resolve(api));
    const listener = jest.fn();
    const unsubscribe = consent.subscribe(listener);

    expect(consent.privacyOptionsRequired()).toBe(false);
    await consent.canRequestAds(false);
    expect(consent.privacyOptionsRequired()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    api.getConsentInfo.mockResolvedValue(info(true, 'NOT_REQUIRED'));
    await consent.refreshPrivacyOptions();
    expect(consent.privacyOptionsRequired()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refreshes the privacy status without a consent message or network update', async () => {
    const api = fakeApi({ getConsentInfo: jest.fn().mockResolvedValue(info(false, 'UNKNOWN')) });
    const consent = createAdConsent(() => Promise.resolve(api));
    await consent.refreshPrivacyOptions();
    expect(consent.privacyOptionsRequired()).toBe(false);
    expect(api.requestInfoUpdate).not.toHaveBeenCalled();
    expect(api.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  });

  it('applies changed choices from the privacy options form to the next ad', async () => {
    const api = fakeApi();
    const consent = createAdConsent(() => Promise.resolve(api));
    await expect(consent.canRequestAds(false)).resolves.toBe(true);

    api.showPrivacyOptionsForm.mockResolvedValue(info(false, 'REQUIRED'));
    await consent.showPrivacyOptions();
    await expect(consent.canRequestAds(false)).resolves.toBe(false);
    expect(api.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  });

  it('rejects when the privacy options form cannot be shown', async () => {
    const api = fakeApi({ showPrivacyOptionsForm: jest.fn().mockRejectedValue(new Error('x')) });
    const consent = createAdConsent(() => Promise.resolve(api));
    await expect(consent.showPrivacyOptions()).rejects.toThrow('x');
  });
});

describe('noAdConsent', () => {
  it('never allows ads and never offers privacy options', async () => {
    await expect(noAdConsent.canRequestAds(false)).resolves.toBe(false);
    expect(noAdConsent.privacyOptionsRequired()).toBe(false);
  });
});

describe('consentDebugOptions', () => {
  it('is empty outside development builds', () => {
    expect(consentDebugOptions('EEA', 'A,B', false)).toEqual({});
  });

  it('maps the geography and splits the device IDs', () => {
    expect(consentDebugOptions(' eea ', ' A , ,B ', true)).toEqual({
      debugGeography: 1,
      testDeviceIdentifiers: ['A', 'B'],
    });
    expect(consentDebugOptions('REGULATED_US_STATE', undefined, true)).toEqual({
      debugGeography: 3,
    });
  });

  it('ignores unknown or empty values', () => {
    expect(consentDebugOptions('MARS', '', true)).toEqual({});
    expect(consentDebugOptions(undefined, undefined, true)).toEqual({});
  });
});
