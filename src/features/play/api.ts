import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type {
  AnswerBody,
  AnswerResult,
  Category,
  Envelope,
  PlaySession,
  SecondChanceBody,
  SessionItem,
  SessionPayload,
} from '@/api/types';

// ---------------------------------------------------------------------------
// Raw calls (also used by the answer queue outside React)
// ---------------------------------------------------------------------------

export async function postAnswer(sessionId: number, body: AnswerBody): Promise<AnswerResult> {
  return (
    await api.post<Envelope<AnswerResult>>(`/play/sessions/${sessionId}/answers`, body, {
      timeoutMs: 10_000,
    })
  ).data;
}

/**
 * Merge items by id and sort by position. `GET`, `second-chance` and `redemption` return all
 * session items; merging (rather than replacing) keeps answers recorded locally before a refetch.
 */
export function mergeItems(current: SessionItem[], incoming: SessionItem[]): SessionItem[] {
  const byId = new Map<number, SessionItem>();
  for (const item of current) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, { ...byId.get(item.id), ...item });
  return [...byId.values()].sort((a, b) => a.position - b.position);
}

/** Write a server answer result into the cached session. */
export function applyAnswerResult(sessionId: number, itemId: number, result: AnswerResult) {
  queryClient.setQueryData<SessionPayload>(queryKeys.playSession(sessionId), (prev) =>
    prev
      ? {
          session: result.session,
          items: prev.items.map((it) => (it.id === itemId ? { ...it, answered: true } : it)),
        }
      : prev,
  );
  // Points changed: home stats and leaderboard are now stale.
  void queryClient.invalidateQueries({ queryKey: queryKeys.meStats });
  void queryClient.invalidateQueries({ queryKey: ['family', 'leaderboard'] });
}

function applySessionPayload(payload: SessionPayload) {
  queryClient.setQueryData<SessionPayload>(queryKeys.playSession(payload.session.id), (prev) => ({
    session: payload.session,
    items: mergeItems(prev?.items ?? [], payload.items),
  }));
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** `GET /categories`: the tree visible to the member. */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<Category[]>>('/categories', { signal })).data,
    staleTime: 5 * 60_000,
  });
}

/** `GET /play/sessions/{id}`; seeded by `useStartSession`. */
export function usePlaySessionQuery(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.playSession(sessionId),
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<SessionPayload>>(`/play/sessions/${sessionId}`, { signal })).data,
    enabled: Number.isFinite(sessionId) && sessionId > 0,
    staleTime: Infinity,
    // Merge with locally known answered flags instead of blindly replacing.
    structuralSharing: (oldData, newData) => {
      const prev = oldData as SessionPayload | undefined;
      const next = newData as SessionPayload;
      if (!prev) return next;
      return { session: next.session, items: mergeItems(prev.items, next.items) };
    },
  });
}

/** `POST /play/sessions` → seeds the session cache and returns the payload. */
export function useStartSession() {
  return useMutation({
    mutationFn: async (categoryId: number) =>
      (await api.post<Envelope<SessionPayload>>('/play/sessions', { category_id: categoryId }))
        .data,
    onSuccess: (payload) => {
      queryClient.setQueryData<SessionPayload>(queryKeys.playSession(payload.session.id), {
        // The live backend (2026-10-10) sends `null` counters on a brand-new session; the
        // contract says numbers, so default them to 0 rather than render "null".
        session: {
          ...payload.session,
          points: payload.session.points ?? 0,
          mistakes: payload.session.mistakes ?? 0,
          second_chances_used: payload.session.second_chances_used ?? 0,
        },
        items: [...payload.items].sort((a, b) => a.position - b.position),
      });
    },
  });
}

export function useSecondChance(sessionId: number) {
  return useMutation({
    mutationFn: async (body: SecondChanceBody) =>
      (await api.post<Envelope<SessionPayload>>(`/play/sessions/${sessionId}/second-chance`, body))
        .data,
    onSuccess: applySessionPayload,
  });
}

export function useRedemption(sessionId: number) {
  return useMutation({
    mutationFn: async () =>
      (await api.post<Envelope<SessionPayload>>(`/play/sessions/${sessionId}/redemption`)).data,
    onSuccess: applySessionPayload,
  });
}

export function useAbandonSession(sessionId: number) {
  return useMutation({
    mutationFn: async () =>
      (await api.post<Envelope<PlaySession>>(`/play/sessions/${sessionId}/abandon`)).data,
    onSuccess: (session) => {
      queryClient.setQueryData<SessionPayload>(queryKeys.playSession(sessionId), (prev) =>
        prev ? { ...prev, session } : prev,
      );
    },
  });
}
