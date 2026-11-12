import type {
  CreateGoalBody,
  GoalMode,
  GoalPeriodType,
  GoalPlan,
  UpdateGoalBody,
} from '@/api/types';

/**
 * The goal wizard's form state and the request bodies built from it (pure, tested). The wizard
 * creates a plan (`POST /goals`) or edits one (`PATCH /goals/{plan}`, changes apply from the next
 * period). Contract 2026-11-11: `everyone` (whole family, newcomers join automatically) and
 * `all_categories` (any category counts).
 */
export interface GoalFormState {
  name: string;
  mode: GoalMode;
  period: GoalPeriodType;
  /** Raw text of the target field. */
  target: string;
  reward: string;
  allCategories: boolean;
  /** Picked category ids (ignored with `allCategories`). */
  categoryIds: number[];
  everyone: boolean;
  /** Members left out of a hand-picked team (ignored with `everyone`). */
  excluded: number[];
  /** Competition: own target per member id (raw text; empty = the plan target). */
  overrides: Record<number, string>;
}

/** A new goal: the whole family, categories still to pick ("All categories" is one tap away). */
export const NEW_GOAL_FORM: GoalFormState = {
  name: '',
  mode: 'cooperation',
  period: 'weekly',
  target: '100',
  reward: '',
  allCategories: false,
  categoryIds: [],
  everyone: true,
  excluded: [],
  overrides: {},
};

/** Form state for editing an existing plan. `familyMemberIds`: the family's current members. */
export function formFromGoal(goal: GoalPlan, familyMemberIds: readonly number[]): GoalFormState {
  const onTeam = new Set(goal.members.map((m) => m.member_id));
  const overrides: Record<number, string> = {};
  for (const m of goal.members) {
    if (m.target_override !== null) overrides[m.member_id] = String(m.target_override);
  }
  return {
    name: goal.name,
    mode: goal.mode,
    period: goal.period_type,
    target: String(goal.target_points),
    reward: goal.reward_text ?? '',
    allCategories: goal.all_categories === true,
    categoryIds: goal.all_categories === true ? [] : goal.scopes.map((s) => s.category_id),
    everyone: goal.everyone === true,
    excluded: goal.everyone === true ? [] : familyMemberIds.filter((id) => !onTeam.has(id)),
    overrides,
  };
}

export function parseTarget(text: string): number | null {
  const n = Number(text);
  return text.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= 10000 ? n : null;
}

/** Members on the team: everyone, or the family minus the excluded ones. */
export function teamMemberIds(form: GoalFormState, familyMemberIds: readonly number[]): number[] {
  if (form.everyone) return [...familyMemberIds];
  const excluded = new Set(form.excluded);
  return familyMemberIds.filter((id) => !excluded.has(id));
}

/** A valid own target (competition only), else `undefined` (the plan target applies). */
function overrideFor(form: GoalFormState, memberId: number): number | undefined {
  if (form.mode !== 'competition') return undefined;
  const raw = form.overrides[memberId]?.trim();
  if (!raw) return undefined;
  return parseTarget(raw) ?? undefined;
}

/** The categories step is complete: all categories, or at least one picked. */
export function categoriesValid(form: GoalFormState): boolean {
  return form.allCategories || form.categoryIds.length > 0;
}

/** The target step is complete: a valid target and a team of at least one member. */
export function targetStepValid(form: GoalFormState, familyMemberIds: readonly number[]): boolean {
  return (
    parseTarget(form.target) !== null &&
    (form.everyone || teamMemberIds(form, familyMemberIds).length > 0)
  );
}

/**
 * Fields shared by create and edit. `everyone: true` sends `members` only to carry own targets;
 * `everyone: false` sends the hand-picked team (≥ 1).
 */
function commonFields(form: GoalFormState, familyMemberIds: readonly number[]) {
  const members = teamMemberIds(form, familyMemberIds).map((id) => {
    const o = overrideFor(form, id);
    return o === undefined ? { member_id: id } : { member_id: id, target_override: o };
  });
  const withOverrides = members.filter((m) => 'target_override' in m);
  return {
    name: form.name.trim(),
    mode: form.mode,
    period_type: form.period,
    target_points: parseTarget(form.target) ?? 0,
    ...(form.allCategories
      ? { all_categories: true as const }
      : { all_categories: false as const, category_ids: [...form.categoryIds] }),
    everyone: form.everyone,
    ...(form.everyone ? (withOverrides.length > 0 ? { members: withOverrides } : {}) : { members }),
  };
}

export function buildCreateBody(
  form: GoalFormState,
  familyMemberIds: readonly number[],
  startsOn: string,
): CreateGoalBody {
  const reward = form.reward.trim();
  return {
    ...commonFields(form, familyMemberIds),
    ...(reward ? { reward_text: reward } : {}),
    starts_on: startsOn,
  };
}

/**
 * `PATCH /goals/{plan}`: every editable field (the start date stays). An emptied reward clears
 * it (`null`). `members` is always the whole team, so own targets that were removed are cleared
 * too. Switching `everyone` on adds the missing members right away (server).
 */
export function buildUpdateBody(
  form: GoalFormState,
  familyMemberIds: readonly number[],
): UpdateGoalBody {
  const reward = form.reward.trim();
  const members = teamMemberIds(form, familyMemberIds).map((id) => {
    const o = overrideFor(form, id);
    return o === undefined ? { member_id: id } : { member_id: id, target_override: o };
  });
  return {
    ...commonFields(form, familyMemberIds),
    members,
    reward_text: reward ? reward : null,
  };
}
