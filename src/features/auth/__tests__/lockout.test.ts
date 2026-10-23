import type { TFunction } from 'i18next';

import { ApiError, apiRequest } from '@/api/client';
import { lockoutCountdown, lockoutOf } from '@/features/auth/lockout';
import en from '@/i18n/locales/en.json';

/** Fake `t`: the key plus its params, so tests see which string and values were chosen. */
const t = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key} ${JSON.stringify(params)}` : key) as unknown as TFunction;

const locked = (retryAfter: number | null) =>
  new ApiError(429, 'Too many attempts.', 'login_locked', undefined, {}, retryAfter);

describe('lockoutOf', () => {
  it('returns the lock of a login_locked error with a wait time', () => {
    const error = locked(300);
    expect(lockoutOf(error)).toEqual({ receivedAt: error.receivedAt, retryAfter: 300 });
  });

  it('ignores rate_limited, other errors and a lock without a wait time', () => {
    expect(lockoutOf(new ApiError(429, 'Slow down', 'rate_limited', undefined, {}, 60))).toBeNull();
    expect(lockoutOf(new ApiError(401, 'No', 'invalid_credentials'))).toBeNull();
    expect(lockoutOf(locked(null))).toBeNull();
    expect(lockoutOf(locked(0))).toBeNull();
    expect(lockoutOf(new Error('boom'))).toBeNull();
    expect(lockoutOf(null)).toBeNull();
  });
});

describe('lockoutCountdown', () => {
  it('picks the clock, minutes or hours string', () => {
    expect(lockoutCountdown(t, 299)).toBe('lockout.tryAgainClock {"time":"4:59"}');
    expect(lockoutCountdown(t, 3600)).toBe('lockout.tryAgainMinutes {"count":60}');
    expect(lockoutCountdown(t, 86_400)).toBe('lockout.tryAgainHours {"count":24}');
  });

  it('uses strings that exist in en.json', () => {
    expect(en.lockout.tryAgainClock).toContain('{{time}}');
    expect(en.lockout.tryAgainMinutes_other).toContain('{{count}}');
    expect(en.lockout.tryAgainHours_other).toContain('{{count}}');
  });
});

describe('apiRequest on 429', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function respond(status: number, body: unknown, headers: Record<string, string> = {}) {
    globalThis.fetch = jest.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ 'content-type': 'application/json', ...headers }),
      json: async () => body,
      text: async () => JSON.stringify(body),
    })) as unknown as typeof fetch;
  }

  it('carries retry_after from the login_locked body', async () => {
    respond(
      429,
      { message: 'Locked', code: 'login_locked', retry_after: 300 },
      { 'Retry-After': '300' },
    );
    const error = await apiRequest('/auth/login', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('login_locked');
    expect((error as ApiError).retryAfter).toBe(300);
    expect(lockoutOf(error)).not.toBeNull();
  });

  it('falls back to the Retry-After header and maps a bare 429 to rate_limited', async () => {
    respond(429, { message: 'Too Many Attempts.' }, { 'Retry-After': '42' });
    const error = (await apiRequest('/auth/login').catch((e: unknown) => e)) as ApiError;
    expect(error.code).toBe('rate_limited');
    expect(error.retryAfter).toBe(42);
    expect(lockoutOf(error)).toBeNull();
  });

  it('has no retryAfter outside 429', async () => {
    respond(401, { message: 'No', code: 'invalid_credentials' }, { 'Retry-After': '42' });
    const error = (await apiRequest('/auth/login').catch((e: unknown) => e)) as ApiError;
    expect(error.retryAfter).toBeNull();
  });
});
