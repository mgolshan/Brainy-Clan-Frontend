import { ApiError, api } from '@/api/client';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import {
  applyPendingReferral,
  cleanReferralInput,
  normalizeReferralCode,
  referralFailure,
  referralFailureKey,
  useReferralStore,
} from '@/features/billing/referral';

jest.mock('@/api/client', () => {
  const actual = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  return { ...actual, api: { ...actual.api, post: jest.fn(), get: jest.fn() } };
});

const post = api.post as jest.Mock;

const apiError = (status: number, code: string, fieldErrors: Record<string, string[]> = {}) =>
  new ApiError(status, 'nope', code, undefined, fieldErrors);

const lookup = (dict: unknown, path: string) =>
  path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dict);

beforeEach(() => {
  post.mockReset();
  useReferralStore.getState().clear();
});

describe('normalizeReferralCode', () => {
  it('upper-cases and trims valid codes', () => {
    expect(normalizeReferralCode(' maya ')).toBe('MAYA');
    expect(normalizeReferralCode('Maya-2026')).toBe('MAYA-2026');
    expect(normalizeReferralCode('A'.repeat(20))).toBe('A'.repeat(20));
  });

  it('is null for empty or impossible codes', () => {
    expect(normalizeReferralCode('')).toBeNull();
    expect(normalizeReferralCode('   ')).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode('MA YA')).toBeNull();
    expect(normalizeReferralCode('MAYA!')).toBeNull();
    expect(normalizeReferralCode('A'.repeat(21))).toBeNull();
  });

  it('cleanReferralInput keeps only code characters while typing', () => {
    expect(cleanReferralInput('ma ya!-1')).toBe('MAYA-1');
    expect(cleanReferralInput('x'.repeat(30))).toHaveLength(20);
  });
});

describe('referral error mapping', () => {
  it('maps the contract codes to friendly en/fr messages', () => {
    expect(referralFailure(apiError(422, 'referral_code_invalid'))).toBe('invalid');
    expect(referralFailure(apiError(409, 'referral_code_locked'))).toBe('locked');
    expect(
      referralFailure(apiError(422, 'validation_failed', { code: ['The code is invalid.'] })),
    ).toBe('invalid');
    for (const reason of ['invalid', 'locked'] as const) {
      const key = referralFailureKey(reason);
      expect(typeof lookup(en, key)).toBe('string');
      expect(typeof lookup(fr, key)).toBe('string');
    }
  });

  it('leaves transient errors alone (retried later)', () => {
    expect(referralFailure(apiError(0, 'network_error'))).toBeNull();
    expect(referralFailure(apiError(500, 'server_error'))).toBeNull();
    expect(referralFailure(new Error('boom'))).toBeNull();
  });
});

describe('applyPendingReferral (code typed at sign-up)', () => {
  it('does nothing without a pending code', async () => {
    await applyPendingReferral();
    expect(post).not.toHaveBeenCalled();
  });

  it('sends the code once the family exists and forgets it on success', async () => {
    useReferralStore.getState().setPending('MAYA');
    post.mockResolvedValueOnce({ data: { code: 'MAYA', source: 'code' } });
    await applyPendingReferral();
    expect(post).toHaveBeenCalledWith('/family/referral-code', { code: 'MAYA' });
    expect(useReferralStore.getState()).toMatchObject({ pendingCode: null, failure: null });
  });

  it.each([
    ['referral_code_invalid', 422, 'invalid'],
    ['referral_code_locked', 409, 'locked'],
  ] as const)('drops a refused code (%s) and remembers why', async (code, status, reason) => {
    useReferralStore.getState().setPending('NOPE');
    post.mockRejectedValueOnce(apiError(status, code));
    await applyPendingReferral();
    expect(useReferralStore.getState()).toMatchObject({
      pendingCode: null,
      failure: { code: 'NOPE', reason },
    });
  });

  it('keeps the code after a network error for the next try', async () => {
    useReferralStore.getState().setPending('MAYA');
    post.mockRejectedValueOnce(apiError(0, 'network_error'));
    await applyPendingReferral();
    expect(useReferralStore.getState()).toMatchObject({ pendingCode: 'MAYA', failure: null });
  });

  it('never sends twice at the same time', async () => {
    useReferralStore.getState().setPending('MAYA');
    post.mockResolvedValue({ data: { code: 'MAYA', source: 'code' } });
    await Promise.all([applyPendingReferral(), applyPendingReferral()]);
    expect(post).toHaveBeenCalledTimes(1);
  });
});
