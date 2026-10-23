import AsyncStorage from '@react-native-async-storage/async-storage';

import type { World } from '@/features/worlds/catalog';

/**
 * What this device last saw of a member's worlds, to celebrate "New world unlocked!" once.
 * UI convenience only (AsyncStorage, per member id); the server decides what is unlocked.
 * - `locked`: worlds locked at the last look.
 * - `pending`: worlds that flipped locked → unlocked and still wait for their celebration.
 * - `celebrated`: worlds already celebrated (never again, even if a plan ends and restarts).
 */
export interface WorldSeenState {
  locked: string[];
  pending: string[];
  celebrated: string[];
}

const uniq = (keys: string[]) => [...new Set(keys)];

/**
 * Folds a fresh catalog into the seen state. The first look (no state yet) only records what is
 * locked — nothing is celebrated, so free worlds and old unlocks never pop up.
 */
export function nextSeenState(
  prev: WorldSeenState | null,
  worlds: readonly World[],
): WorldSeenState {
  const locked = worlds.filter((w) => !w.unlocked).map((w) => w.key);
  if (!prev) return { locked, pending: [], celebrated: [] };
  const unlocked = new Set<string>(worlds.filter((w) => w.unlocked).map((w) => w.key));
  const celebrated = new Set(prev.celebrated);
  const flipped = prev.locked.filter((k) => unlocked.has(k) && !celebrated.has(k));
  // Catalog order, and only worlds that are still unlocked now.
  const wanted = new Set([...prev.pending, ...flipped]);
  const pending = worlds.filter((w) => w.unlocked && wanted.has(w.key)).map((w) => w.key);
  return { locked, pending, celebrated: prev.celebrated };
}

/** The member saw (or dismissed) the celebration for `key`. */
export function markCelebrated(state: WorldSeenState, key: string): WorldSeenState {
  return {
    ...state,
    pending: state.pending.filter((k) => k !== key),
    celebrated: uniq([...state.celebrated, key]),
  };
}

export function sameSeenState(a: WorldSeenState | null, b: WorldSeenState): boolean {
  return (
    !!a &&
    a.locked.join() === b.locked.join() &&
    a.pending.join() === b.pending.join() &&
    a.celebrated.join() === b.celebrated.join()
  );
}

export const seenStorageKey = (memberId: number) => `brainy-clan.worlds-seen.v1.${memberId}`;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

/** Validates stored JSON; anything malformed counts as "never looked" (null). */
export function parseSeenState(raw: string | null): WorldSeenState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { locked, pending, celebrated } = value as Record<string, unknown>;
    if (!isStringArray(locked) || !isStringArray(pending) || !isStringArray(celebrated)) {
      return null;
    }
    return { locked, pending, celebrated };
  } catch {
    return null;
  }
}

/** Never throws (storage can be unavailable, e.g. private browsing): null = nothing stored. */
export async function loadSeenState(memberId: number): Promise<WorldSeenState | null> {
  try {
    return parseSeenState(await AsyncStorage.getItem(seenStorageKey(memberId)));
  } catch {
    return null;
  }
}

/** Never throws; a lost write only means a celebration may show again or not at all. */
export async function saveSeenState(memberId: number, state: WorldSeenState): Promise<void> {
  try {
    await AsyncStorage.setItem(seenStorageKey(memberId), JSON.stringify(state));
  } catch {
    // UI convenience only.
  }
}
