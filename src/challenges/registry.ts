import type { ComponentType } from 'react';

import type { SessionItem } from '@/api/types';
import { MultipleChoice, isMultipleChoicePayload } from '@/challenges/MultipleChoice';
import { WisdomCard, isWisdomCardPayload } from '@/challenges/WisdomCard';

/**
 * Challenge types. Must mirror the challenge plugin type keys of the Laravel backend
 * (Brainy-Clan-Backend); add a key here when the backend adds a plugin.
 */
export type ChallengeTypeKey =
  'multiple_choice' | 'wisdom_card' | 'sudoku' | 'word_puzzle' | 'math_sprint';

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
}

export interface ChallengeDefinition<TPayload = unknown, TResponse = unknown> {
  component: ComponentType<ChallengeComponentProps<TPayload, TResponse>>;
  /** Guards against malformed payloads: invalid items are skipped instead of crashing. */
  isValidPayload: (payload: unknown) => payload is TPayload;
  /** Human-readable correct answer for the feedback panel. */
  describeCorrect: (payload: TPayload, correctResponse: unknown) => string | null;
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
};

export function isChallengeTypeSupported(type: string): type is ChallengeTypeKey {
  return type in challengeRegistry;
}

export function getChallenge(type: string): ChallengeDefinition | undefined {
  return isChallengeTypeSupported(type) ? challengeRegistry[type] : undefined;
}

/** True when the app can render this item (known type + well-formed payload). */
export function isPlayable(item: SessionItem): boolean {
  const def = getChallenge(item.type);
  return !!def && def.isValidPayload(item.payload);
}
