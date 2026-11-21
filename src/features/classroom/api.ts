import { api } from '@/api/client';
import type { ClassroomSummaryPeriod } from '@/api/types';
import { summaryCsvPath } from '@/features/classroom/summary';

/**
 * `GET /family/classroom/summary.csv?period=` through the API client, so the Bearer token goes
 * in the header (never in a link). Errors still come back as JSON (`ApiError`); the file itself
 * is returned as text.
 */
export async function fetchSummaryCsv(period: ClassroomSummaryPeriod): Promise<string> {
  const csv = await api.get<unknown>(summaryCsvPath(period), { timeoutMs: 60_000 });
  if (typeof csv !== 'string') throw new Error('unexpected summary file');
  return csv;
}
