import type { SessionItem } from '@/api/types';
import {
  CALM_FACTOR,
  inputStatus,
  isPatternSequencePayload,
  padColumns,
  padToneRate,
  playbackTiming,
  readInput,
  tapPad,
} from '@/challenges/pattern/logic';
import { isPlayable } from '@/challenges/registry';

// The registry pulls in the renderers; only their guards run here.
jest.mock('@/ui', () => ({ __esModule: true }));

const PAYLOAD = { pads: ['fox', 'owl', 'frog', 'panda'], sequence: [2, 0, 3, 1], show_ms: 700 };

const item = (payload: unknown): SessionItem => ({
  id: 1,
  position: 1,
  type: 'pattern_sequence',
  is_redemption: false,
  points: 1,
  payload,
  answered: false,
});

describe('isPatternSequencePayload', () => {
  it('accepts the contract shape', () => {
    expect(isPatternSequencePayload(PAYLOAD)).toBe(true);
    expect(isPlayable(item(PAYLOAD))).toBe(true);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['one pad', { ...PAYLOAD, pads: ['fox'], sequence: [0] }],
    ['an unknown pad', { ...PAYLOAD, pads: ['fox', 'yeti', 'frog', 'panda'] }],
    ['an empty sequence', { ...PAYLOAD, sequence: [] }],
    ['a step out of range', { ...PAYLOAD, sequence: [0, 4] }],
    ['a negative step', { ...PAYLOAD, sequence: [-1] }],
    ['a fractional step', { ...PAYLOAD, sequence: [1.5] }],
    ['no show_ms', { pads: PAYLOAD.pads, sequence: PAYLOAD.sequence }],
    ['zero show_ms', { ...PAYLOAD, show_ms: 0 }],
    ['a string show_ms', { ...PAYLOAD, show_ms: '700' }],
  ])('rejects %s (skipped, never crashes)', (_label, payload) => {
    expect(isPatternSequencePayload(payload)).toBe(false);
    expect(() => isPlayable(item(payload))).not.toThrow();
    expect(isPlayable(item(payload))).toBe(false);
  });
});

describe('sequence input', () => {
  const seq = PAYLOAD.sequence;

  it('keeps going while the taps follow the sequence', () => {
    expect(inputStatus(seq, [])).toBe('playing');
    expect(tapPad(seq, [], 2)).toEqual({ input: [2], status: 'playing' });
    expect(tapPad(seq, [2, 0], 3)).toEqual({ input: [2, 0, 3], status: 'playing' });
  });

  it('completes with the last right tap', () => {
    expect(tapPad(seq, [2, 0, 3], 1)).toEqual({ input: [2, 0, 3, 1], status: 'complete' });
  });

  it('a wrong tap ends the round (and keeps the wrong tap for the response)', () => {
    expect(tapPad(seq, [2], 1)).toEqual({ input: [2, 1], status: 'wrong' });
    expect(inputStatus(seq, [0])).toBe('wrong');
  });

  it('ignores taps after the round is over', () => {
    expect(tapPad(seq, [2, 1], 0)).toEqual({ input: [2, 1], status: 'wrong' });
    expect(tapPad(seq, [2, 0, 3, 1], 0)).toEqual({ input: [2, 0, 3, 1], status: 'complete' });
  });

  it('handles a pad repeated in the sequence', () => {
    const rep = [1, 1, 0];
    expect(tapPad(rep, [1], 1).status).toBe('playing');
    expect(tapPad(rep, [1, 1], 0).status).toBe('complete');
  });
});

describe('playback', () => {
  it('honours show_ms and slows down with calm timers', () => {
    expect(playbackTiming(700, false).onMs).toBe(700);
    expect(playbackTiming(700, true).onMs).toBe(700 * CALM_FACTOR);
    expect(playbackTiming(700, false).gapMs).toBeGreaterThan(0);
  });

  it('clamps silly step lengths', () => {
    expect(playbackTiming(10, false).onMs).toBe(250);
    expect(playbackTiming(60000, false).onMs).toBe(4000);
  });

  it('gives every pad its own tone within the playable rate range', () => {
    const rates = Array.from({ length: 6 }, (_, i) => padToneRate(i));
    expect(new Set(rates).size).toBe(6);
    for (const r of rates) {
      expect(r).toBeGreaterThanOrEqual(0.5);
      expect(r).toBeLessThanOrEqual(2);
    }
  });

  it('lays pads out 2, 3 or 4 per row', () => {
    expect(padColumns(3)).toBe(2);
    expect(padColumns(4)).toBe(2);
    expect(padColumns(6)).toBe(3);
    expect(padColumns(8)).toBe(4);
  });

  it('reads a submitted { input }', () => {
    expect(readInput({ input: [1, 2] })).toEqual([1, 2]);
    expect(readInput({ input: ['1'] })).toBeNull();
    expect(readInput(null)).toBeNull();
  });
});
