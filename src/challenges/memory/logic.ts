import type { MemoryMatchPayload, MemoryMatchResponse } from '@/api/types';
import { isAvatarKey } from '@/ui/avatars/keys';

/**
 * Pure Memory Match rules, mirroring the server (API.md "Brain games"): an attempt is two
 * different positions that are in range and not matched yet; it matches when both faces are the
 * same. The game is won when every pair is matched within `max_attempts`. Positions are
 * zero-based, row-major.
 */

/** Generous bounds around the contract's 3–10 pairs (the grid must still fit a phone). */
const MIN_PAIRS = 2;
const MAX_PAIRS = 12;
const MAX_COLS = 6;

export type Attempt = [number, number];

export function isMemoryMatchPayload(value: unknown): value is MemoryMatchPayload {
  const v = value as MemoryMatchPayload | null;
  if (typeof v !== 'object' || v === null) return false;
  const { cols, cards, max_attempts } = v;
  if (!Number.isInteger(cols) || cols < 2 || cols > MAX_COLS) return false;
  if (!Array.isArray(cards) || cards.length % 2 !== 0) return false;
  const pairs = cards.length / 2;
  if (pairs < MIN_PAIRS || pairs > MAX_PAIRS) return false;
  if (!Number.isInteger(max_attempts) || max_attempts < pairs) return false;
  // Every face is drawable (a Clan avatar key) and appears exactly twice.
  const counts = new Map<string, number>();
  for (const card of cards) {
    if (!isAvatarKey(card)) return false;
    counts.set(card, (counts.get(card) ?? 0) + 1);
  }
  return [...counts.values()].every((n) => n === 2);
}

export type AttemptCheck = 'match' | 'miss' | 'invalid';

/** One attempt against the current matched set (invalid = the server would answer 422). */
export function checkAttempt(
  cards: readonly string[],
  matched: readonly boolean[],
  attempt: readonly number[],
): AttemptCheck {
  if (!Array.isArray(attempt) || attempt.length !== 2) return 'invalid';
  const [a, b] = attempt;
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < cards.length;
  if (!inRange(a) || !inRange(b) || a === b || matched[a] || matched[b]) return 'invalid';
  return cards[a] === cards[b] ? 'match' : 'miss';
}

export interface MemoryReplay {
  /** Per position: matched so far. */
  matched: boolean[];
  pairsFound: number;
  totalPairs: number;
  attemptsUsed: number;
  /** Every attempt was well-formed (else the server answers 422). */
  valid: boolean;
  /** Every pair matched. */
  complete: boolean;
  /** What the server would say: complete within `max_attempts` (and valid). */
  correct: boolean;
  /** Play is over: complete, out of attempts, or a malformed attempt. */
  finished: boolean;
}

/** Replays a list of attempts like the server does. Stops at the first malformed attempt. */
export function replayAttempts(
  payload: Pick<MemoryMatchPayload, 'cards' | 'max_attempts'>,
  attempts: readonly (readonly number[])[],
): MemoryReplay {
  const { cards, max_attempts } = payload;
  const matched = new Array<boolean>(cards.length).fill(false);
  const totalPairs = cards.length / 2;
  let pairsFound = 0;
  let valid = true;
  for (const attempt of attempts) {
    const check = checkAttempt(cards, matched, attempt);
    if (check === 'invalid') {
      valid = false;
      break;
    }
    if (check === 'match') {
      matched[attempt[0]] = true;
      matched[attempt[1]] = true;
      pairsFound++;
    }
  }
  const attemptsUsed = attempts.length;
  const complete = pairsFound === totalPairs;
  const correct = valid && complete && attemptsUsed <= max_attempts;
  return {
    matched,
    pairsFound,
    totalPairs,
    attemptsUsed,
    valid,
    complete,
    correct,
    finished: !valid || complete || attemptsUsed >= max_attempts,
  };
}

/** A stored or submitted `{ attempts }` (drafts, `result.submitted`), else null. */
export function readAttempts(value: unknown): Attempt[] | null {
  const v = value as MemoryMatchResponse | null;
  if (typeof v !== 'object' || v === null || !Array.isArray(v.attempts)) return null;
  const ok = v.attempts.every(
    (a) => Array.isArray(a) && a.length === 2 && a.every((n) => Number.isInteger(n) && n >= 0),
  );
  return ok ? v.attempts.map((a) => [a[0], a[1]] as Attempt) : null;
}

/** Rows of the grid (the last row may be partial). */
export function gridRows(cardCount: number, cols: number): number {
  return Math.ceil(cardCount / cols);
}
