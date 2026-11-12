import type { GoalPlan } from '@/api/types';
import {
  NEW_GOAL_FORM,
  buildCreateBody,
  buildUpdateBody,
  categoriesValid,
  formFromGoal,
  parseTarget,
  targetStepValid,
  type GoalFormState,
} from '@/features/goals/goalForm';

const family = [10, 11, 12];
const form = (over: Partial<GoalFormState> = {}): GoalFormState => ({
  ...NEW_GOAL_FORM,
  name: ' Pizza Friday ',
  ...over,
});

describe('new goal defaults', () => {
  it('whole family on, all categories off', () => {
    expect(NEW_GOAL_FORM.everyone).toBe(true);
    expect(NEW_GOAL_FORM.allCategories).toBe(false);
  });
});

describe('validation', () => {
  it('categories: all, or at least one picked', () => {
    expect(categoriesValid(form())).toBe(false);
    expect(categoriesValid(form({ allCategories: true }))).toBe(true);
    expect(categoriesValid(form({ categoryIds: [4] }))).toBe(true);
  });

  it('target 1–10000 and a non-empty team', () => {
    expect(parseTarget('0')).toBeNull();
    expect(parseTarget('10001')).toBeNull();
    expect(parseTarget('')).toBeNull();
    expect(parseTarget('50')).toBe(50);
    expect(targetStepValid(form(), family)).toBe(true);
    expect(targetStepValid(form({ everyone: false, excluded: family }), family)).toBe(false);
    expect(targetStepValid(form({ target: 'x' }), family)).toBe(false);
  });
});

describe('buildCreateBody', () => {
  it('everyone + all categories: no category_ids, no members', () => {
    expect(buildCreateBody(form({ allCategories: true }), family, '2026-11-11')).toEqual({
      name: 'Pizza Friday',
      mode: 'cooperation',
      period_type: 'weekly',
      target_points: 100,
      all_categories: true,
      everyone: true,
      starts_on: '2026-11-11',
    });
  });

  it('picked categories and a hand-picked team', () => {
    const body = buildCreateBody(
      form({ categoryIds: [4, 6], everyone: false, excluded: [12], reward: ' 🍕 ' }),
      family,
      '2026-11-11',
    );
    expect(body).toMatchObject({
      all_categories: false,
      category_ids: [4, 6],
      everyone: false,
      members: [{ member_id: 10 }, { member_id: 11 }],
      reward_text: '🍕',
    });
  });

  it('everyone in a race sends members only for own targets', () => {
    const body = buildCreateBody(
      form({ mode: 'competition', categoryIds: [4], overrides: { 11: '20', 12: '' } }),
      family,
      '2026-11-11',
    );
    expect(body.everyone).toBe(true);
    expect(body.members).toEqual([{ member_id: 11, target_override: 20 }]);
  });

  it('ignores own targets in team mode', () => {
    const body = buildCreateBody(
      form({ categoryIds: [4], everyone: false, overrides: { 11: '20' } }),
      family,
      '2026-11-11',
    );
    expect(body.members).toEqual([{ member_id: 10 }, { member_id: 11 }, { member_id: 12 }]);
  });
});

const plan = (over: Partial<GoalPlan> = {}): GoalPlan => ({
  id: 2,
  name: 'Pizza Friday',
  mode: 'competition',
  period_type: 'weekly',
  target_points: 100,
  reward_text: 'Pizza night!',
  starts_on: '2026-10-12',
  ends_on: null,
  is_active: true,
  everyone: false,
  all_categories: false,
  scopes: [{ category_id: 4, name: 'World Geography' }],
  members: [{ member_id: 10, nickname: 'Moe', avatar: null, target_override: 20 }],
  current_period: null,
  ...over,
});

describe('edit', () => {
  it('reads a plan into the form', () => {
    expect(formFromGoal(plan(), family)).toEqual({
      name: 'Pizza Friday',
      mode: 'competition',
      period: 'weekly',
      target: '100',
      reward: 'Pizza night!',
      allCategories: false,
      categoryIds: [4],
      everyone: false,
      excluded: [11, 12],
      overrides: { 10: '20' },
    });
    const all = formFromGoal(plan({ everyone: true, all_categories: true, scopes: [] }), family);
    expect(all.excluded).toEqual([]);
    expect(all.allCategories).toBe(true);
  });

  it('PATCH switches to everyone + all categories, keeps own targets, clears the reward', () => {
    const state = {
      ...formFromGoal(plan(), family),
      everyone: true,
      allCategories: true,
      reward: '',
    };
    expect(buildUpdateBody(state, family)).toEqual({
      name: 'Pizza Friday',
      mode: 'competition',
      period_type: 'weekly',
      target_points: 100,
      all_categories: true,
      everyone: true,
      members: [{ member_id: 10, target_override: 20 }, { member_id: 11 }, { member_id: 12 }],
      reward_text: null,
    });
  });
});
