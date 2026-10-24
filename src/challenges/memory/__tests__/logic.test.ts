import type { SessionItem } from '@/api/types';
import {
  checkAttempt,
  gridRows,
  isMemoryMatchPayload,
  readAttempts,
  replayAttempts,
} from '@/challenges/memory/logic';
import { isPlayable } from '@/challenges/registry';

// The registry pulls in the renderers; only their guards run here.
jest.mock('@/ui', () => ({ __esModule: true }));

// Pairs: fox 0/2, owl 1/5, frog 3/4.
const PAYLOAD = { cols: 3, cards: ['fox', 'owl', 'fox', 'frog', 'frog', 'owl'], max_attempts: 4 };

const item = (payload: unknown): SessionItem => ({
  id: 1,
  position: 1,
  type: 'memory_match',
  is_redemption: false,
  points: 2,
  payload,
  answered: false,
});

describe('isMemoryMatchPayload', () => {
  it('accepts the contract shape', () => {
    expect(isMemoryMatchPayload(PAYLOAD)).toBe(true);
    expect(
      isMemoryMatchPayload({
        cols: 4,
        cards: ['fox', 'owl', 'fox', 'frog', 'owl', 'tiger', 'frog', 'tiger'],
        max_attempts: 12,
      }),
    ).toBe(true);
    expect(isPlayable(item(PAYLOAD))).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'cards'],
    ['no cards', { cols: 4, max_attempts: 5 }],
    ['an odd card count', { cols: 3, cards: ['fox', 'fox', 'owl'], max_attempts: 5 }],
    ['a single pair', { cols: 2, cards: ['fox', 'fox'], max_attempts: 5 }],
    ['a face three times', { cols: 2, cards: ['fox', 'fox', 'fox', 'owl'], max_attempts: 5 }],
    ['an unknown face', { cols: 2, cards: ['fox', 'fox', 'yeti', 'yeti'], max_attempts: 5 }],
    ['a non-string face', { cols: 2, cards: ['fox', 'fox', 1, 1], max_attempts: 5 }],
    ['zero columns', { ...PAYLOAD, cols: 0 }],
    ['fractional columns', { ...PAYLOAD, cols: 1.5 }],
    ['too few attempts for the pairs', { ...PAYLOAD, max_attempts: 2 }],
    ['a string max_attempts', { ...PAYLOAD, max_attempts: '12' }],
  ])('rejects %s (skipped, never crashes)', (_label, payload) => {
    expect(isMemoryMatchPayload(payload)).toBe(false);
    expect(() => isPlayable(item(payload))).not.toThrow();
    expect(isPlayable(item(payload))).toBe(false);
  });
});

describe('checkAttempt', () => {
  const none = new Array(6).fill(false);
  it('tells a match from a miss', () => {
    expect(checkAttempt(PAYLOAD.cards, none, [0, 2])).toBe('match');
    expect(checkAttempt(PAYLOAD.cards, none, [0, 1])).toBe('miss');
  });

  it('flags what the server answers 422 for', () => {
    expect(checkAttempt(PAYLOAD.cards, none, [0, 0])).toBe('invalid');
    expect(checkAttempt(PAYLOAD.cards, none, [0, 6])).toBe('invalid');
    expect(checkAttempt(PAYLOAD.cards, none, [-1, 2])).toBe('invalid');
    expect(checkAttempt(PAYLOAD.cards, none, [0])).toBe('invalid');
    const matched = [true, false, true, false, false, false];
    expect(checkAttempt(PAYLOAD.cards, matched, [0, 1])).toBe('invalid');
  });
});

describe('replayAttempts (mirrors the server)', () => {
  it('is correct when every pair is matched within max_attempts', () => {
    const r = replayAttempts(PAYLOAD, [
      [0, 1],
      [2, 0],
      [5, 1],
      [3, 4],
    ]);
    expect(r).toMatchObject({
      valid: true,
      complete: true,
      correct: true,
      finished: true,
      pairsFound: 3,
      totalPairs: 3,
      attemptsUsed: 4,
    });
    expect(r.matched).toEqual([true, true, true, true, true, true]);
  });

  it('keeps unmatched cards down and is not finished mid-game', () => {
    const r = replayAttempts(PAYLOAD, [
      [0, 2],
      [1, 3],
    ]);
    expect(r.matched).toEqual([true, false, true, false, false, false]);
    expect(r).toMatchObject({ complete: false, correct: false, finished: false, pairsFound: 1 });
  });

  it('is over (and wrong) when the attempts run out', () => {
    const r = replayAttempts(PAYLOAD, [
      [0, 1],
      [1, 3],
      [3, 5],
      [0, 2],
    ]);
    expect(r).toMatchObject({ complete: false, correct: false, finished: true, attemptsUsed: 4 });
  });

  it('is wrong when complete but over max_attempts', () => {
    const r = replayAttempts({ ...PAYLOAD, max_attempts: 3 }, [
      [0, 1],
      [0, 2],
      [1, 5],
      [3, 4],
    ]);
    expect(r).toMatchObject({ complete: true, correct: false });
  });

  it('stops at a malformed attempt (already matched, same card twice)', () => {
    expect(
      replayAttempts(PAYLOAD, [
        [0, 2],
        [0, 1],
      ] as number[][]).valid,
    ).toBe(false);
    expect(replayAttempts(PAYLOAD, [[3, 3]]).valid).toBe(false);
    expect(replayAttempts(PAYLOAD, [[3, 3]]).correct).toBe(false);
    expect(replayAttempts(PAYLOAD, [[3, 3]]).finished).toBe(true);
  });

  it('an empty game is just started', () => {
    expect(replayAttempts(PAYLOAD, [])).toMatchObject({ finished: false, pairsFound: 0 });
  });
});

describe('readAttempts / gridRows', () => {
  it('reads a submitted or stored { attempts }', () => {
    expect(readAttempts({ attempts: [[0, 2]] })).toEqual([[0, 2]]);
    expect(readAttempts({ attempts: [] })).toEqual([]);
    expect(readAttempts({ attempts: [[0]] })).toBeNull();
    expect(readAttempts({ attempts: [[0, 'a']] })).toBeNull();
    expect(readAttempts(null)).toBeNull();
    expect(readAttempts({})).toBeNull();
  });

  it('counts rows (the last row may be partial)', () => {
    expect(gridRows(12, 4)).toBe(3);
    expect(gridRows(20, 5)).toBe(4);
    expect(gridRows(14, 4)).toBe(4);
  });
});
