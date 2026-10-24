import type { SpotDifferencePayload } from '@/api/types';
import {
  MIN_HIT_RADIUS,
  SPOT_PROPS,
  applyChanges,
  changeCircle,
  hitTest,
  isSpotDifferencePayload,
  locateInPair,
  normalizeTap,
  objectCenterTap,
  readChangeIds,
  readTaps,
  scoreTaps,
} from '@/challenges/spot/logic';
import { SPOT_PALETTE, propSvg } from '@/challenges/spot/props';

const PAYLOAD: SpotDifferencePayload = {
  aspect: 1.25,
  objects: [
    { id: 'o1', kind: 'tree', x: 0.2, y: 0.5, size: 0.2, color: 'green', flip: false },
    { id: 'o2', kind: 'fox', x: 0.5, y: 0.6, size: 0.2, color: 'orange', flip: false },
    { id: 'o3', kind: 'sun', x: 0.8, y: 0.15, size: 0.04, color: 'yellow', flip: false },
    { id: 'o4', kind: 'ball', x: 0.75, y: 0.65, size: 0.2, color: 'red', flip: true },
  ],
  changes: [
    { id: 'd1', object_id: 'o1', change: 'color', value: 'red' },
    { id: 'd2', object_id: 'o2', change: 'missing', value: null },
    { id: 'd3', object_id: 'o3', change: 'size', value: 0.08 },
    { id: 'd4', object_id: 'o4', change: 'flip', value: true },
  ],
  max_misses: 3,
};

/** The normalized tap (per-axis) at a point given in picture-width units. */
const tapAt = (x: number, yWidthUnits: number): [number, number] => [
  x,
  yWidthUnits * PAYLOAD.aspect,
];

describe('isSpotDifferencePayload', () => {
  it('accepts a well-formed payload', () => {
    expect(isSpotDifferencePayload(PAYLOAD)).toBe(true);
  });

  it('accepts unknown object kinds (drawn as a plain disc)', () => {
    const objects = [{ ...PAYLOAD.objects[0], kind: 'spaceship' }, ...PAYLOAD.objects.slice(1)];
    expect(isSpotDifferencePayload({ ...PAYLOAD, objects })).toBe(true);
  });

  const obj = PAYLOAD.objects[0];
  const change = PAYLOAD.changes[0];
  it.each([
    ['null', null],
    ['an array', []],
    ['no aspect', { ...PAYLOAD, aspect: undefined }],
    ['a zero aspect', { ...PAYLOAD, aspect: 0 }],
    ['negative max_misses', { ...PAYLOAD, max_misses: -1 }],
    ['no objects', { ...PAYLOAD, objects: [] }],
    ['no changes', { ...PAYLOAD, changes: [] }],
    ['a bad color', { ...PAYLOAD, objects: [{ ...obj, color: 'teal' }] }],
    ['a NaN position', { ...PAYLOAD, objects: [{ ...obj, x: Number.NaN }] }],
    ['an x out of range', { ...PAYLOAD, objects: [{ ...obj, x: 1.5 }] }],
    ['a zero size', { ...PAYLOAD, objects: [{ ...obj, size: 0 }] }],
    ['a missing flip', { ...PAYLOAD, objects: [{ ...obj, flip: undefined }] }],
    ['duplicate object ids', { ...PAYLOAD, objects: [obj, { ...PAYLOAD.objects[1], id: 'o1' }] }],
    ['a change of an unknown object', { ...PAYLOAD, changes: [{ ...change, object_id: 'x' }] }],
    ['an unknown change kind', { ...PAYLOAD, changes: [{ ...change, change: 'spin' }] }],
    ['a color change without a color', { ...PAYLOAD, changes: [{ ...change, value: 0.2 }] }],
    [
      'a size change without a number',
      { ...PAYLOAD, changes: [{ ...change, change: 'size', value: 'big' }] },
    ],
    [
      'duplicate change ids',
      { ...PAYLOAD, changes: [change, { ...PAYLOAD.changes[1], id: 'd1' }] },
    ],
  ])('rejects %s', (_label, payload) => {
    expect(isSpotDifferencePayload(payload)).toBe(false);
  });
});

describe('applyChanges', () => {
  it('builds the right picture', () => {
    const right = applyChanges(PAYLOAD.objects, PAYLOAD.changes);
    expect(right.map((o) => o.id)).toEqual(['o1', 'o3', 'o4']);
    expect(right[0].color).toBe('red');
    expect(right[1].size).toBe(0.08);
    expect(right[2].flip).toBe(false); // flipped relative to the left picture
    // The left picture is untouched.
    expect(PAYLOAD.objects[0].color).toBe('green');
  });
});

describe('hit-testing', () => {
  it('uses size × 0.75 as the radius, at least 0.06', () => {
    expect(changeCircle(PAYLOAD.changes[0], PAYLOAD.objects)?.r).toBeCloseTo(0.15);
    expect(changeCircle(PAYLOAD.changes[2], PAYLOAD.objects)?.r).toBe(MIN_HIT_RADIUS);
  });

  it('uses the larger of the original and changed size for a size change', () => {
    const grown = { ...PAYLOAD.changes[2], value: 0.2 };
    expect(changeCircle(grown, PAYLOAD.objects)?.r).toBeCloseTo(0.15);
    const shrunk = { ...PAYLOAD.changes[0], object_id: 'o1', change: 'size' as const, value: 0.1 };
    expect(changeCircle(shrunk, PAYLOAD.objects)?.r).toBeCloseTo(0.15);
  });

  it('finds a change inside its circle and misses outside', () => {
    expect(hitTest(tapAt(0.2, 0.5), PAYLOAD)).toBe('d1');
    expect(hitTest(tapAt(0.2 + 0.149, 0.5), PAYLOAD)).toBe('d1');
    expect(hitTest(tapAt(0.2 + 0.151, 0.5), PAYLOAD)).toBeNull();
    expect(hitTest(tapAt(0.8, 0.15 + 0.059), PAYLOAD)).toBe('d3');
    expect(hitTest(tapAt(0.8, 0.15 + 0.061), PAYLOAD)).toBeNull();
    expect(hitTest([0.02, 0.02], PAYLOAD)).toBeNull();
  });

  it('converts the tap y from picture height to width units', () => {
    // The fox centre is y = 0.6 width units = 0.75 of the height.
    expect(hitTest([0.5, 0.75], PAYLOAD)).toBe('d2');
    expect(hitTest([0.5, 0.4], PAYLOAD)).toBeNull();
  });

  it('picks the nearest change when circles overlap', () => {
    // Between the fox (0.5, 0.6) and the ball (0.75, 0.65), closer to the ball.
    expect(hitTest(tapAt(0.63, 0.63), PAYLOAD)).toBe('d4');
    expect(hitTest(tapAt(0.6, 0.62), PAYLOAD)).toBe('d2');
  });

  it('scores taps like the server: each change once, misses counted', () => {
    const taps = [tapAt(0.2, 0.5), [0.01, 0.01], tapAt(0.21, 0.5), tapAt(0.5, 0.6)] as [
      number,
      number,
    ][];
    expect(scoreTaps(taps, PAYLOAD)).toEqual({ found: ['d1', 'd2'], misses: 1 });
  });

  it('ignores taps after the last find', () => {
    const all = PAYLOAD.changes.map((ch) => {
      const o = PAYLOAD.objects.find((x) => x.id === ch.object_id)!;
      return objectCenterTap(o, PAYLOAD.aspect);
    });
    expect(scoreTaps([...all, [0, 0], [0, 0]], PAYLOAD)).toEqual({
      found: ['d1', 'd2', 'd3', 'd4'],
      misses: 0,
    });
  });
});

describe('tap math', () => {
  it('normalizes a point within a picture, clamped and rounded', () => {
    expect(normalizeTap(150, 60, 300, 240)).toEqual([0.5, 0.25]);
    expect(normalizeTap(-5, 500, 300, 240)).toEqual([0, 1]);
    expect(normalizeTap(100, 80, 300, 240)).toEqual([0.3333, 0.3333]);
    expect(normalizeTap(10, 10, 0, 0)).toEqual([1, 1]);
  });

  it('turns an object centre into a normalized tap that hits it', () => {
    const fox = PAYLOAD.objects[1];
    expect(objectCenterTap(fox, PAYLOAD.aspect)).toEqual([0.5, 0.75]);
    expect(hitTest(objectCenterTap(fox, PAYLOAD.aspect), PAYLOAD)).toBe('d2');
  });

  it('locates a point in side-by-side pictures', () => {
    const pic = { width: 200, height: 160 };
    expect(locateInPair(50, 40, pic, 10, false)).toEqual({ side: 0, x: 50, y: 40 });
    expect(locateInPair(260, 40, pic, 10, false)).toEqual({ side: 1, x: 50, y: 40 });
    expect(locateInPair(205, 40, pic, 10, false)).toBeNull(); // the gap
    expect(locateInPair(500, 40, pic, 10, false)).toBeNull();
  });

  it('locates a point in stacked pictures', () => {
    const pic = { width: 300, height: 240 };
    expect(locateInPair(30, 100, pic, 8, true)).toEqual({ side: 0, x: 30, y: 100 });
    expect(locateInPair(30, 300, pic, 8, true)).toEqual({ side: 1, x: 30, y: 52 });
    expect(locateInPair(30, 244, pic, 8, true)).toBeNull();
  });

  it('reads taps and change ids defensively', () => {
    expect(readTaps({ taps: [[0.1, 0.2], ['x', 1], [0.3], [0.5, 0.5]] })).toEqual([
      [0.1, 0.2],
      [0.5, 0.5],
    ]);
    expect(readTaps(null)).toEqual([]);
    expect(readChangeIds({ changes: ['d1', 2, 'd3'] })).toEqual(['d1', 'd3']);
    expect(readChangeIds({})).toEqual([]);
  });
});

describe('prop art', () => {
  it('has an SVG for every prop in every color', () => {
    for (const kind of SPOT_PROPS) {
      for (const color of Object.keys(SPOT_PALETTE) as (keyof typeof SPOT_PALETTE)[]) {
        const xml = propSvg(kind, color);
        expect(xml.startsWith('<svg')).toBe(true);
        expect(xml).toContain(SPOT_PALETTE[color][0]);
        expect(xml).not.toContain('undefined');
      }
    }
  });
});
