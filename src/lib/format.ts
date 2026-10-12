/** Locale-aware short date ("Oct 17, 2026"); falls back to the ISO date if Intl is unavailable. */
export function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return iso.slice(0, 10);
  }
}

/** Locale-aware integer ("1,234" / "1 234"). */
export function formatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

/** "5 minutes ago" / "yesterday"; older than a week (or no Intl support) → short date. */
export function formatRelative(iso: string, locale: string, now = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs >= 7 * 86_400) return formatDate(iso, locale);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (abs < 60) return rtf.format(0, 'second');
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
    if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
    return rtf.format(Math.round(seconds / 86_400), 'day');
  } catch {
    return formatDate(iso, locale);
  }
}

/** Remaining time as "14:59" (minutes:seconds), never negative. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
