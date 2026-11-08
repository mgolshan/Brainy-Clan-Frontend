import type { CodeBreakerPayload } from '@/api/types';
import { isAvatarKey } from '@/ui/avatars/keys';

/**
 * Pure Code Breaker rules (API.md "Level-up puzzles", standard Mastermind). The secret `code` is
 * in the payload (indices into `pegs`) and the app scores every guess itself:
 * `exact` = positions where guess and code agree; `near` = for each peg
 * min(count in guess, count in code), summed, minus `exact`. Solved when a guess equals the code
 * within `max_guesses`; the full guess list is submitted and the server verifies it.
 */

/** Generous bounds around the contract's 4–8 pegs, length 3–5 and 8–10 guesses. */
const MIN_PEGS = 2;
const MAX_PEGS = 10;
const MAX_LENGTH = 8;
const MAX_GUESSES = 20;

const isIndex = (v: unknown, size: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < size;

export function isCodeBreakerPayload(value: unknown): value is CodeBreakerPayload {
  const v = value as CodeBreakerPayload | null;
  if (typeof v !== 'object' || v === null) return false;
  const { pegs, length, repeats, max_guesses: maxGuesses, code } = v;
  if (!Array.isArray(pegs) || pegs.length < MIN_PEGS || pegs.length > MAX_PEGS) return false;
  if (!pegs.every(isAvatarKey) || new Set(pegs).size !== pegs.length) return false;
  if (!Number.isInteger(length) || length < 1 || length > MAX_LENGTH) return false;
  if (typeof repeats !== 'boolean') return false;
  if (!Number.isInteger(maxGuesses) || maxGuesses < 1 || maxGuesses > MAX_GUESSES) return false;
  if (!Array.isArray(code) || code.length !== length) return false;
  if (!code.every((i) => isIndex(i, pegs.length))) return false;
  if (!repeats && new Set(code).size !== code.length) return false;
  return true;
}

export interface Feedback {
  /** Right friend, right spot. */
  exact: number;
  /** Right friend, wrong spot. */
  near: number;
}

/** Feedback for one guess, exactly as the contract defines it. */
export function scoreGuess(guess: readonly number[], code: readonly number[]): Feedback {
  let exact = 0;
  const inGuess = new Map<number, number>();
  const inCode = new Map<number, number>();
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) exact++;
    inCode.set(code[i], (inCode.get(code[i]) ?? 0) + 1);
  }
  for (const g of guess) inGuess.set(g, (inGuess.get(g) ?? 0) + 1);
  let common = 0;
  for (const [peg, n] of inGuess) common += Math.min(n, inCode.get(peg) ?? 0);
  return { exact, near: common - exact };
}

export function isCodeGuess(guess: readonly number[], code: readonly number[]): boolean {
  return guess.length === code.length && guess.every((g, i) => g === code[i]);
}

export type GameStatus = 'playing' | 'solved' | 'out';

/** Where a list of guesses stands. */
export function gameStatus(payload: CodeBreakerPayload, guesses: readonly number[][]): GameStatus {
  if (guesses.some((g) => isCodeGuess(g, payload.code))) return 'solved';
  return guesses.length >= payload.max_guesses ? 'out' : 'playing';
}

/** Mirrors the server's 422 checks: right length, in range, not too many, none after the win. */
export function areValidGuesses(payload: CodeBreakerPayload, guesses: readonly number[][]) {
  if (guesses.length > payload.max_guesses) return false;
  const win = guesses.findIndex((g) => isCodeGuess(g, payload.code));
  if (win >= 0 && win !== guesses.length - 1) return false;
  return guesses.every(
    (g) =>
      Array.isArray(g) &&
      g.length === payload.length &&
      g.every((i) => isIndex(i, payload.pegs.length)),
  );
}

// ---------------------------------------------------------------------------
// Building a guess
// ---------------------------------------------------------------------------

export interface CodeBreakerDraft {
  guesses: number[][];
  /** The guess being built: a peg index per slot, or null. */
  current: (number | null)[];
}

export function emptyCurrent(length: number): (number | null)[] {
  return new Array<number | null>(length).fill(null);
}

export function isCodeBreakerDraft(
  value: unknown,
  payload: CodeBreakerPayload,
): value is CodeBreakerDraft {
  const d = value as CodeBreakerDraft | null;
  if (typeof d !== 'object' || d === null) return false;
  if (!Array.isArray(d.guesses) || !Array.isArray(d.current)) return false;
  if (d.current.length !== payload.length) return false;
  if (!d.current.every((p) => p === null || isIndex(p, payload.pegs.length))) return false;
  return areValidGuesses(payload, d.guesses);
}

/**
 * Puts a peg into the guess: on `slot` when given, else the first empty slot (nothing happens
 * when the guess is full and no slot is chosen).
 */
export function putPeg(
  current: readonly (number | null)[],
  peg: number,
  slot: number | null,
): (number | null)[] {
  const next = [...current];
  const at = slot ?? next.findIndex((p) => p === null);
  if (at < 0 || at >= next.length) return next;
  next[at] = peg;
  return next;
}

/** Empties one slot. */
export function clearPeg(current: readonly (number | null)[], slot: number): (number | null)[] {
  const next = [...current];
  if (slot >= 0 && slot < next.length) next[slot] = null;
  return next;
}

/** Removes the last filled slot (Backspace). */
export function removeLast(current: readonly (number | null)[]): (number | null)[] {
  const next = [...current];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i] !== null) {
      next[i] = null;
      break;
    }
  }
  return next;
}

/** The next empty slot after `from` (wrapping), else null when the guess is full. */
export function nextEmptySlot(current: readonly (number | null)[], from: number): number | null {
  for (let k = 1; k <= current.length; k++) {
    const i = (from + k) % current.length;
    if (current[i] === null) return i;
  }
  return null;
}

export function isComplete(current: readonly (number | null)[]): current is number[] {
  return current.every((p) => p !== null);
}

/** `{ guesses }` (response) as a list, else null. */
export function readGuesses(value: unknown): number[][] | null {
  const guesses =
    typeof value === 'object' && value !== null && 'guesses' in value
      ? (value as { guesses: unknown }).guesses
      : null;
  if (!Array.isArray(guesses)) return null;
  if (!guesses.every((g) => Array.isArray(g) && g.every((i) => Number.isInteger(i)))) return null;
  return guesses.map((g) => [...(g as number[])]);
}

/** `correct_response.code`, else null. */
export function readCode(value: unknown, length: number): number[] | null {
  const code =
    typeof value === 'object' && value !== null && 'code' in value
      ? (value as { code: unknown }).code
      : null;
  if (!Array.isArray(code) || code.length !== length) return null;
  return code.every((i) => Number.isInteger(i)) ? [...(code as number[])] : null;
}
