import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type {
  ClassroomCodeCard,
  ClassroomCodesBody,
  ClassroomSummary,
  ClassroomSummaryPeriod,
  Envelope,
  Family,
  FamilyPayload,
  MePayload,
  Member,
  NewYearBody,
  RosterBody,
} from '@/api/types';
import { useIsAdmin } from '@/features/auth/hooks';
import { fetchSummaryCsv } from '@/features/classroom/api';
import { isConsentRequired } from '@/features/classroom/errors';
import { teacherClassroom } from '@/features/classroom/model';
import { summaryFileName, summaryPath } from '@/features/classroom/summary';
import { useFamily } from '@/features/family/hooks';
import { CSV_FILE, saveExportFile } from '@/features/legal/saveExport';
import { useLegal } from '@/features/legal/hooks';

/**
 * Classroom tools (B12 step 3): consent, roster, code cards, class summary, new year. Every
 * mutation refreshes the family (its `classroom` setup state, members) and `me` (the family in
 * it); the summary lives under the `family` key so it is refreshed with it.
 */

let lastConsentRedirect = 0;

/**
 * Any 409 `classroom_consent_required` opens the consent screen (once, even when several
 * requests fail together) and re-reads the family, whose consent state is out of date.
 */
export function routeToConsentIfRequired(error: unknown, client?: QueryClient): boolean {
  if (!isConsentRequired(error)) return false;
  if (client) {
    void client.invalidateQueries({ queryKey: queryKeys.family, exact: true });
    void client.invalidateQueries({ queryKey: queryKeys.me, exact: true });
  }
  const now = Date.now();
  if (now - lastConsentRedirect > 2_000) {
    lastConsentRedirect = now;
    router.push('/classroom/consent');
  }
  return true;
}

/** Puts a returned Family into the `family` and `me` caches, then re-reads both. */
function applyFamily(client: QueryClient, family: Family | undefined) {
  if (family) {
    client.setQueryData<FamilyPayload>(queryKeys.family, (prev) =>
      prev ? { ...prev, family: { ...prev.family, ...family } } : prev,
    );
    client.setQueryData<MePayload>(queryKeys.me, (prev) =>
      prev?.family ? { ...prev, family: { ...prev.family, ...family } } : prev,
    );
  }
  void client.invalidateQueries({ queryKey: queryKeys.family });
  void client.invalidateQueries({ queryKey: queryKeys.me, exact: true });
}

/**
 * The Classroom of a signed-in teacher: the family, its setup state (null when the viewer isn't
 * an admin of a Classroom) and the current consent statement from `GET /legal`.
 */
export function useClassroom() {
  const isAdmin = useIsAdmin();
  const family = useFamily();
  const legal = useLegal();
  const classroom = teacherClassroom(family.data?.family, isAdmin);
  return {
    family,
    classroom,
    consent: legal.data?.classroom_consent ?? null,
    legal,
  };
}

/** `POST /family/classroom/consent` with the version the teacher just read. */
export function useAcceptClassroomConsent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (version: string) =>
      (await api.post<Envelope<Family>>('/family/classroom/consent', { version })).data,
    onSuccess: (family) => applyFamily(client, family),
  });
}

/** `POST /family/classroom/roster`: adds the students (201 `{ data: Member[] }`). */
export function useAddRoster() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: RosterBody) =>
      (await api.post<Envelope<Member[]>>('/family/classroom/roster', body)).data,
    onError: (error) => routeToConsentIfRequired(error, client),
    onSuccess: (added) => {
      client.setQueryData<FamilyPayload>(queryKeys.family, (prev) =>
        prev
          ? {
              ...prev,
              members: [
                ...prev.members,
                ...added.filter((m) => !prev.members.some((p) => p.id === m.id)),
              ],
            }
          : prev,
      );
      applyFamily(client, undefined);
    },
  });
}

/**
 * `POST /family/classroom/sign-in-codes`: new one-time codes (older ones stop working). The
 * cards are returned to the screen only, never cached or persisted.
 */
export function useIssueClassroomCodes() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (memberIds: number[] | null) => {
      const body: ClassroomCodesBody = memberIds ? { member_ids: memberIds } : {};
      return (
        await api.post<Envelope<ClassroomCodeCard[]>>('/family/classroom/sign-in-codes', body)
      ).data;
    },
    onError: (error) => routeToConsentIfRequired(error, client),
    // `classroom.codes_issued_at` changed.
    onSuccess: () => applyFamily(client, undefined),
  });
}

/** `GET /family/classroom/summary?period=` (teachers only). */
export function useClassroomSummary(period: ClassroomSummaryPeriod, enabled: boolean) {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.classroomSummary(period),
    enabled,
    queryFn: async ({ signal }) => {
      try {
        return (await api.get<Envelope<ClassroomSummary>>(summaryPath(period), { signal })).data;
      } catch (error) {
        routeToConsentIfRequired(error, client);
        throw error;
      }
    },
  });
}

export type SaveResult = 'downloaded' | 'shared';

/**
 * `GET /family/classroom/summary.csv?period=` with the Bearer token (through the API client,
 * never a link with the token), saved as a file: a download on web, the share sheet on phones.
 */
export function useDownloadSummaryCsv() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      period: ClassroomSummaryPeriod;
      className: string;
      generatedAt?: string | null;
    }): Promise<SaveResult> => {
      const csv = await fetchSummaryCsv(args.period);
      const name = summaryFileName(args.className, args.period, 'csv', args.generatedAt);
      return saveExportFile(name, csv, CSV_FILE);
    },
    onError: (error) => routeToConsentIfRequired(error, client),
  });
}

/**
 * `POST /family/classroom/new-year`. Students, points (season), chat and goals may all change,
 * so everything family-scoped is re-read.
 */
export function useStartNewYear() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: NewYearBody) =>
      (await api.post<Envelope<Family>>('/family/classroom/new-year', body)).data,
    onError: (error) => routeToConsentIfRequired(error, client),
    onSuccess: (family, body) => {
      applyFamily(client, family);
      if (body.clear.chat) void client.invalidateQueries({ queryKey: queryKeys.chat });
      if (body.clear.goals || body.clear.points || body.clear.students) {
        void client.invalidateQueries({ queryKey: queryKeys.goals });
      }
      if (body.clear.points) void client.invalidateQueries({ queryKey: queryKeys.meStats });
    },
  });
}
