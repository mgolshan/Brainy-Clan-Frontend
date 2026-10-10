import type { ComponentType } from 'react';

/**
 * Challenge types. Must mirror the challenge plugin type keys of the Laravel backend
 * (Brainy-Clan-Backend); add a key here when the backend adds a plugin.
 */
export type ChallengeTypeKey =
  'multiple_choice' | 'wisdom_card' | 'sudoku' | 'word_puzzle' | 'math_sprint';

/** Props every challenge renderer receives from the play session. */
export interface ChallengeComponentProps<TPayload = unknown, TAnswer = unknown> {
  /** Challenge id from the API. */
  challengeId: string;
  /** Type-specific payload exactly as returned by the API. */
  payload: TPayload;
  /** Submit the member's answer; the backend scores it. */
  onSubmit: (answer: TAnswer) => void;
  /** True while an answer is being submitted or the session is paused. */
  disabled?: boolean;
}

export type ChallengeComponent = ComponentType<ChallengeComponentProps>;

/**
 * Challenge type -> renderer. Empty for now: each type registers its component here
 * as it is implemented (e.g. `multiple_choice: MultipleChoiceChallenge`).
 */
export const challengeRegistry: Partial<Record<ChallengeTypeKey, ChallengeComponent>> = {};

export function getChallengeComponent(type: ChallengeTypeKey): ChallengeComponent | undefined {
  return challengeRegistry[type];
}

export function isChallengeTypeSupported(type: string): type is ChallengeTypeKey {
  return type in challengeRegistry;
}
