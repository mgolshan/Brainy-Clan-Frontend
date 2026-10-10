import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '@/api/client';
import type { AnswerResult, SecondChanceMethod, SessionItem } from '@/api/types';
import { getChallenge, isPlayable } from '@/challenges/registry';
import {
  applyAnswerResult,
  postAnswer,
  useAbandonSession,
  usePlaySessionQuery,
  useRedemption,
  useSecondChance,
} from '@/features/play/api';
import { flushAnswerQueue, subscribeToFlush, useAnswerQueue } from '@/features/play/answerQueue';

/** Placeholder reward id until AdMob arrives (F6); the server verifies real ones in B8. */
export const PLACEHOLDER_AD_REWARD = 'dev-placeholder-reward';

export interface AnswerFeedback {
  itemId: number;
  response: unknown;
  result: AnswerResult;
  correctText: string | null;
}

/**
 * What the play screen should show:
 * - `question`: render `currentItem`
 * - `feedback`: the last answer's verdict (`feedback`)
 * - `waitingOffline`: answer queued, will be scored when back online
 * - `completed` / `failed` / `abandoned`: end states
 * - `outOfItems`: active but no playable item left (unknown types skipped) → refresh or leave
 */
export type PlayPhase =
  | 'loading'
  | 'error'
  | 'question'
  | 'feedback'
  | 'waitingOffline'
  | 'completed'
  | 'failed'
  | 'abandoned'
  | 'outOfItems';

function describeCorrect(item: SessionItem | undefined, correct: unknown): string | null {
  if (!item) return null;
  const def = getChallenge(item.type);
  return def && def.isValidPayload(item.payload)
    ? def.describeCorrect(item.payload, correct)
    : null;
}

/**
 * Session logic for one play session, kept out of components: current item selection (unknown
 * challenge types skipped), answer submission with offline queueing, feedback, second chances,
 * redemption round and abandon.
 */
export function usePlaySession(sessionId: number) {
  const query = usePlaySessionQuery(sessionId);
  const secondChance = useSecondChance(sessionId);
  const redemption = useRedemption(sessionId);
  const abandon = useAbandonSession(sessionId);

  const [pending, setPending] = useState<{ itemId: number; response: unknown } | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const shownAt = useRef<{ itemId: number; at: number } | null>(null);

  const allQueued = useAnswerQueue((s) => s.items);
  const queued = useMemo(
    () => allQueued.filter((q) => q.sessionId === sessionId),
    [allQueued, sessionId],
  );
  const session = query.data?.session;
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  const inRedemption = session?.status === 'redemption';
  const queuedIds = useMemo(() => new Set(queued.map((q) => q.body.session_item_id)), [queued]);

  /** Items for the current phase (normal vs redemption round), playable ones only. */
  const phaseItems = useMemo(
    () => items.filter((it) => it.is_redemption === inRedemption && isPlayable(it)),
    [items, inRedemption],
  );
  const skippedCount = useMemo(
    () => items.filter((it) => it.is_redemption === inRedemption && !isPlayable(it)).length,
    [items, inRedemption],
  );

  const currentItem = useMemo(() => {
    if (feedback) return items.find((it) => it.id === feedback.itemId);
    return phaseItems.find((it) => !it.answered && !queuedIds.has(it.id));
  }, [feedback, items, phaseItems, queuedIds]);

  // Measure time_ms from when an item is first shown.
  useEffect(() => {
    if (currentItem && shownAt.current?.itemId !== currentItem.id) {
      shownAt.current = { itemId: currentItem.id, at: Date.now() };
    }
  }, [currentItem]);

  // Results for answers that were queued offline arrive here once flushed.
  useEffect(
    () =>
      subscribeToFlush((event) => {
        if (event.answer.sessionId !== sessionId) return;
        setPending((p) => (p?.itemId === event.answer.body.session_item_id ? null : p));
        if (event.kind === 'scored') {
          const item = items.find((it) => it.id === event.answer.body.session_item_id);
          setFeedback({
            itemId: event.answer.body.session_item_id,
            response: event.answer.body.response,
            result: event.result,
            correctText: describeCorrect(item, event.result.correct_response),
          });
        }
      }),
    [sessionId, items],
  );

  const submit = useCallback(
    async (response: unknown) => {
      if (!currentItem || pending || feedback) return;
      const itemId = currentItem.id;
      const timeMs = shownAt.current?.itemId === itemId ? Date.now() - shownAt.current.at : 0;
      const body = { session_item_id: itemId, response, time_ms: Math.max(0, timeMs) };
      setPending({ itemId, response });
      setSubmitError(null);
      try {
        const result = await postAnswer(sessionId, body);
        applyAnswerResult(sessionId, itemId, result);
        setFeedback({
          itemId,
          response,
          result,
          correctText: describeCorrect(currentItem, result.correct_response),
        });
        setPending(null);
      } catch (error) {
        if (error instanceof ApiError && error.isNetworkError) {
          // Keep `pending` so the screen shows "waiting for connection".
          useAnswerQueue.getState().enqueue({ sessionId, body, queuedAt: Date.now() });
          return;
        }
        setPending(null);
        if (error instanceof ApiError) {
          setSubmitError(error);
          if (error.status === 409) void query.refetch();
        }
      }
    },
    [currentItem, pending, feedback, sessionId, query],
  );

  const next = useCallback(() => setFeedback(null), []);

  const retryQueued = useCallback(() => void flushAnswerQueue(), []);

  const takeSecondChance = useCallback(
    (method: SecondChanceMethod) =>
      secondChance.mutateAsync(
        method === 'ad' ? { method, reward_ref: PLACEHOLDER_AD_REWARD } : { method },
      ),
    [secondChance],
  );

  let phase: PlayPhase;
  if (query.isPending) phase = 'loading';
  else if (!session) phase = 'error';
  else if (feedback) phase = 'feedback';
  else if (pending && queuedIds.has(pending.itemId)) phase = 'waitingOffline';
  else if (session.status === 'completed') phase = 'completed';
  else if (session.status === 'failed') phase = 'failed';
  else if (session.status === 'abandoned') phase = 'abandoned';
  else if (currentItem) phase = 'question';
  else phase = 'outOfItems';

  const redemptionItems = items.filter((it) => it.is_redemption);
  const redemptionProgress = {
    answered: redemptionItems.filter((it) => it.answered).length,
    total: redemptionItems.length,
  };

  return {
    query,
    session,
    phase,
    currentItem,
    pending,
    feedback,
    submitError,
    skippedCount,
    inRedemption,
    redemptionProgress,
    submit,
    next,
    retryQueued,
    secondChance: takeSecondChance,
    secondChanceState: secondChance,
    startRedemption: redemption.mutateAsync,
    redemptionState: redemption,
    abandon: abandon.mutateAsync,
    abandonState: abandon,
  };
}
