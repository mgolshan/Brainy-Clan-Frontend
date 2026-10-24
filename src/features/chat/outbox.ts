import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ApiError } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type { ChatMessage } from '@/api/types';
import { postChatMessage } from '@/features/chat/api';
import {
  insertMessages,
  prepareBody,
  type ChatHistory,
  type OutboxItem,
  type OutboxStatus,
} from '@/features/chat/messages';

/**
 * Chat outbox: every message goes through here (optimistic send). It is persisted per member in
 * AsyncStorage, so a message typed offline survives an app restart and is sent when the
 * connection or the app comes back — with the same `client_id`, so the server never stores it
 * twice. Cleared on sign-out (`app/_layout.tsx`). Same pattern as the play answer queue.
 */

interface ChatOutboxState {
  items: OutboxItem[];
  add: (item: OutboxItem) => void;
  setStatus: (clientId: string, status: OutboxStatus, errorCode?: string | null) => void;
  remove: (clientId: string) => void;
  clear: () => void;
}

export const useChatOutbox = create<ChatOutboxState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => ({ items: [...s.items.filter((q) => q.clientId !== item.clientId), item] })),
      setStatus: (clientId, status, errorCode = null) =>
        set((s) => ({
          items: s.items.map((q) => (q.clientId === clientId ? { ...q, status, errorCode } : q)),
        })),
      remove: (clientId) => set((s) => ({ items: s.items.filter((q) => q.clientId !== clientId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'brainyclan.chat-outbox',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
      // A send interrupted by closing the app is simply waiting to be re-sent.
      merge: (persisted, current) => {
        const items = (persisted as { items?: OutboxItem[] } | undefined)?.items ?? [];
        return {
          ...current,
          items: items.map((q) => (q.status === 'sending' ? { ...q, status: 'waiting' } : q)),
        };
      },
    },
  ),
);

/** Adds a sent message to the cached history (deduped by id and `client_id`). */
function addToHistory(message: ChatMessage) {
  queryClient.setQueryData<ChatHistory>(queryKeys.chatMessages, (prev) =>
    insertMessages(prev, [message]),
  );
}

const flushing = new Map<number, Promise<void>>();

/**
 * Sends the member's waiting messages in order. Stops at the first network failure (still
 * offline: they stay `waiting`). A refusal marks that message `failed` (the member can retry
 * or discard it); `chat_disabled` / `rate_limited` stop the run.
 */
export function flushChatOutbox(memberId: number): Promise<void> {
  const running = flushing.get(memberId);
  if (running) return running;
  const run = (async () => {
    const attempted = new Set<string>();
    for (;;) {
      const next = useChatOutbox
        .getState()
        .items.find(
          (q) => q.memberId === memberId && q.status !== 'failed' && !attempted.has(q.clientId),
        );
      if (!next) return;
      attempted.add(next.clientId);
      const { setStatus, remove } = useChatOutbox.getState();
      setStatus(next.clientId, 'sending');
      try {
        const message = await postChatMessage({ body: next.body, client_id: next.clientId });
        addToHistory(message);
        remove(next.clientId);
      } catch (error) {
        if (error instanceof ApiError && error.isNetworkError) {
          setStatus(next.clientId, 'waiting');
          return;
        }
        const code = error instanceof ApiError ? error.code : 'unknown';
        setStatus(next.clientId, 'failed', code);
        if (code === 'chat_disabled') {
          // The member's chat was turned off: refresh `me` so the screen explains it.
          void queryClient.invalidateQueries({ queryKey: queryKeys.me });
          return;
        }
        if (code === 'rate_limited') return;
      }
    }
  })().finally(() => {
    flushing.delete(memberId);
  });
  flushing.set(memberId, run);
  return run;
}

/**
 * Queues a message and starts sending it. Returns the `client_id`, or `null` when the text
 * can't be sent (empty / too long).
 */
export function sendChatMessage(memberId: number, text: string): string | null {
  const body = prepareBody(text);
  if (body === null) return null;
  const clientId = randomUUID();
  useChatOutbox.getState().add({
    memberId,
    clientId,
    body,
    createdAt: new Date().toISOString(),
    status: 'waiting',
  });
  void flushChatOutbox(memberId);
  return clientId;
}

/** Re-sends a failed message with its original `client_id`. */
export function retryChatMessage(memberId: number, clientId: string): void {
  useChatOutbox.getState().setStatus(clientId, 'waiting');
  void flushChatOutbox(memberId);
}

/** Drops an unsent message (never reached the server). */
export function discardChatMessage(clientId: string): void {
  useChatOutbox.getState().remove(clientId);
}

/** Sends waiting messages on start, when the device is back online and when the app returns. */
export function useChatOutboxSync(memberId: number | null) {
  useEffect(() => {
    if (memberId === null) return;
    const flush = () => void flushChatOutbox(memberId);
    flush();
    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) flush();
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') flush();
    });
    // The persisted outbox may load after the first flush.
    const unsubscribeHydrate = useChatOutbox.persist.onFinishHydration(flush);
    return () => {
      unsubscribeOnline();
      appState.remove();
      unsubscribeHydrate();
    };
  }, [memberId]);
}
