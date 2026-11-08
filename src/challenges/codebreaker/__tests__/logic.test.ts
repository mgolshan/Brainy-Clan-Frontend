import type { CodeBreakerPayload } from '@/api/types';
import {
  areValidGuesses,
  clearPeg,
  emptyCurrent,
  gameStatus,
  isCodeBreakerDraft,
  isCodeBreakerPayload,
  isComplete,
  nextEmptySlot,
  putPeg,
  readCode,
  readGuesses,
  removeLast,
  scoreGuess,
} from '@/challenges/codebreaker/logic';

const P: CodeBreakerPayload = {
  pegs: ['fox', 'owl', 'frog', 'panda'],
  length: 3,
  repeats: false,
  max_guesses: 10,
  code: [2, 0, 3],
};

describe('isCodeBreakerPayload', () => {
  it('accepts the contract example', () => {
    expect(isCodeBreakerPayload(P)).toBe(true);
    expect(isCodeBreakerPayload({ ...P, repeats: true, code: [1, 1, 3] })).toBe(true);
  });

  it.each([
    ['null', null],
    ['unknown avatar', { ...P, pegs: ['fox', 'owl', 'frog', 'robot'] }],
    ['the same peg twice', { ...P, pegs: ['fox', 'owl', 'frog', 'fox'] }],
    ['code too short', { ...P, code: [1, 2] }],
    ['code index out of range', { ...P, code: [1, 2, 4] }],
    ['repeats in the code when not allowed', { ...P, code: [1, 1, 2] }],
    ['no repeats flag', { ...P, repeats: 'no' }],
    ['zero guesses', { ...P, max_guesses: 0 }],
  ])('rejects %s', (_label, payload) => {
    expect(isCodeBreakerPayload(payload)).toBe(false);
  });
});

describe('scoreGuess (contract formula)', () => {
  it.each([
    // [guess, code, exact, near]
    [[2, 0, 3], [2, 0, 3], 3, 0],
    [[0, 3, 2], [2, 0, 3], 0, 3],
    [[2, 3, 0], [2, 0, 3], 1, 2],
    [[1, 1, 1], [2, 0, 3], 0, 0],
    // Repeats in the guess count once per matching code peg.
    [[2, 2, 2], [2, 0, 3], 1, 0],
    [[0, 0, 2], [2, 0, 3], 1, 1],
    // Repeats in the code.
    [[1, 1, 3, 3], [1, 3, 1, 1], 1, 2],
    [[1, 1, 1, 1], [1, 3, 1, 1], 3, 0],
    [[3, 3, 3, 1], [1, 3, 1, 1], 2, 0],
    [[4, 1, 1, 5], [4, 1, 1, 5], 4, 0],
    [[1, 4, 5, 1], [4, 1, 1, 5], 0, 4],
  ])('%j vs %j → %d exact, %d near', (guess, code, exact, near) => {
    expect(scoreGuess(guess, code)).toEqual({ exact, near });
  });
});

describe('game status', () => {
  it('is solved when a guess equals the code, out when guesses run out', () => {
    expect(gameStatus(P, [])).toBe('playing');
    expect(gameStatus(P, [[0, 1, 2]])).toBe('playing');
    expect(
      gameStatus(P, [
        [0, 1, 2],
        [2, 0, 3],
      ]),
    ).toBe('solved');
    const tries = Array.from({ length: 10 }, () => [0, 1, 2]);
    expect(gameStatus(P, tries)).toBe('out');
  });

  it('mirrors the server checks on the guess list', () => {
    expect(
      areValidGuesses(P, [
        [0, 1, 2],
        [2, 0, 3],
      ]),
    ).toBe(true);
    expect(areValidGuesses(P, [[1, 1, 1]])).toBe(true); // repeats in a guess are fine
    expect(
      areValidGuesses(P, [
        [2, 0, 3],
        [0, 1, 2],
      ]),
    ).toBe(false); // a guess after the win
    expect(areValidGuesses(P, [[0, 1]])).toBe(false); // wrong length
    expect(areValidGuesses(P, [[0, 1, 4]])).toBe(false); // out of range
    expect(
      areValidGuesses(
        P,
        Array.from({ length: 11 }, () => [0, 1, 2]),
      ),
    ).toBe(false);
  });
});

describe('building a guess', () => {
  it('fills the next empty slot, or the chosen one', () => {
    let cur = emptyCurrent(3);
    cur = putPeg(cur, 1, null);
    cur = putPeg(cur, 2, null);
    expect(cur).toEqual([1, 2, null]);
    cur = putPeg(cur, 3, 0);
    expect(cur).toEqual([3, 2, null]);
    cur = putPeg(cur, 0, null);
    expect(isComplete(cur)).toBe(true);
    // Full: nothing changes without a chosen slot.
    expect(putPeg(cur, 1, null)).toEqual(cur);
    cur = clearPeg(cur, 1);
    expect(cur).toEqual([3, null, 0]);
    expect(nextEmptySlot(cur, 0)).toBe(1);
    expect(nextEmptySlot([1, 2, 3], 0)).toBeNull();
    expect(removeLast(cur)).toEqual([3, null, null]);
    expect(removeLast(emptyCurrent(2))).toEqual([null, null]);
  });

  it('validates drafts', () => {
    expect(isCodeBreakerDraft({ guesses: [[0, 1, 2]], current: [null, 1, null] }, P)).toBe(true);
    expect(isCodeBreakerDraft({ guesses: [], current: [null, null] }, P)).toBe(false);
    expect(isCodeBreakerDraft({ guesses: [[9, 9, 9]], current: [null, null, null] }, P)).toBe(
      false,
    );
    expect(isCodeBreakerDraft(null, P)).toBe(false);
  });

  it('reads responses and the revealed code', () => {
    expect(readGuesses({ guesses: [[0, 1, 2]] })).toEqual([[0, 1, 2]]);
    expect(readGuesses({ guesses: 'x' })).toBeNull();
    expect(readCode({ guesses: null, code: [2, 0, 3] }, 3)).toEqual([2, 0, 3]);
    expect(readCode({ code: [2, 0] }, 3)).toBeNull();
  });
});
