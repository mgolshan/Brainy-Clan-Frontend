import type { Href } from 'expo-router';

import type {
  FamilyTier,
  MePayload,
  Onboarding,
  OnboardingFlow,
  OnboardingStepKey,
  Policy,
} from '@/api/types';
import { isPaidTier, tierRank, type PaidTier } from '@/features/billing/plans';
import { chatTabVisible, effectiveChatMode } from '@/features/chat/modes';

/**
 * FTUE (B12 step 4, `docs/FTUE-CONTRACT.md`), pure logic: which flow a signed-in member gets
 * (the server's `flow` / `required_steps` / `optional_steps` when it sends them, else derived from
 * `GET /me`: tier + role + age band), the ordered steps of that flow, where each step
 * leads, the checklist progress and when the welcome / upgrade sheets and coach marks show. The
 * server stores and derives the step times; the app only reads them (derived steps such as
 * "first game" are never posted by the app).
 */

export type FlowKey = OnboardingFlow;

/**
 * How the copy is worded, from the member's (server) age band: `kid` = fewer words and emoji,
 * `senior` = a text-size hint in the welcome, `standard` otherwise. Presentation only; the rules
 * stay on the server.
 */
export type CopyVariant = 'kid' | 'standard' | 'senior';

export function copyVariant(policy: Pick<Policy, 'age_band'> | undefined): CopyVariant {
  if (policy?.age_band === 'child') return 'kid';
  return policy?.age_band === 'senior' ? 'senior' : 'standard';
}

/** The member's flow, or null without a family membership. */
export function selectFlow(me: MePayload | undefined): FlowKey | null {
  if (!me?.member || !me.family) return null;
  const tier = me.policy.tier ?? me.family.tier;
  if (tier === 'classroom') return me.member.role === 'admin' ? 'teacher' : 'student';
  return me.family.owner_user_id === me.user.id ? 'owner' : 'member';
}

/** The member may use the family chat now (tab listed and not turned off for them). */
function canChat(me: MePayload): boolean {
  return chatTabVisible(me) && me.member?.chat_enabled !== false;
}

export interface FlowStep {
  key: OnboardingStepKey;
  /** Counts toward "n / m" and the celebration (optional steps don't). */
  required: boolean;
}

const req = (key: OnboardingStepKey): FlowStep => ({ key, required: true });

/**
 * The member's flow: the server's when it sends one, else the app's own derivation (older
 * servers).
 */
export function resolveFlow(
  onboarding: Onboarding | null | undefined,
  me: MePayload | undefined,
): FlowKey | null {
  return onboarding?.flow ?? selectFlow(me);
}

/**
 * The ordered steps of the member's flow, derived by the app (empty without a flow). `flow`
 * overrides the derived one (e.g. the server's).
 */
export function flowSteps(me: MePayload | undefined, flowOverride?: FlowKey | null): FlowStep[] {
  const flow = flowOverride ?? selectFlow(me);
  if (!me || !flow) return [];
  const tier = me.policy.tier ?? me.family?.tier;
  switch (flow) {
    case 'owner':
      return [
        req('welcome'),
        req('create_family'),
        req('pick_world'),
        req('add_member'),
        ...(tier === 'big_clan' ? [req('co_admin')] : []),
        req('first_game'),
        req('first_goal'),
        ...(canChat(me) ? [req('say_hi')] : []),
      ];
    case 'member':
      return [req('welcome_family'), req('avatar_world'), req('first_game'), req('family_goal')];
    case 'teacher':
      return [
        req('classroom_welcome'),
        req('class_details'),
        req('roster'),
        req('code_cards'),
        req('chat_mode'),
        req('first_goal'),
        req('end_of_year'),
        { key: 'co_admin', required: false },
      ];
    case 'student':
      return [
        req('code_sign_in'),
        req('avatar_world'),
        req('first_game'),
        req('family_goal'),
        // No chat step when chat is in announcements or off mode.
        ...(effectiveChatMode(me) === 'normal' && canChat(me) ? [req('say_hi')] : []),
      ];
  }
}

/**
 * The checklist steps: the server's `required_steps` then `optional_steps` when it sends them,
 * else the app's derivation for the resolved flow.
 */
export function resolveFlowSteps(
  onboarding: Onboarding | null | undefined,
  me: MePayload | undefined,
): FlowStep[] {
  if (onboarding?.flow && onboarding.required_steps) {
    return [
      ...onboarding.required_steps.map(req),
      ...(onboarding.optional_steps ?? []).map((key) => ({ key, required: false })),
    ];
  }
  return flowSteps(me, resolveFlow(onboarding, me));
}

/** The flow's welcome step (shown as a sheet the first time), or null (students have none). */
export function welcomeStep(flow: FlowKey | null): OnboardingStepKey | null {
  switch (flow) {
    case 'owner':
      return 'welcome';
    case 'member':
      return 'welcome_family';
    case 'teacher':
      return 'classroom_welcome';
    default:
      return null;
  }
}

export type SheetKind = 'welcome' | 'chatMode' | 'endOfYear';

/**
 * What tapping a step does:
 * - `route`: open a screen; `mark` = the app marks the (manual) step done on open;
 * - `sheet`: open an FTUE sheet (it marks the step when the user finishes it);
 * - `none`: nothing to open (e.g. "you signed in").
 * Derived steps never mark: the server ticks them from real data.
 */
export type StepAction =
  | { kind: 'route'; href: Href; mark: boolean }
  | { kind: 'sheet'; sheet: SheetKind }
  | { kind: 'none' };

export function stepAction(key: OnboardingStepKey, flow: FlowKey): StepAction {
  switch (key) {
    case 'welcome':
    case 'welcome_family':
    case 'classroom_welcome':
      return { kind: 'sheet', sheet: 'welcome' };
    case 'chat_mode':
      return { kind: 'sheet', sheet: 'chatMode' };
    case 'end_of_year':
      return { kind: 'sheet', sheet: 'endOfYear' };
    case 'pick_world':
    case 'avatar_world':
      return { kind: 'route', href: '/profile', mark: true };
    case 'family_goal':
      return { kind: 'route', href: '/goals', mark: true };
    case 'create_family':
      return { kind: 'route', href: '/family', mark: false };
    case 'add_member':
    case 'co_admin':
      return { kind: 'route', href: '/invite', mark: false };
    case 'first_game':
      return { kind: 'route', href: '/play', mark: false };
    case 'first_goal':
      return {
        kind: 'route',
        href: {
          pathname: '/goals/new',
          params: { template: flow === 'teacher' ? 'class' : 'pizza' },
        },
        mark: false,
      };
    case 'say_hi':
      return { kind: 'route', href: '/chat', mark: false };
    case 'class_details':
      return { kind: 'route', href: '/classroom/consent', mark: false };
    case 'roster':
      return { kind: 'route', href: '/classroom/roster', mark: false };
    case 'code_cards':
      return { kind: 'route', href: '/classroom/codes', mark: false };
    default:
      return { kind: 'none' };
  }
}

/** Steps the server derives from real data (the app never posts them). */
export const DERIVED_STEPS: readonly OnboardingStepKey[] = [
  'create_family',
  'add_member',
  'co_admin',
  'first_game',
  'first_goal',
  'say_hi',
  'class_details',
  'roster',
  'code_cards',
  'code_sign_in',
];

export function isDerivedStep(key: OnboardingStepKey): boolean {
  return DERIVED_STEPS.includes(key);
}

/** The step that must be done before this one can be opened (Classroom tools order). */
export function stepBlockedBy(key: OnboardingStepKey): OnboardingStepKey | null {
  if (key === 'roster') return 'class_details';
  if (key === 'code_cards') return 'roster';
  return null;
}

export function isStepDone(onboarding: Onboarding | null | undefined, key: string): boolean {
  const steps = onboarding?.steps as Record<string, string | null | undefined> | undefined;
  return !!steps?.[key];
}

export interface ChecklistItem extends FlowStep {
  done: boolean;
  /** Waits for an earlier step (shown with a hint, not tappable). */
  locked: boolean;
}

export interface Checklist {
  items: ChecklistItem[];
  /** Required steps done / required steps. */
  done: number;
  total: number;
  /** The first open, unlocked step (required before optional), or null. */
  next: OnboardingStepKey | null;
  /** Every required step is done (the card celebrates). */
  complete: boolean;
}

export function checklist(onboarding: Onboarding, steps: readonly FlowStep[]): Checklist {
  const items = steps.map((s) => {
    const blocker = stepBlockedBy(s.key);
    const done = isStepDone(onboarding, s.key);
    const locked =
      !done &&
      blocker !== null &&
      steps.some((o) => o.key === blocker) &&
      !isStepDone(onboarding, blocker);
    return { ...s, done, locked };
  });
  const required = items.filter((i) => i.required);
  const done = required.filter((i) => i.done).length;
  const open = (i: ChecklistItem) => !i.done && !i.locked;
  const next = (required.find(open) ?? items.find(open))?.key ?? null;
  return {
    items,
    done,
    total: required.length,
    next,
    complete: required.length > 0 && done === required.length,
  };
}

/** The checklist card shows: server has onboarding, member has a flow, not dismissed. */
export function checklistVisible(
  onboarding: Onboarding | null | undefined,
  flow: FlowKey | null,
): onboarding is Onboarding {
  return !!onboarding && flow !== null && !onboarding.dismissed_at;
}

/** The welcome sheet opens by itself the first time (until done or the checklist is dismissed). */
export function shouldShowWelcome(
  onboarding: Onboarding | null | undefined,
  flow: FlowKey | null,
): boolean {
  const key = welcomeStep(flow);
  return checklistVisible(onboarding, flow) && key !== null && !isStepDone(onboarding, key);
}

export function upgradeStepKey(tier: PaidTier): OnboardingStepKey {
  return `upgrade_${tier}`;
}

/**
 * What closing the welcome marks: the welcome step, plus the current paid tier's "what's new"
 * (the welcome already covers the plan, so the upgrade sheet never follows it).
 */
export function welcomeMarks(
  flow: FlowKey | null,
  tier: FamilyTier | undefined,
): OnboardingStepKey[] {
  const key = welcomeStep(flow);
  if (!key) return [];
  return isPaidTier(tier) ? [key, upgradeStepKey(tier)] : [key];
}

/**
 * The tier whose one-time "what's new for you" sheet is due, or null. Family admins only, on a
 * paid tier, after the welcome (or after hiding the checklist), and only when no sheet of the
 * same or a higher-ranked tier was shown (a downgrade never shows one).
 */
export function upgradeSheetTier(
  onboarding: Onboarding | null | undefined,
  me: MePayload | undefined,
): PaidTier | null {
  if (!onboarding || !me?.member || me.member.role !== 'admin') return null;
  const tier = me.policy.tier;
  if (!isPaidTier(tier)) return null;
  const flow = resolveFlow(onboarding, me);
  const welcome = welcomeStep(flow);
  const welcomed =
    !!onboarding.dismissed_at || (welcome !== null && isStepDone(onboarding, welcome));
  if (!welcomed) return null;
  const rank = tierRank(tier);
  const seenHigher = (['family', 'big_clan', 'classroom'] as const).some(
    (t) => tierRank(t) >= rank && isStepDone(onboarding, upgradeStepKey(t)),
  );
  return seenHigher ? null : tier;
}

export type TipKey = 'tip_play' | 'tip_goals' | 'tip_chat';

/** A coach mark shows once: server knows it, not done, not already shown in this app run. */
export function tipVisible(
  onboarding: Onboarding | null | undefined,
  tip: TipKey,
  seenThisRun: boolean,
): boolean {
  return !!onboarding && !seenThisRun && !isStepDone(onboarding, tip);
}

/**
 * The i18n id of a step's label (`onboarding.steps.<id>` / `onboarding.hints.<id>`): one key
 * serves several flows, so the words follow the flow (family vs class) and the copy variant.
 */
export type StepLabelId =
  | 'welcome'
  | 'createFamily'
  | 'pickWorld'
  | 'addMember'
  | 'coAdmin'
  | 'firstGame'
  | 'firstGoal'
  | 'sayHi'
  | 'welcomeFamily'
  | 'avatarWorld'
  | 'familyGoal'
  | 'classroomWelcome'
  | 'classDetails'
  | 'roster'
  | 'codeCards'
  | 'chatMode'
  | 'classGoal'
  | 'endOfYear'
  | 'coTeacher'
  | 'codeSignIn'
  | 'avatar'
  | 'classGoalSeen'
  | 'welcomeFamilyKid'
  | 'avatarWorldKid'
  | 'firstGameKid'
  | 'familyGoalKid'
  | 'codeSignInKid'
  | 'avatarKid'
  | 'classGoalSeenKid'
  | 'sayHiKid';

export function stepLabelId(
  key: OnboardingStepKey,
  flow: FlowKey,
  variant: CopyVariant,
): StepLabelId {
  const kid = variant === 'kid' && (flow === 'member' || flow === 'student');
  switch (key) {
    case 'welcome':
      return 'welcome';
    case 'create_family':
      return 'createFamily';
    case 'pick_world':
      return 'pickWorld';
    case 'add_member':
      return 'addMember';
    case 'co_admin':
      return flow === 'teacher' ? 'coTeacher' : 'coAdmin';
    case 'first_game':
      return kid ? 'firstGameKid' : 'firstGame';
    case 'first_goal':
      return flow === 'teacher' ? 'classGoal' : 'firstGoal';
    case 'say_hi':
      return kid ? 'sayHiKid' : 'sayHi';
    case 'welcome_family':
      return kid ? 'welcomeFamilyKid' : 'welcomeFamily';
    case 'avatar_world':
      if (flow === 'student') return kid ? 'avatarKid' : 'avatar';
      return kid ? 'avatarWorldKid' : 'avatarWorld';
    case 'family_goal':
      if (flow === 'student') return kid ? 'classGoalSeenKid' : 'classGoalSeen';
      return kid ? 'familyGoalKid' : 'familyGoal';
    case 'classroom_welcome':
      return 'classroomWelcome';
    case 'class_details':
      return 'classDetails';
    case 'roster':
      return 'roster';
    case 'code_cards':
      return 'codeCards';
    case 'chat_mode':
      return 'chatMode';
    case 'end_of_year':
      return 'endOfYear';
    case 'code_sign_in':
      return kid ? 'codeSignInKid' : 'codeSignIn';
    default:
      // Tips and upgrade sheets are never checklist rows.
      return 'welcome';
  }
}
