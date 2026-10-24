import type { PatternSequencePayload, PatternSequenceResponse } from '@/api/types';
import { isAvatarKey } from '@/ui/avatars/keys';

/**
 * Pure Pattern Sequence rules (API.md "Brain games"): the app plays `sequence` (pad indexes) once,
 * then the member repeats it; a wrong tap ends the round. Correct when `input` equals `sequence`.
 */

/** Generous bounds around the contract's 3–6 pads and length 3–9. */
const MIN_PADS = 2;
const MAX_PADS = 8;
const MAX_LENGTH = 20;

/** Step durations are clamped to something watchable whatever the payload says. */
const MIN_SHOW_MS = 250;
const MAX_SHOW_MS = 4000;
/** `calm_timers` members get a slower playback. */
export const CALM_FACTOR = 1.5;

export function isPatternSequencePayload(value: unknown): value is PatternSequencePayload {
  const v = value as PatternSequencePayload | null;
  if (typeof v !== 'object' || v === null) return false;
  const { pads, sequence, show_ms } = v;
  if (!Array.isArray(pads) || pads.length < MIN_PADS || pads.length > MAX_PADS) return false;
  if (!pads.every(isAvatarKey)) return false;
  if (!Array.isArray(sequence) || sequence.length < 1 || sequence.length > MAX_LENGTH) return false;
  if (!sequence.every((i) => Number.isInteger(i) && i >= 0 && i < pads.length)) return false;
  return typeof show_ms === 'number' && Number.isFinite(show_ms) && show_ms > 0;
}

export type InputStatus = 'playing' | 'wrong' | 'complete';

export interface InputStep {
  input: number[];
  status: InputStatus;
}

/** Where a given input stands: still going, a wrong tap (round over), or the whole sequence. */
export function inputStatus(sequence: readonly number[], input: readonly number[]): InputStatus {
  for (let i = 0; i < input.length; i++) {
    if (i >= sequence.length || input[i] !== sequence[i]) return 'wrong';
  }
  return input.length === sequence.length ? 'complete' : 'playing';
}

/** One tap: appends the pad unless the round is already over. */
export function tapPad(
  sequence: readonly number[],
  input: readonly number[],
  pad: number,
): InputStep {
  const current = inputStatus(sequence, input);
  if (current !== 'playing') return { input: [...input], status: current };
  const next = [...input, pad];
  return { input: next, status: inputStatus(sequence, next) };
}

export interface PlaybackTiming {
  /** How long each pad stays lit. */
  onMs: number;
  /** Dark pause between two steps (so a repeated pad blinks twice). */
  gapMs: number;
}

/** Playback timing from `show_ms`, slower (×1.5) with calm timers. */
export function playbackTiming(showMs: number, calmTimers: boolean): PlaybackTiming {
  const base = Math.min(MAX_SHOW_MS, Math.max(MIN_SHOW_MS, showMs));
  const onMs = Math.round(base * (calmTimers ? CALM_FACTOR : 1));
  return { onMs, gapMs: Math.max(150, Math.round(onMs * 0.35)) };
}

/** Major pentatonic steps (G A C D E G A C): any pads sound pleasant together; rates 0.75–2. */
const SEMITONES = [-5, -3, 0, 2, 4, 7, 9, 12];

/** Playback rate for a pad's tone (the world's `tap` sound shifted up like a note). */
export function padToneRate(index: number): number {
  const semis = SEMITONES[Math.max(0, index) % SEMITONES.length];
  return Math.round(2 ** (semis / 12) * 1000) / 1000;
}

/** A submitted `{ input }`, else null. */
export function readInput(value: unknown): number[] | null {
  const v = value as PatternSequenceResponse | null;
  if (typeof v !== 'object' || v === null || !Array.isArray(v.input)) return null;
  return v.input.every((n) => Number.isInteger(n)) ? [...v.input] : null;
}

/** Grid columns for the pads: 2×2 up to four pads, then three (or four) per row. */
export function padColumns(count: number): number {
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}
