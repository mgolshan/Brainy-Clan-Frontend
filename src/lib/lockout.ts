/**
 * Sign-in lockout (API.md → Auth → "Lockout"): after too many failed password or code sign-ins the
 * API answers 429 `login_locked` with `retry_after` (seconds) in the body and a `Retry-After`
 * header. These helpers are pure so they can be unit-tested; the screens use `useLockout`.
 */

/**
 * Seconds to wait from a 429 answer: the body's `retry_after` wins, else the `Retry-After` header
 * (delta-seconds or an HTTP date, relative to `now`). `null` when neither is usable.
 */
export function parseRetryAfter(
  bodyValue: unknown,
  headerValue: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (typeof bodyValue === 'number' && Number.isFinite(bodyValue) && bodyValue >= 0) {
    return Math.ceil(bodyValue);
  }
  if (typeof bodyValue === 'string' && /^\d+$/.test(bodyValue.trim())) {
    return Number(bodyValue.trim());
  }
  const header = headerValue?.trim();
  if (!header) return null;
  if (/^\d+$/.test(header)) return Number(header);
  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

/** How a remaining wait is shown: a clock under 15 minutes, then minutes, then hours. */
export type RetryIn =
  | { unit: 'clock'; time: string }
  | { unit: 'minutes'; count: number }
  | { unit: 'hours'; count: number };

/** Below this many seconds the wait is shown as a live "m:ss" clock. */
const CLOCK_LIMIT = 15 * 60;
/** From this many seconds on the wait is shown in hours (the 24 h lock). */
const HOURS_FROM = 2 * 3600;

/**
 * 299 → `4:59`, 3540 → 59 minutes, 86400 → 24 hours. Minutes and hours round **up**, so the
 * message never promises an earlier time than the server's.
 */
export function formatRetryIn(seconds: number): RetryIn {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < CLOCK_LIMIT) {
    const minutes = Math.floor(s / 60);
    return { unit: 'clock', time: `${minutes}:${String(s % 60).padStart(2, '0')}` };
  }
  if (s < HOURS_FROM) return { unit: 'minutes', count: Math.ceil(s / 60) };
  return { unit: 'hours', count: Math.ceil(s / 3600) };
}

/**
 * Seconds still to wait at `now` for a lock received at `receivedAt` with `retryAfter` seconds:
 * never negative and never more than `retryAfter` (a slightly stale `now` can't add time).
 */
export function secondsLeft(receivedAt: number, retryAfter: number, now: number): number {
  const left = Math.ceil((receivedAt + retryAfter * 1000 - now) / 1000);
  return Math.min(retryAfter, Math.max(0, left));
}
