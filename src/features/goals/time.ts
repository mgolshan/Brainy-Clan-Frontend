import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';

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

/** Start-date choices for the wizard: today, tomorrow, next Monday. */
export function startDateOptions(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const monday = new Date(today);
  monday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
  return {
    today: toDateString(today),
    tomorrow: toDateString(tomorrow),
    nextMonday: toDateString(monday),
  };
}
