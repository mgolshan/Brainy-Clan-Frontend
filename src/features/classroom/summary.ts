import type { ClassroomSummaryPeriod } from '@/api/types';

/** Class summary export (B12 step 3, `GET /family/classroom/summary[.csv]`), pure logic. */

export const SUMMARY_PERIODS: readonly ClassroomSummaryPeriod[] = ['season', 'all'];

/** A route / UI value as a period; anything unknown is the contract default `season`. */
export function parsePeriod(value: unknown): ClassroomSummaryPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'all' ? 'all' : 'season';
}

export function summaryPath(period: ClassroomSummaryPeriod): string {
  return `/family/classroom/summary?period=${period}`;
}

export function summaryCsvPath(period: ClassroomSummaryPeriod): string {
  return `/family/classroom/summary.csv?period=${period}`;
}

/**
 * File-name part from the class name: lower case, accents dropped, anything but letters and
 * digits becomes `-`; `class` when nothing is left (e.g. a name made of emoji).
 */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return slug || 'class';
}

/** `YYYY-MM-DD` of an ISO time, or of `now` when it is missing or invalid. */
function day(iso: string | null | undefined, now: Date): string {
  const time = iso ? Date.parse(iso) : NaN;
  return new Date(Number.isNaN(time) ? now.getTime() : time).toISOString().slice(0, 10);
}

/** `brainy-clan-grade-4b-season-2026-11-21.csv` (dated by `generated_at` when known). */
export function summaryFileName(
  className: string,
  period: ClassroomSummaryPeriod,
  extension: 'csv' | 'pdf',
  generatedAt?: string | null,
  now: Date = new Date(),
): string {
  return `brainy-clan-${slugify(className)}-${period}-${day(generatedAt, now)}.${extension}`;
}
