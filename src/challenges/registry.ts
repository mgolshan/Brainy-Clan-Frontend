import type { ComponentType } from 'react';

import type { SessionItem } from '@/api/types';
import { CodeBreaker } from '@/challenges/codebreaker/CodeBreaker';
import { isCodeBreakerPayload } from '@/challenges/codebreaker/logic';
import { CrossMath } from '@/challenges/crossmath/CrossMath';
import { isCrossMathPayload } from '@/challenges/crossmath/logic';
import { MathSprint, isMathSprintPayload, readMathValue } from '@/challenges/MathSprint';
import { isMazePayload } from '@/challenges/maze/logic';
import { Maze } from '@/challenges/maze/Maze';
import { isMemoryMatchPayload } from '@/challenges/memory/logic';
import { MemoryMatch } from '@/challenges/memory/MemoryMatch';
import { MultipleChoice, isMultipleChoicePayload } from '@/challenges/MultipleChoice';
import { isNonogramPayload } from '@/challenges/nonogram/logic';
import { Nonogram } from '@/challenges/nonogram/Nonogram';
import { isPatternSequencePayload } from '@/challenges/pattern/logic';
import { PatternSequence } from '@/challenges/pattern/PatternSequence';
import { isSudokuPayload } from '@/challenges/sudoku/logic';
import { isSpotDifferencePayload } from '@/challenges/spot/logic';
import { SpotDifference } from '@/challenges/spot/SpotDifference';
import { Sudoku } from '@/challenges/sudoku/Sudoku';
import { WisdomCard, isWisdomCardPayload } from '@/challenges/WisdomCard';
import { isWordPuzzlePayload } from '@/challenges/words/logic';
import { WordPuzzle, describeWordPuzzle } from '@/challenges/words/WordPuzzle';

/**
 * Challenge types. Must mirror the challenge plugin type keys of the Laravel backend
 * (Brainy-Clan-Backend); add a key here when the backend adds a plugin.
 */
export type ChallengeTypeKey =
  | 'multiple_choice'
  | 'wisdom_card'
  | 'sudoku'
  | 'word_puzzle'
  | 'math_sprint'
  | 'memory_match'
  | 'pattern_sequence'
  | 'nonogram'
  | 'spot_difference'
  | 'cross_math'
  | 'maze'
  | 'code_breaker';

/** Server verdict for an answered item. */
export interface ChallengeResult<TResponse = unknown> {
  isCorrect: boolean;
  correctResponse: unknown;
  submitted: TResponse;
}

/** Props every challenge renderer receives from the play session. */
export interface ChallengeComponentProps<TPayload = unknown, TResponse = unknown> {
  item: SessionItem<TPayload>;
  /** Submit the member's answer (`response` in the API); the backend scores it. */
  onSubmit: (response: TResponse) => void;
  /** True while an answer is being submitted or the session is paused. */
  disabled?: boolean;
  /** The pending (submitted, not yet scored) response. */
  pending?: TResponse | null;
  /** Set once the server scored the answer: renderers highlight correct / wrong. */
  result?: ChallengeResult<TResponse> | null;
  /** The playing member's Clan avatar key (the maze walker); renderers fall back to a default. */
  avatar?: string | null;
}

export interface ChallengeDefinition<TPayload = unknown, TResponse = unknown> {
  component: ComponentType<ChallengeComponentProps<TPayload, TResponse>>;
  /** Guards against malformed payloads: invalid items are skipped instead of crashing. */
  isValidPayload: (payload: unknown) => payload is TPayload;
  /** Human-readable correct answer for the feedback panel (null: the renderer shows it). */
  describeCorrect: (payload: TPayload, correctResponse: unknown) => string | null;
  /** Needs the full width (big grids): the play screen uses a slimmer card padding. */
  wide?: boolean;
  /** Fast-paced: after a correct answer the session moves on by itself. */
  quickFlow?: boolean;
}

function define<P, R>(def: ChallengeDefinition<P, R>): ChallengeDefinition {
  return def as unknown as ChallengeDefinition;
}

function choiceText(
  payload: { choices: { id: string; text: string }[] },
  correct: unknown,
): string | null {
  const id =
    typeof correct === 'object' && correct !== null && 'choice_id' in correct
      ? String((correct as { choice_id: unknown }).choice_id)
      : null;
  return payload.choices.find((c) => c.id === id)?.text ?? null;
}

/** Challenge type → renderer. Types without an entry are skipped by the play session. */
export const challengeRegistry: Partial<Record<ChallengeTypeKey, ChallengeDefinition>> = {
  multiple_choice: define({
    component: MultipleChoice,
    isValidPayload: isMultipleChoicePayload,
    describeCorrect: choiceText,
  }),
  wisdom_card: define({
    component: WisdomCard,
    isValidPayload: isWisdomCardPayload,
    describeCorrect: choiceText,
  }),
  sudoku: define({
    component: Sudoku,
    isValidPayload: isSudokuPayload,
    // The solution is drawn in the grid itself.
    describeCorrect: () => null,
    wide: true,
  }),
  math_sprint: define({
    component: MathSprint,
    isValidPayload: isMathSprintPayload,
    describeCorrect: (_payload, correct) => readMathValue(correct),
    quickFlow: true,
  }),
  word_puzzle: define({
    component: WordPuzzle,
    isValidPayload: isWordPuzzlePayload,
    describeCorrect: describeWordPuzzle,
    wide: true,
  }),
  memory_match: define({
    component: MemoryMatch,
    isValidPayload: isMemoryMatchPayload,
    // Every card is turned face up after scoring.
    describeCorrect: () => null,
    wide: true,
  }),
  pattern_sequence: define({
    component: PatternSequence,
    isValidPayload: isPatternSequencePayload,
    // The renderer shows the pattern (Clan faces) after a wrong answer.
    describeCorrect: () => null,
  }),
  nonogram: define({
    component: Nonogram,
    isValidPayload: isNonogramPayload,
    // The renderer shows the solved picture and its name.
    describeCorrect: () => null,
    wide: true,
  }),
  spot_difference: define({
    component: SpotDifference,
    isValidPayload: isSpotDifferencePayload,
    // Missed differences are circled in the pictures.
    describeCorrect: () => null,
    wide: true,
  }),
  cross_math: define({
    component: CrossMath,
    isValidPayload: isCrossMathPayload,
    // The renderer fills in the solution and marks the squares that differed.
    describeCorrect: () => null,
    wide: true,
  }),
  maze: define({
    component: Maze,
    isValidPayload: isMazePayload,
    // The renderer draws the shortest route after a wrong answer.
    describeCorrect: () => null,
    wide: true,
  }),
  code_breaker: define({
    component: CodeBreaker,
    isValidPayload: isCodeBreakerPayload,
    // The renderer reveals the secret line.
    describeCorrect: () => null,
  }),
};

export function isChallengeTypeSupported(type: string): type is ChallengeTypeKey {
  // Own keys only: "constructor" or "toString" from the API must not count as a type.
  return Object.prototype.hasOwnProperty.call(challengeRegistry, type);
}

export function getChallenge(type: string): ChallengeDefinition | undefined {
  return isChallengeTypeSupported(type) ? challengeRegistry[type] : undefined;
}

/** True when the app can render this item (known type + well-formed payload). */
export function isPlayable(item: SessionItem): boolean {
  const def = getChallenge(item.type);
  return !!def && def.isValidPayload(item.payload);
}
