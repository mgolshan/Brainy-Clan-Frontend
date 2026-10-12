import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * In-progress work on a challenge (a half-filled Sudoku, the words found so far), kept per
 * session item and persisted on the device, so it survives re-renders, the app being
 * backgrounded or killed, and coming back to the session later. Drafts are dropped once the
 * item is scored, on sign-out, and after a few days.
 */

const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

interface Draft {
  value: unknown;
  updatedAt: number;
}

interface DraftState {
  drafts: Record<string, Draft>;
  set: (key: string, value: unknown) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export const useChallengeDrafts = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      set: (key, value) =>
        set((s) => ({ drafts: { ...s.drafts, [key]: { value, updatedAt: Date.now() } } })),
      remove: (key) =>
        set((s) => {
          if (!(key in s.drafts)) return s;
          const drafts = { ...s.drafts };
          delete drafts[key];
          return { drafts };
        }),
      clear: () => set({ drafts: {} }),
    }),
    {
      name: 'brainyclan.challenge-drafts',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ drafts: s.drafts }),
      // Forget stale drafts (items answered elsewhere, abandoned sessions).
      merge: (persisted, current) => {
        const stored = (persisted as Partial<DraftState> | undefined)?.drafts ?? {};
        const now = Date.now();
        const drafts: Record<string, Draft> = {};
        for (const [key, draft] of Object.entries(stored)) {
          if (draft && now - draft.updatedAt < MAX_AGE_MS) drafts[key] = draft;
        }
        return { ...current, drafts: { ...drafts, ...current.drafts } };
      },
    },
  ),
);

/**
 * Draft state for one challenge item. `isValid` guards against a stored value of another shape
 * (e.g. after an app update); invalid or missing drafts fall back to `initial`.
 */
export function useChallengeDraft<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const stored = useChallengeDrafts((s) => s.drafts[key]?.value);
  const value = isValid(stored) ? stored : initial;

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = useChallengeDrafts.getState().drafts[key]?.value;
      const prev = isValid(current) ? current : initial;
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      useChallengeDrafts.getState().set(key, resolved);
    },
    [key, initial, isValid],
  );
  const clear = useCallback(() => useChallengeDrafts.getState().remove(key), [key]);
  return [value, update, clear];
}

/** Draft key for a session item (items ids are unique across sessions). */
export function draftKey(type: string, itemId: number): string {
  return `${type}:${itemId}`;
}
