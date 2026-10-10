import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ApiError } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type { AnswerBody, AnswerResult } from '@/api/types';
import { applyAnswerResult, postAnswer } from '@/features/play/api';

/**
 * Offline answer queue.
 *
 * The server is the referee, so an answer needs the API to be scored. When submitting fails for
 * network reasons the answer is kept here (persisted in AsyncStorage, so it survives an app
 * restart) and re-sent when the connection or the app comes back. Listeners (the play screen)
 * receive each flushed result to show the feedback that was waiting.
 */

export interface QueuedAnswer {
  sessionId: number;
  body: AnswerBody;
  queuedAt: number;
}

interface AnswerQueueState {
  items: QueuedAnswer[];
  enqueue: (answer: QueuedAnswer) => void;
  remove: (sessionId: number, itemId: number) => void;
  clear: () => void;
}

export const useAnswerQueue = create<AnswerQueueState>()(
  persist(
    (set) => ({
      items: [],
      enqueue: (answer) =>
        set((s) => ({
          items: [
            ...s.items.filter(
              (q) =>
                !(
                  q.sessionId === answer.sessionId &&
                  q.body.session_item_id === answer.body.session_item_id
                ),
            ),
            answer,
          ],
        })),
      remove: (sessionId, itemId) =>
        set((s) => ({
          items: s.items.filter(
            (q) => !(q.sessionId === sessionId && q.body.session_item_id === itemId),
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'brainyclan.answer-queue',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export type FlushEvent =
  | { kind: 'scored'; answer: QueuedAnswer; result: AnswerResult }
  | { kind: 'dropped'; answer: QueuedAnswer; error: ApiError };

type Listener = (event: FlushEvent) => void;
const listeners = new Set<Listener>();

export function subscribeToFlush(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let flushing: Promise<void> | null = null;

/** Send queued answers in order. Stops at the first network failure (still offline). */
export function flushAnswerQueue(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const queue = [...useAnswerQueue.getState().items];
    for (const answer of queue) {
      try {
        const result = await postAnswer(answer.sessionId, answer.body);
        useAnswerQueue.getState().remove(answer.sessionId, answer.body.session_item_id);
        applyAnswerResult(answer.sessionId, answer.body.session_item_id, result);
        listeners.forEach((l) => l({ kind: 'scored', answer, result }));
      } catch (error) {
        if (error instanceof ApiError && error.isNetworkError) break;
        // Already answered (409), session closed, validation... — the server state wins.
        useAnswerQueue.getState().remove(answer.sessionId, answer.body.session_item_id);
        void queryClient.invalidateQueries({ queryKey: queryKeys.playSession(answer.sessionId) });
        if (error instanceof ApiError)
          listeners.forEach((l) => l({ kind: 'dropped', answer, error }));
      }
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Flush on start, when the device comes back online, and when the app returns to the foreground. */
export function useAnswerQueueSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void flushAnswerQueue();
    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) void flushAnswerQueue();
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') void flushAnswerQueue();
    });
    return () => {
      unsubscribeOnline();
      appState.remove();
    };
  }, [enabled]);
}
