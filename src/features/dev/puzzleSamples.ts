import type { NonogramPayload, SessionItem, SpotDifferencePayload } from '@/api/types';
import { lineRuns, readNonogramGrid, satisfiedLines } from '@/challenges/nonogram/logic';
import { readTaps, scoreTaps } from '@/challenges/spot/logic';
import type { BrainGameSample } from '@/features/dev/brainGameSamples';

/**
 * Nonogram and spot-the-difference samples for `/dev/games`, scored on the device with the same
 * rules as API.md "Brain games" (a nonogram is correct when every clue matches; spot the
 * difference when every change is found within `max_misses`).
 */

function item(id: number, type: string, points: number, payload: unknown): SessionItem {
  return { id, position: -id, type, is_redemption: false, answered: false, points, payload };
}

function nonogramFrom(picture: string[]): { payload: NonogramPayload; solution: number[][] } {
  const solution = picture.map((row) => Array.from(row, (ch) => (ch === '#' ? 1 : 0)));
  const clue = (line: number[]) => {
    const runs = lineRuns(line);
    return runs.length ? runs : [0];
  };
  const cols = solution[0].length;
  return {
    solution,
    payload: {
      rows: solution.length,
      cols,
      row_clues: solution.map(clue),
      col_clues: Array.from({ length: cols }, (_, c) => clue(solution.map((row) => row[c]))),
    },
  };
}

function nonogramSample(
  id: number,
  label: string,
  points: number,
  title: string,
  picture: string[],
): BrainGameSample {
  const { payload, solution } = nonogramFrom(picture);
  return {
    label,
    item: item(id, 'nonogram', points, payload),
    score: (response) => {
      const cells = readNonogramGrid(response, payload.rows, payload.cols);
      const lines = cells ? satisfiedLines(cells, payload) : null;
      return {
        isCorrect: !!lines && [...lines.rows, ...lines.cols].every(Boolean),
        correctResponse: { grid: solution, title },
      };
    },
  };
}

const SPOT: SpotDifferencePayload = {
  aspect: 1.25,
  objects: [
    { id: 'o1', kind: 'sun', x: 0.14, y: 0.13, size: 0.15, color: 'yellow', flip: false },
    { id: 'o2', kind: 'cloud', x: 0.5, y: 0.12, size: 0.18, color: 'white', flip: false },
    { id: 'o3', kind: 'kite', x: 0.84, y: 0.16, size: 0.15, color: 'purple', flip: false },
    { id: 'o4', kind: 'tree', x: 0.16, y: 0.44, size: 0.24, color: 'green', flip: false },
    { id: 'o5', kind: 'house', x: 0.8, y: 0.44, size: 0.24, color: 'blue', flip: false },
    { id: 'o6', kind: 'bird', x: 0.46, y: 0.34, size: 0.1, color: 'red', flip: false },
    { id: 'o7', kind: 'fox', x: 0.38, y: 0.6, size: 0.16, color: 'orange', flip: false },
    { id: 'o8', kind: 'owl', x: 0.6, y: 0.6, size: 0.15, color: 'pink', flip: false },
    { id: 'o9', kind: 'flower', x: 0.1, y: 0.68, size: 0.1, color: 'pink', flip: false },
    { id: 'o10', kind: 'ball', x: 0.84, y: 0.7, size: 0.08, color: 'red', flip: false },
    { id: 'o11', kind: 'rock', x: 0.24, y: 0.72, size: 0.09, color: 'brown', flip: false },
    { id: 'o12', kind: 'star', x: 0.3, y: 0.2, size: 0.07, color: 'yellow', flip: false },
  ],
  changes: [
    { id: 'd1', object_id: 'o3', change: 'color', value: 'green' },
    { id: 'd2', object_id: 'o6', change: 'flip', value: true },
    { id: 'd3', object_id: 'o9', change: 'missing', value: null },
    { id: 'd4', object_id: 'o10', change: 'size', value: 0.13 },
    { id: 'd5', object_id: 'o8', change: 'color', value: 'blue' },
  ],
  max_misses: 5,
};

export const PUZZLE_SAMPLES: BrainGameSample[] = [
  nonogramSample(-41, 'nonogram 5×5', 3, 'A heart', ['.#.#.', '#####', '#####', '.###.', '..#..']),
  nonogramSample(-42, 'nonogram 10×10', 8, 'A sailing boat', [
    '....#.....',
    '....##....',
    '....###...',
    '....####..',
    '....#####.',
    '....#.....',
    '##########',
    '.########.',
    '..######..',
    '..........',
  ]),
  {
    label: 'spot 5 changes',
    item: item(-43, 'spot_difference', 3, SPOT),
    score: (response) => {
      const { found, misses } = scoreTaps(readTaps(response), SPOT);
      return {
        isCorrect: found.length === SPOT.changes.length && misses <= SPOT.max_misses,
        correctResponse: { changes: SPOT.changes.map((c) => c.id) },
      };
    },
  },
];
