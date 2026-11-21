import { ApiError } from '@/api/client';
import type { Onboarding, OnboardingFlow, OnboardingStepKey } from '@/api/types';

/**
 * FTUE onboarding object helpers (pure): tolerant parsing, optimistic updates and the "older
 * server" check (404 on `/me/onboarding*` = the feature is not there; the app hides it).
 */

/** 404 from an onboarding route: the server predates FTUE. */
export function isOnboardingMissing(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Every step key the app knows (server keys outside this list are ignored). */
export const ONBOARDING_STEP_KEYS: readonly OnboardingStepKey[] = [
  'welcome',
  'create_family',
  'pick_world',
  'add_member',
  'co_admin',
  'first_game',
  'first_goal',
  'say_hi',
  'welcome_family',
  'avatar_world',
  'family_goal',
  'classroom_welcome',
  'class_details',
  'roster',
  'code_cards',
  'chat_mode',
  'end_of_year',
  'code_sign_in',
  'tip_play',
  'tip_goals',
  'tip_chat',
  'upgrade_family',
  'upgrade_big_clan',
  'upgrade_classroom',
];

export const ONBOARDING_FLOWS: readonly OnboardingFlow[] = [
  'owner',
  'member',
  'teacher',
  'student',
];

function isStepKey(value: unknown): value is OnboardingStepKey {
  return typeof value === 'string' && (ONBOARDING_STEP_KEYS as readonly string[]).includes(value);
}

/** A server step list: known keys only, no duplicates, none of `exclude`; undefined if not a list. */
function parseStepList(
  raw: unknown,
  exclude: readonly OnboardingStepKey[] = [],
): OnboardingStepKey[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const keys: OnboardingStepKey[] = [];
  for (const key of raw) {
    if (isStepKey(key) && !keys.includes(key) && !exclude.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * Reads the server object defensively: non-string step values count as not done, a malformed
 * body as "nothing done yet" (never crash on an unexpected shape). `flow` / `required_steps` /
 * `optional_steps` are kept only when present and valid (unknown flow or step keys are dropped);
 * without them the app derives the flow from `GET /me` (older servers).
 */
export function parseOnboarding(raw: unknown): Onboarding {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const rawSteps =
    typeof value.steps === 'object' && value.steps !== null && !Array.isArray(value.steps)
      ? (value.steps as Record<string, unknown>)
      : {};
  const steps: Onboarding['steps'] = {};
  for (const [key, at] of Object.entries(rawSteps)) {
    (steps as Record<string, string | null>)[key] = typeof at === 'string' && at ? at : null;
  }
  const dismissed = value.dismissed_at;
  const result: Onboarding = {
    steps,
    dismissed_at: typeof dismissed === 'string' && dismissed ? dismissed : null,
  };
  if (ONBOARDING_FLOWS.includes(value.flow as OnboardingFlow)) {
    result.flow = value.flow as OnboardingFlow;
    // Step lists only count together with a known flow (they describe that flow).
    const required = parseStepList(value.required_steps);
    if (required) {
      result.required_steps = required;
      result.optional_steps = parseStepList(value.optional_steps, required) ?? [];
    }
  }
  return result;
}

/** Optimistic "step done" (keeps an existing `done_at`); no data stays no data. */
export function withStepDone<T extends Onboarding | null | undefined>(
  onboarding: T,
  keys: readonly OnboardingStepKey[],
  nowIso: string,
): T {
  if (!onboarding) return onboarding;
  const steps = { ...onboarding.steps };
  let changed = false;
  for (const key of keys) {
    if (!steps[key]) {
      steps[key] = nowIso;
      changed = true;
    }
  }
  return changed ? { ...onboarding, steps } : onboarding;
}

/** Optimistic dismiss (keeps an existing `dismissed_at`). */
export function withDismissed<T extends Onboarding | null | undefined>(
  onboarding: T,
  nowIso: string,
): T {
  if (!onboarding || onboarding.dismissed_at) return onboarding;
  return { ...onboarding, dismissed_at: nowIso };
}

/** Optimistic "show the checklist again" (step progress is kept). */
export function withRestored<T extends Onboarding | null | undefined>(onboarding: T): T {
  if (!onboarding || !onboarding.dismissed_at) return onboarding;
  return { ...onboarding, dismissed_at: null };
}

/** Keys of `keys` not done yet (what still needs a POST). */
export function pendingKeys(
  onboarding: Onboarding | null | undefined,
  keys: readonly OnboardingStepKey[],
): OnboardingStepKey[] {
  return keys.filter((k) => !onboarding?.steps[k]);
}
