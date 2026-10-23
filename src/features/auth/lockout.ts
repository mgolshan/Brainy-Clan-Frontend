import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client';
import { formatRetryIn, secondsLeft } from '@/lib/lockout';

/** A `login_locked` answer with a usable wait time. */
export interface LockInfo {
  receivedAt: number;
  retryAfter: number;
}

/**
 * The lock behind a mutation error: 429 `login_locked` with `retry_after` (body or header).
 * `null` for every other error, including `rate_limited` (that keeps its own message) and a
 * `login_locked` without any wait time (shown as a plain message, submit stays enabled).
 */
export function lockoutOf(error: unknown): LockInfo | null {
  if (!(error instanceof ApiError) || error.code !== 'login_locked') return null;
  if (error.retryAfter === null || error.retryAfter <= 0) return null;
  return { receivedAt: error.receivedAt, retryAfter: error.retryAfter };
}

/** "Try again in 4:59." / "Try again in 45 minutes." / "Try again in 24 hours." */
export function lockoutCountdown(t: TFunction, seconds: number): string {
  const retryIn = formatRetryIn(seconds);
  switch (retryIn.unit) {
    case 'clock':
      return t('lockout.tryAgainClock', { time: retryIn.time });
    case 'minutes':
      return t('lockout.tryAgainMinutes', { count: retryIn.count });
    case 'hours':
      return t('lockout.tryAgainHours', { count: retryIn.count });
  }
}

export interface LockoutState {
  /** A sign-in lock is running: disable submit and show `countdown`. */
  locked: boolean;
  /** Live "Try again in m:ss" text while locked. */
  countdown: string | null;
}

/**
 * Live state of a sign-in lock from a mutation error (`login_locked`). The countdown ticks every
 * second and ends by itself; the server's `retry_after` is the only source of the time.
 */
export function useLockout(error: unknown): LockoutState {
  const { t } = useTranslation();
  const lock = lockoutOf(error);
  const [now, setNow] = useState(() => Date.now());
  // `secondsLeft` clamps to `retry_after`, so a stale `now` (before this error) can't add time.
  const left = lock ? secondsLeft(lock.receivedAt, lock.retryAfter, now) : 0;
  const active = left > 0;

  // Tick every second while locked (first tick right away); stops by itself at 0.
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active]);

  return active
    ? { locked: true, countdown: lockoutCountdown(t, left) }
    : { locked: false, countdown: null };
}
