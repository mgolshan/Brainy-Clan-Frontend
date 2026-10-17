import { useMutation, useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';

import { ApiError, api } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type {
  AnswerBody,
  AnswerResult,
  Category,
  CurrentSession,
  Envelope,
  PlaySession,
  SecondChanceBody,
  SessionPayload,
} from '@/api/types';
import { usePolicy } from '@/features/auth/hooks';
import { isUnfinished } from '@/features/play/resume';
import { rewardedAds } from '@/features/play/rewardedAd';
import { AdError } from '@/features/play/rewardedAdTypes';
import { markAnswered, mergeItems } from '@/features/play/sessionItems';

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
 * Keep the "Continue your game" card in step with a session the member is playing: progress is
 * copied locally (no refetch per answer); once the game is over the query is refetched.
 */
export function syncCurrentSession(session: PlaySession, answeredItemId?: number) {
  queryClient.setQueryData<CurrentSession>(queryKeys.currentSession, (prev) =>
    prev && prev.session.id === session.id
      ? isUnfinished(session.status)
        ? {
            session,
            items:
              answeredItemId === undefined ? prev.items : markAnswered(prev.items, answeredItemId),
          }
        : null
      : prev,
  );
  if (!isUnfinished(session.status)) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.currentSession });
  }
}

/** Write a server answer result into the cached session. */
export function applyAnswerResult(sessionId: number, itemId: number, result: AnswerResult) {
  queryClient.setQueryData<SessionPayload>(queryKeys.playSession(sessionId), (prev) =>
    prev
      ? {
          session: result.session,
          items: markAnswered(prev.items, itemId),
        }
      : prev,
  );
  syncCurrentSession(result.session, itemId);
  // Points changed: home stats, leaderboard and goal progress are now stale (inactive queries
  // are only marked stale, they refetch when their screen is shown again).
  if (result.points_awarded > 0) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.meStats });
    void queryClient.invalidateQueries({ queryKey: ['family', 'leaderboard'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
  }
}

function applySessionPayload(payload: SessionPayload) {
  queryClient.setQueryData<SessionPayload>(queryKeys.playSession(payload.session.id), (prev) => ({
    session: payload.session,
    items: mergeItems(prev?.items ?? [], payload.items),
  }));
  syncCurrentSession(payload.session);
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

/**
 * `GET /play/sessions/current`: the member's unfinished game, or `null`. A 404 (backend without
 * the endpoint yet) counts as "no current session".
 */
export function useCurrentSession() {
  return useQuery({
    queryKey: queryKeys.currentSession,
    queryFn: async ({ signal }): Promise<CurrentSession> => {
      try {
        const payload = (
          await api.get<Envelope<CurrentSession>>('/play/sessions/current', { signal })
        ).data;
        return payload && isUnfinished(payload.session.status) ? payload : null;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

/**
 * Seed the play-screen cache from the current-session payload before "Continue" opens it, so
 * the game shows at once (same merge as a refetch: locally known answers are kept).
 */
export function seedPlaySession(payload: SessionPayload) {
  queryClient.setQueryData<SessionPayload>(queryKeys.playSession(payload.session.id), (prev) => ({
    session: payload.session,
    items: mergeItems(prev?.items ?? [], payload.items),
  }));
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
      // Starting abandons older unfinished games on the server; the new one is now "current".
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentSession });
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

const AD_CLAIM_INTERVAL_MS = 2_000;
const AD_CLAIM_TIMEOUT_MS = 20_000;

/** Worth retrying while claiming an ad reward: AdMob's callback not in yet, or a blip. */
function isRetryableClaimError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return (
    error.code === 'ad_reward_pending' ||
    error.code === 'network_error' ||
    error.code === 'timeout' ||
    error.status >= 500
  );
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * `POST .../second-chance` with `method: "ad"`. The server only accepts the reward once AdMob's
 * SSV callback has arrived, so 409 `ad_reward_pending` is retried every 2 s for up to ~20 s.
 */
async function claimAdReward(sessionId: number, rewardRef: string): Promise<SessionPayload> {
  const deadline = Date.now() + AD_CLAIM_TIMEOUT_MS;
  for (;;) {
    try {
      const body: SecondChanceBody = { method: 'ad', reward_ref: rewardRef };
      return (
        await api.post<Envelope<SessionPayload>>(`/play/sessions/${sessionId}/second-chance`, body)
      ).data;
    } catch (error) {
      if (!isRetryableClaimError(error) || Date.now() + AD_CLAIM_INTERVAL_MS > deadline) {
        throw error;
      }
      await sleep(AD_CLAIM_INTERVAL_MS);
    }
  }
}

/** `loading`: fetching the video; `watching`: on screen; `checking`: confirming the reward. */
export type AdStage = 'loading' | 'watching' | 'checking';

/**
 * Second chance by rewarded ad (F6): new UUID v4 `reward_ref` → AdMob rewarded ad with SSV
 * `user_id` = member id and `custom_data` = `"<reward_ref>:<session_id>"` → claim with retries.
 * Resolves to `null` when the ad was closed before the reward. A reward that was earned but not
 * confirmed in time is kept, so "try again" re-checks it instead of showing another ad.
 */
export function useAdSecondChance(sessionId: number, memberId: number | undefined) {
  const [stage, setStage] = useState<AdStage | null>(null);
  const unclaimed = useRef<string | null>(null);
  const adRequest = usePolicy()?.ad_request;

  const mutation = useMutation({
    mutationFn: async (): Promise<SessionPayload | null> => {
      try {
        let rewardRef = unclaimed.current;
        if (!rewardRef) {
          if (memberId === undefined) throw new AdError('failed', 'no member');
          const ref = randomUUID();
          setStage('loading');
          const outcome = await rewardedAds.show({
            userId: String(memberId),
            customData: `${ref}:${sessionId}`,
            adRequest,
            onShowing: () => setStage('watching'),
          });
          if (outcome === 'dismissed') return null;
          unclaimed.current = ref;
          rewardRef = ref;
        }
        setStage('checking');
        try {
          const payload = await claimAdReward(sessionId, rewardRef);
          unclaimed.current = null;
          return payload;
        } catch (error) {
          // Keep the earned reward only while the server may still accept it.
          if (!isRetryableClaimError(error)) unclaimed.current = null;
          throw error;
        }
      } finally {
        setStage(null);
      }
    },
    onSuccess: (payload) => {
      if (payload) applySessionPayload(payload);
    },
  });

  return { mutation, stage };
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
      syncCurrentSession(session);
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentSession });
    },
  });
}
