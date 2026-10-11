import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';

import { formatDate } from '@/lib/format';

/** Current time, re-rendering every `intervalMs` (countdowns). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** "2 days 4 h left" / "3 h 10 min left" / "Ends in a moment" / "Ended". */
export function formatTimeLeft(t: TFunction, endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return t('goals.left.ended');
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return t('goals.left.days', { count: days, hours: hours % 24 });
  if (hours >= 1) return t('goals.left.hours', { count: hours, minutes: minutes % 60 });
  if (minutes >= 1) return t('goals.left.minutes', { count: minutes });
  return t('goals.left.soon');
}

/** Local calendar date as `YYYY-MM-DD`. */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calendar date `YYYY-MM-DD` of `date` in an IANA time zone (the family's; the server validates
 * `starts_on` against "today in the family time zone"). Falls back to the device's local date.
 */
export function dateInTimeZone(date: Date, timeZone?: string): string {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const get = (type: string) => parts.find((p) => p.type === type)?.value;
      const y = get('year');
      const m = get('month');
      const d = get('day');
      if (y && m && d) return `${y}-${m}-${d}`;
    } catch {
      // Unknown zone or no Intl time zone support: use the device date.
    }
  }
  return toDateString(date);
}

/** Start-date choices for the wizard: today, tomorrow, next Monday (in the family's zone). */
export function startDateOptions(now = new Date(), timeZone?: string) {
  const [y, m, d] = dateInTimeZone(now, timeZone).split('-').map(Number);
  // Pure calendar arithmetic in UTC, so the device zone and DST can't shift the day.
  const day = (offset: number) =>
    new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return {
    today: day(0),
    tomorrow: day(1),
    nextMonday: day((8 - weekday) % 7 || 7),
  };
}

/**
 * "Oct 12 – Oct 18, 2026" style label for a goal period. `ends_at` is the exclusive end of the
 * window (next period's start), so the last day shown is one moment before it; a daily period
 * shows a single date.
 */
export function formatPeriodRange(startsAt: string, endsAt: string, locale: string): string {
  const end = new Date(new Date(endsAt).getTime() - 1);
  const first = formatDate(startsAt, locale);
  const last = Number.isNaN(end.getTime())
    ? formatDate(endsAt, locale)
    : formatDate(end.toISOString(), locale);
  return first === last ? first : `${first} – ${last}`;
}
