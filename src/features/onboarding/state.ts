import { ApiError } from '@/api/client';
import type { Onboarding, OnboardingStepKey } from '@/api/types';

/**
 * FTUE onboarding object helpers (pure): tolerant parsing, optimistic updates and the "older
 * server" check (404 on `/me/onboarding*` = the feature is not there; the app hides it).
 */

/** 404 from an onboarding route: the server predates FTUE. */
export function isOnboardingMissing(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Reads the server object defensively: non-string step values count as not done, a malformed
 * body as "nothing done yet" (never crash on an unexpected shape).
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
  return { steps, dismissed_at: typeof dismissed === 'string' && dismissed ? dismissed : null };
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

/** Keys of `keys` not done yet (what still needs a POST). */
export function pendingKeys(
  onboarding: Onboarding | null | undefined,
  keys: readonly OnboardingStepKey[],
): OnboardingStepKey[] {
  return keys.filter((k) => !onboarding?.steps[k]);
}
