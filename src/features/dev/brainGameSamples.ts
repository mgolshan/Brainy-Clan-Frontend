import type { MemoryMatchPayload, PatternSequencePayload, SessionItem } from '@/api/types';
import { readAttempts, replayAttempts } from '@/challenges/memory/logic';
import { readInput } from '@/challenges/pattern/logic';
import { PUZZLE_SAMPLES } from '@/features/dev/puzzleSamples';

/**
 * Sample brain-game items for the dev preview (`/dev/games`), each with a local stand-in for the
 * server's verdict (same rules as API.md "Brain games"), so the games can be tried without a
 * backend. Negative ids keep their drafts apart from real session items. Add more games by
 * appending to `BRAIN_GAME_SAMPLES`.
 */

export interface BrainGameSample {
  /** Short label for the picker. */
  label: string;
  item: SessionItem;
  score: (response: unknown) => { isCorrect: boolean; correctResponse: unknown };
}

function item<P>(id: number, type: string, points: number, payload: P): SessionItem {
  return { id, position: -id, type, is_redemption: false, answered: false, points, payload };
}

function memorySample(id: number, label: string, payload: MemoryMatchPayload): BrainGameSample {
  return {
    label,
    item: item(id, 'memory_match', payload.cards.length / 2 <= 6 ? 2 : 3, payload),
    score: (response) => ({
      isCorrect: replayAttempts(payload, readAttempts(response) ?? []).correct,
      correctResponse: { attempts: null, cards: payload.cards },
    }),
  };
}

function patternSample(
  id: number,
  label: string,
  payload: PatternSequencePayload,
): BrainGameSample {
  const n = payload.sequence.length;
  return {
    label,
    item: item(id, 'pattern_sequence', n <= 4 ? 1 : n <= 6 ? 2 : 3, payload),
    score: (response) => ({
      isCorrect: JSON.stringify(readInput(response)) === JSON.stringify(payload.sequence),
      correctResponse: { input: payload.sequence },
    }),
  };
}

export const BRAIN_GAME_SAMPLES: BrainGameSample[] = [
  memorySample(-31, 'memory 6 pairs', {
    cols: 4,
    cards: [
      'fox',
      'owl',
      'frog',
      'panda',
      'owl',
      'tiger',
      'fox',
      'koala',
      'panda',
      'koala',
      'tiger',
      'frog',
    ],
    max_attempts: 12,
  }),
  memorySample(-32, 'memory 10 pairs', {
    cols: 5,
    cards: [
      'lion',
      'cat',
      'dog',
      'unicorn',
      'otter',
      'penguin',
      'rabbit',
      'cat',
      'bear',
      'lion',
      'dragon',
      'otter',
      'turtle',
      'rabbit',
      'dog',
      'bear',
      'unicorn',
      'turtle',
      'penguin',
      'dragon',
    ],
    max_attempts: 20,
  }),
  patternSample(-33, 'pattern 4 pads', {
    pads: ['fox', 'owl', 'frog', 'panda'],
    sequence: [2, 0, 3, 1],
    show_ms: 700,
  }),
  patternSample(-34, 'pattern 6 pads', {
    pads: ['lion', 'penguin', 'elephant', 'hedgehog', 'octopus', 'monkey'],
    sequence: [4, 1, 1, 5, 0, 3, 2],
    show_ms: 600,
  }),
  // Nonogram + spot the difference (src/features/dev/puzzleSamples.ts).
  ...PUZZLE_SAMPLES,
];
