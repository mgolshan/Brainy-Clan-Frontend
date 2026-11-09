import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SendSupportMessageBody, SupportMessage, SupportTopic } from '@/api/types';
import { postSupportMessage } from '@/features/support/api';
import { messageProblem } from '@/features/support/model';

/**
 * The "Contact support" draft: topic, text and the `client_id` of the last send attempt. It is
 * persisted (AsyncStorage) so the text survives leaving the screen or closing the app, and so a
 * retry after a network error re-uses the same `client_id` (the server then answers with the
 * message it may already have stored instead of creating a second one). Owned by one user;
 * cleared on sign-out (`app/_layout.tsx`) and after a successful send.
 */

export interface SendAttempt {
  clientId: string;
  topic: SupportTopic;
  /** Trimmed text that was sent with this `client_id`. */
  message: string;
}

interface SupportDraftState {
  /** User the draft belongs to (another account on this device starts empty). */
  userId: number | null;
  topic: SupportTopic | null;
  message: string;
  attempt: SendAttempt | null;
  claim: (userId: number) => void;
  setTopic: (topic: SupportTopic) => void;
  setMessage: (message: string) => void;
  setAttempt: (attempt: SendAttempt) => void;
  clear: () => void;
}

const EMPTY = { topic: null, message: '', attempt: null } as const;

export const useSupportDraft = create<SupportDraftState>()(
  persist(
    (set, get) => ({
      userId: null,
      ...EMPTY,
      claim: (userId) => {
        if (get().userId !== userId) set({ userId, ...EMPTY });
      },
      setTopic: (topic) => set({ topic }),
      setMessage: (message) => set({ message }),
      setAttempt: (attempt) => set({ attempt }),
      clear: () => set({ ...EMPTY }),
    }),
    {
      name: 'brainyclan.support-draft',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        userId: s.userId,
        topic: s.topic,
        message: s.message,
        attempt: s.attempt,
      }),
    },
  ),
);

/** Forgets the draft entirely (sign-out, account deletion). */
export function clearSupportDraft() {
  useSupportDraft.setState({ userId: null, ...EMPTY });
}

/**
 * The attempt to send `topic` + `message` with: the previous one (same `client_id`) when nothing
 * changed since it, otherwise a new `client_id`. Editing the text after a failed attempt makes
 * a new message: re-using the id would return the old text if the first attempt did arrive.
 */
export function attemptFor(
  previous: SendAttempt | null,
  topic: SupportTopic,
  message: string,
  newId: () => string = randomUUID,
): SendAttempt {
  if (previous && previous.topic === topic && previous.message === message) return previous;
  return { clientId: newId(), topic, message };
}

/** Context sent with every message (shown under "Sent with your message"). */
export type SupportContext = Pick<SendSupportMessageBody, 'app_version' | 'platform' | 'device'>;

/** Thrown when the draft has no topic or an invalid text (the Send button is disabled then). */
export class InvalidDraftError extends Error {}

/**
 * Sends the current draft. The attempt (with its `client_id`) is saved before the request, so a
 * network failure keeps it for the retry; success clears the draft.
 */
export async function sendSupportDraft(context: SupportContext): Promise<SupportMessage> {
  const state = useSupportDraft.getState();
  const message = state.message.trim();
  if (!state.topic || messageProblem(message) !== null) throw new InvalidDraftError();
  const attempt = attemptFor(state.attempt, state.topic, message);
  state.setAttempt(attempt);
  const saved = await postSupportMessage({
    topic: attempt.topic,
    message: attempt.message,
    client_id: attempt.clientId,
    app_version: context.app_version,
    platform: context.platform,
    ...(context.device ? { device: context.device } : {}),
  });
  useSupportDraft.getState().clear();
  return saved;
}

/** `true` once the persisted draft is loaded (typing before that would be overwritten). */
export function useSupportDraftHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => useSupportDraft.persist.hasHydrated(),
    () => false,
  );
}

function subscribeHydration(onChange: () => void): () => void {
  return useSupportDraft.persist.onFinishHydration(onChange);
}
