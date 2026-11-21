import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Href } from 'expo-router';

import type { FamilyTier } from '@/api/types';

/**
 * "One sign-up, two doors" (welcome screen): a parent signs up to create a family, a teacher to
 * create a class. Both use the same account and `POST /families`; the intent only changes the
 * app's framing and what happens after the family exists (the paywall opens with Classroom
 * selected). App-only, device-local state: the server never sees it and still decides every
 * rule (age, plan, limits).
 *
 * Lifecycle (`stage`):
 * - `signup`: chosen on the welcome screen (route param `intent` + this store, so it survives the
 *   register → create-family steps, social sign-up included, and an app restart);
 * - `paywall`: the family was just created with the classroom intent; Home opens the paywall once;
 * - `finish`: the paywall was offered; Home shows "Finish setting up your class" until the
 *   family has the Classroom tier or the teacher dismisses it.
 * Cleared once used (family intent after create-family, classroom once the tier is Classroom or
 * the card is dismissed), when the user signs in to an existing account, and on sign-out.
 */

export const SIGNUP_INTENTS = ['family', 'classroom'] as const;
export type SignupIntent = (typeof SIGNUP_INTENTS)[number];
export type IntentStage = 'signup' | 'paywall' | 'finish';

/** A route param (string, string[] or missing) as an intent, or null. */
export function parseIntent(param: unknown): SignupIntent | null {
  const value = Array.isArray(param) ? param[0] : param;
  return SIGNUP_INTENTS.find((i) => i === value) ?? null;
}

/** The intent a sign-up screen works with: its route param, else the stored one, else family. */
export function resolveIntent(param: unknown, stored: SignupIntent | null): SignupIntent {
  return parseIntent(param) ?? stored ?? 'family';
}

/** The register screen for a door of the welcome screen (the intent rides along as a param). */
export function signupHref(intent: SignupIntent): Href {
  return { pathname: '/register', params: { intent } };
}

/** The plan picker with Classroom selected (after a teacher created their class). */
export const CLASSROOM_PAYWALL_HREF: Href = {
  pathname: '/family-plan',
  params: { plan: 'classroom' },
};

interface SignupIntentState {
  intent: SignupIntent | null;
  stage: IntentStage;
  /** Starts (or switches) a sign-up with this intent. */
  choose: (intent: SignupIntent) => void;
  /** Moves the classroom intent on to the paywall step. */
  setStage: (stage: IntentStage) => void;
  clear: () => void;
}

export const useSignupIntent = create<SignupIntentState>()(
  persist(
    (set) => ({
      intent: null,
      stage: 'signup',
      choose: (intent) => set({ intent, stage: 'signup' }),
      setStage: (stage) => set({ stage }),
      clear: () => set({ intent: null, stage: 'signup' }),
    }),
    {
      name: 'brainyclan.signup-intent',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ intent: s.intent, stage: s.stage }),
    },
  ),
);

/**
 * After `POST /families` succeeded: the classroom intent goes on to the paywall step, a family
 * intent is used up. Called from the create-family mutation itself (it runs even when the screen
 * has already been replaced by Home).
 */
export function signupIntentAfterFamilyCreated(): void {
  const { intent, clear, setStage } = useSignupIntent.getState();
  if (intent === 'classroom') setStage('paywall');
  else clear();
}

/** Keeps the intent for a sign-up started now (register submit, social sign-up). */
export function startSignup(intent: SignupIntent): void {
  const state = useSignupIntent.getState();
  if (state.intent !== intent || state.stage !== 'signup') state.choose(intent);
}

export type HomeIntentAction = 'none' | 'clear' | 'openPaywall' | 'showCard';

/**
 * What Home does with the stored intent:
 * - `clear`: nothing left to do (family intent; a family that wasn't created in this sign-up,
 *   e.g. signing in to an existing account; already on Classroom; not an admin);
 * - `openPaywall`: open the plan picker with Classroom selected (once; only where it can sell);
 * - `showCard`: the "Finish setting up your class" card.
 * `none` without an intent or while the membership is still loading.
 */
export function homeIntentAction(
  state: { intent: SignupIntent | null; stage: IntentStage },
  ctx: {
    tier: FamilyTier | undefined;
    /** Null while the membership isn't loaded yet (right after `POST /families`). */
    isAdmin: boolean | null;
    canBuy: boolean;
  },
): HomeIntentAction {
  if (state.intent === null || ctx.isAdmin === null) return 'none';
  if (state.intent !== 'classroom' || state.stage === 'signup') return 'clear';
  if (ctx.tier === 'classroom' || !ctx.isAdmin) return 'clear';
  if (state.stage === 'paywall' && ctx.canBuy) return 'openPaywall';
  return 'showCard';
}
