import type { SessionItem } from '@/api/types';
import {
  challengeRegistry,
  getChallenge,
  isChallengeTypeSupported,
  isPlayable,
  type ChallengeTypeKey,
} from '@/challenges/registry';

// The registry's payload guards are pure; the renderers are never rendered here. Stub the UI
// kit (and the router it pulls in) so this suite does not load the whole app.
jest.mock('@/ui', () => ({ __esModule: true }));

const item = (type: string, payload: unknown): SessionItem => ({
  id: 1,
  position: 1,
  type,
  is_redemption: false,
  points: 1,
  payload,
  answered: false,
});

const zeros = (size: number) => Array.from({ length: size }, () => new Array(size).fill(0));

/** Contract examples (API.md "Challenge types") — every one must be playable. */
const VALID: [ChallengeTypeKey, string, unknown][] = [
  [
    'multiple_choice',
    'question + choices',
    { question: 'Capital of Peru?', choices: [{ id: 'a', text: 'Lima' }], image_url: null },
  ],
  [
    'wisdom_card',
    'card + question + choices',
    {
      card: {
        text: 'We suffer more in imagination than in reality.',
        author: 'Seneca',
        source: null,
      },
      question: 'What is the main idea?',
      choices: [{ id: 'a', text: 'Fear' }],
    },
  ],
  ['sudoku', '4×4', { size: 4, box: [2, 2], grid: zeros(4) }],
  ['sudoku', '6×6', { size: 6, box: [2, 3], grid: zeros(6) }],
  ['sudoku', '9×9', { size: 9, box: [3, 3], grid: zeros(9) }],
  ['math_sprint', 'integer', { question: '7 × 8', answer_format: 'integer', time_limit_ms: 10000 }],
  [
    'math_sprint',
    'fraction, no timer',
    { question: 'Simplify 14/16', answer_format: 'fraction', time_limit_ms: null },
  ],
  ['word_puzzle', 'anagram', { variant: 'anagram', letters: ['T', 'A', 'C'], hint: 'An animal' }],
  ['word_puzzle', 'missing letter', { variant: 'missing_letter', pattern: 'EL_PHANT', hint: null }],
  [
    'word_puzzle',
    'word search',
    { variant: 'word_search', grid: [['C', 'A', 'T']], words: ['CAT'] },
  ],
  ['nonogram', '2×2', { rows: 2, cols: 2, row_clues: [[2], [0]], col_clues: [[1], [1]] }],
  [
    'spot_difference',
    'contract example',
    {
      aspect: 1.25,
      objects: [
        { id: 'o1', kind: 'tree', x: 0.2, y: 0.6, size: 0.18, color: 'green', flip: false },
        { id: 'o3', kind: 'fox', x: 0.6, y: 0.4, size: 0.12, color: 'orange', flip: false },
      ],
      changes: [{ id: 'd1', object_id: 'o3', change: 'missing', value: null }],
      max_misses: 5,
    },
  ],
];

/** Malformed payloads: the play session must skip them instead of crashing. */
const INVALID: [ChallengeTypeKey, string, unknown][] = [
  ['multiple_choice', 'null payload', null],
  ['multiple_choice', 'no choices', { question: 'Q?', choices: [], image_url: null }],
  ['multiple_choice', 'choice without text', { question: 'Q?', choices: [{ id: 'a' }] }],
  ['multiple_choice', 'numeric choice id', { question: 'Q?', choices: [{ id: 1, text: 'x' }] }],
  ['wisdom_card', 'no card', { question: 'Q?', choices: [{ id: 'a', text: 'x' }] }],
  [
    'wisdom_card',
    'card without text',
    { card: {}, question: 'Q?', choices: [{ id: 'a', text: 'x' }] },
  ],
  ['sudoku', 'size 5', { size: 5, box: [1, 5], grid: zeros(5) }],
  ['sudoku', 'box mismatch', { size: 6, box: [3, 3], grid: zeros(6) }],
  ['sudoku', 'grid too small', { size: 9, box: [3, 3], grid: zeros(4) }],
  [
    'math_sprint',
    'unknown format',
    { question: '1 + 1', answer_format: 'roman', time_limit_ms: null },
  ],
  [
    'math_sprint',
    'empty question',
    { question: '', answer_format: 'integer', time_limit_ms: null },
  ],
  [
    'math_sprint',
    'zero time limit',
    { question: '1 + 1', answer_format: 'integer', time_limit_ms: 0 },
  ],
  ['word_puzzle', 'unknown variant', { variant: 'crossword' }],
  ['word_puzzle', 'anagram without letters', { variant: 'anagram', letters: [], hint: null }],
  [
    'word_puzzle',
    'word search ragged grid',
    { variant: 'word_search', grid: [['A', 'B'], ['C']], words: ['AB'] },
  ],
  [
    'nonogram',
    'clue count mismatch',
    { rows: 2, cols: 2, row_clues: [[1]], col_clues: [[1], [1]] },
  ],
  [
    'spot_difference',
    'change of an unknown object',
    {
      aspect: 1,
      objects: [{ id: 'o1', kind: 'sun', x: 0.5, y: 0.5, size: 0.2, color: 'yellow', flip: false }],
      changes: [{ id: 'd1', object_id: 'o9', change: 'missing', value: null }],
      max_misses: 3,
    },
  ],
];

describe('challenge registry', () => {
  it('registers every challenge type of the contract', () => {
    expect(Object.keys(challengeRegistry).sort()).toEqual(
      [
        'math_sprint',
        'multiple_choice',
        'sudoku',
        'wisdom_card',
        'word_puzzle',
        'memory_match',
        'pattern_sequence',
        'nonogram',
        'spot_difference',
      ].sort(),
    );
  });

  it('knows its own types and nothing else', () => {
    expect(isChallengeTypeSupported('sudoku')).toBe(true);
    expect(isChallengeTypeSupported('crossword')).toBe(false);
    expect(isChallengeTypeSupported('toString')).toBe(false);
    expect(getChallenge('crossword')).toBeUndefined();
  });

  it.each(VALID)('%s (%s) is playable', (type, _label, payload) => {
    expect(isPlayable(item(type, payload))).toBe(true);
  });

  it.each(INVALID)('%s with %s is skipped', (type, _label, payload) => {
    expect(isPlayable(item(type, payload))).toBe(false);
  });

  it.each([
    ['an unknown type', 'crossword'],
    ['an inherited object key', 'constructor'],
    ['an empty type', ''],
  ])('skips %s without throwing', (_label, type) => {
    expect(() => isPlayable(item(type, {}))).not.toThrow();
    expect(isPlayable(item(type, {}))).toBe(false);
  });

  it('describes the correct choice for multiple choice', () => {
    const def = getChallenge('multiple_choice')!;
    const payload = {
      question: 'Q?',
      choices: [
        { id: 'a', text: 'Lima' },
        { id: 'b', text: 'Quito' },
      ],
    };
    expect(def.describeCorrect(payload, { choice_id: 'b' })).toBe('Quito');
    expect(def.describeCorrect(payload, { choice_id: 'z' })).toBeNull();
    expect(def.describeCorrect(payload, null)).toBeNull();
  });
});
