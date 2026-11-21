import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { create } from 'zustand';

import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Envelope, Onboarding, OnboardingStepKey } from '@/api/types';
import { useMe } from '@/features/auth/hooks';
import {
  checklist,
  copyVariant,
  resolveFlow,
  resolveFlowSteps,
  type Checklist,
  type CopyVariant,
  type FlowKey,
} from '@/features/onboarding/flows';
import {
  isOnboardingMissing,
  parseOnboarding,
  pendingKeys,
  withDismissed,
  withRestored,
  withStepDone,
} from '@/features/onboarding/state';
import { useSession } from '@/store/session';

/**
 * FTUE server state (`docs/FTUE-CONTRACT.md`). The query data is `null` on an older server (404):
 * every FTUE surface then hides. Marking a step or dismissing is optimistic and never blocks the
 * UI: failures are silent (the next refetch shows the server truth).
 */

/** `GET /me/onboarding` → the parsed object, or `null` when the server doesn't have it (404). */
export async function loadOnboarding(
  request: () => Promise<Envelope<unknown>>,
): Promise<Onboarding | null> {
  try {
    return parseOnboarding((await request()).data);
  } catch (error) {
    if (isOnboardingMissing(error)) return null;
    throw error;
  }
}

export function useOnboarding() {
  const token = useSession((s) => s.token);
  const hasMember = !!useMe().data?.member;
  return useQuery({
    queryKey: queryKeys.onboarding,
    queryFn: ({ signal }) =>
      loadOnboarding(() => api.get<Envelope<unknown>>('/me/onboarding', { signal })),
    enabled: !!token && hasMember,
    staleTime: 30_000,
    retry: (count, error) => !isOnboardingMissing(error) && count < 2,
  });
}

/**
 * Tips / sheets already shown in this app run, per user (`<userId>:<key>`): a coach mark never
 * shows twice in one run, even when its POST failed and a refetch still says "not done".
 */
interface FtueRunState {
  shown: string[];
  markShown: (id: string) => void;
  /** `POST /me/onboarding/restore` answered 404 (older server): hide the "show again" action. */
  restoreMissing: boolean;
  setRestoreMissing: () => void;
}

export const useFtueRun = create<FtueRunState>()((set) => ({
  shown: [],
  markShown: (id) => set((s) => (s.shown.includes(id) ? s : { shown: [...s.shown, id] })),
  restoreMissing: false,
  setRestoreMissing: () => set({ restoreMissing: true }),
}));

export const runId = (userId: number | undefined, key: string) => `${userId ?? 0}:${key}`;

/** Writes one step's POST outcome into the cache (shared by the step and dismiss mutations). */
function settle(client: QueryClient, error: unknown, data?: Onboarding) {
  if (data) {
    client.setQueryData(queryKeys.onboarding, data);
  } else if (isOnboardingMissing(error)) {
    // Older server: hide FTUE for this run.
    client.setQueryData(queryKeys.onboarding, null);
  } else if (error) {
    void client.invalidateQueries({ queryKey: queryKeys.onboarding });
  }
}

/**
 * `POST /me/onboarding/{step}` for each key not done yet (manual steps only), optimistic. The last
 * response (the whole object) replaces the cache.
 */
export function useMarkSteps() {
  const client = useQueryClient();
  const userId = useMe().data?.user.id;
  const markShown = useFtueRun((s) => s.markShown);
  return useMutation({
    mutationFn: async (keys: readonly OnboardingStepKey[]) => {
      let last: Onboarding | undefined;
      for (const key of keys) {
        const body = await api.post<Envelope<unknown>>(`/me/onboarding/${key}`);
        last = parseOnboarding(body.data);
      }
      return last;
    },
    onMutate: async (keys) => {
      for (const key of keys) markShown(runId(userId, key));
      await client.cancelQueries({ queryKey: queryKeys.onboarding });
      client.setQueryData<Onboarding | null>(queryKeys.onboarding, (prev) =>
        withStepDone(prev, keys, new Date().toISOString()),
      );
    },
    onSettled: (data, error) => settle(client, error, data),
  });
}

/** Marks the steps that aren't done yet (no request when all are). */
export function useMarkPending() {
  const mark = useMarkSteps();
  const client = useQueryClient();
  return (keys: readonly OnboardingStepKey[]) => {
    const pending = pendingKeys(client.getQueryData<Onboarding | null>(queryKeys.onboarding), keys);
    if (pending.length > 0) mark.mutate(pending);
  };
}

/** `POST /me/onboarding/dismiss`: hides the checklist (optimistic). */
export function useDismissOnboarding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      parseOnboarding((await api.post<Envelope<unknown>>('/me/onboarding/dismiss')).data),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: queryKeys.onboarding });
      client.setQueryData<Onboarding | null>(queryKeys.onboarding, (prev) =>
        withDismissed(prev, new Date().toISOString()),
      );
    },
    onSettled: (data, error) => settle(client, error, data),
  });
}

/**
 * `POST /me/onboarding/restore`: shows the checklist again (optimistic, step progress kept). A 404
 * (older server without the route) puts the dismissed state back and hides the action for this
 * run; FTUE itself stays on.
 */
export function useRestoreOnboarding() {
  const client = useQueryClient();
  const setRestoreMissing = useFtueRun((s) => s.setRestoreMissing);
  return useMutation({
    mutationFn: async () =>
      parseOnboarding((await api.post<Envelope<unknown>>('/me/onboarding/restore')).data),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: queryKeys.onboarding });
      const previous = client.getQueryData<Onboarding | null>(queryKeys.onboarding);
      client.setQueryData<Onboarding | null>(queryKeys.onboarding, (prev) => withRestored(prev));
      return { previous };
    },
    onSuccess: (data) => client.setQueryData(queryKeys.onboarding, data),
    onError: (error, _vars, context) => {
      if (isOnboardingMissing(error)) {
        setRestoreMissing();
        if (context) client.setQueryData(queryKeys.onboarding, context.previous);
      } else {
        void client.invalidateQueries({ queryKey: queryKeys.onboarding });
      }
    },
  });
}

export interface FtueModel {
  /** `null` while loading, on an older server or without a flow: hide every FTUE surface. */
  onboarding: Onboarding | null;
  flow: FlowKey | null;
  variant: CopyVariant;
  checklist: Checklist | null;
  userId: number | undefined;
}

/** Everything the FTUE surfaces need, from `me` + the onboarding query. */
export function useFtue(): FtueModel & { query: ReturnType<typeof useOnboarding> } {
  const me = useMe().data;
  const query = useOnboarding();
  const data = query.data ?? null;
  // The server's flow / steps when it sends them; the app's own derivation on older servers.
  const flow = resolveFlow(data, me);
  const onboarding = flow ? data : null;
  return {
    query,
    onboarding,
    flow,
    variant: copyVariant(me?.policy),
    checklist: onboarding ? checklist(onboarding, resolveFlowSteps(onboarding, me)) : null,
    userId: me?.user.id,
  };
}
