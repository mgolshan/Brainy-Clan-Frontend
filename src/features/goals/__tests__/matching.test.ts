import type { TFunction } from 'i18next';

import type { Category, GoalPlan } from '@/api/types';
import {
  ancestorsAndSelf,
  buildCategoryParents,
  categoryGoalMarker,
  goalMarkerText,
  goalSummary,
  isOnTeam,
  sessionGoalContributions,
} from '@/features/goals/matching';

// i18next-like stub: key plus options, so the chosen string and plural count are visible.
const t = ((key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}:${JSON.stringify(opts)}` : key) as unknown as TFunction;

const cat = (id: number, children: Category[] = []): Category => ({
  id,
  slug: `c${id}`,
  name: `Cat ${id}`,
  icon: null,
  parent_id: null,
  min_age: null,
  max_age: null,
  is_locked: false,
  challenge_types: [],
  children,
});

// 1 Geography ─ 4 World Geography ─ 7 Capitals
//             └ 5 Maps
// 2 Math ─ 6 Mental Math
// 3 Sudoku
const tree = [cat(1, [cat(4, [cat(7)]), cat(5)]), cat(2, [cat(6)]), cat(3)];
const parents = buildCategoryParents(tree);

const goal = (over: Partial<GoalPlan> = {}): GoalPlan => ({
  id: 2,
  name: 'Pizza Friday',
  mode: 'cooperation',
  period_type: 'weekly',
  target_points: 100,
  reward_text: null,
  starts_on: '2026-11-09',
  ends_on: null,
  is_active: true,
  everyone: false,
  all_categories: false,
  scopes: [{ category_id: 4, name: 'World Geography' }],
  members: [
    { member_id: 10, nickname: 'Moe', avatar: null, target_override: null },
    { member_id: 11, nickname: 'Sam', avatar: null, target_override: null },
  ],
  current_period: {
    period_id: 31,
    starts_at: '2026-11-09T05:00:00Z',
    ends_at: '2026-11-16T05:00:00Z',
    status: 'open',
    team_total: 0,
    target_points: 100,
    reached: false,
    entries: [],
  },
  ...over,
});

describe('category ancestry', () => {
  it('maps every node to its parent', () => {
    expect(parents.get(1)).toBeNull();
    expect(parents.get(4)).toBe(1);
    expect(parents.get(7)).toBe(4);
    expect(parents.get(6)).toBe(2);
  });

  it('lists self then ancestors; unknown ids only themselves', () => {
    expect(ancestorsAndSelf(parents, 7)).toEqual([7, 4, 1]);
    expect(ancestorsAndSelf(parents, 3)).toEqual([3]);
    expect(ancestorsAndSelf(parents, 99)).toEqual([99]);
  });

  it('survives an empty tree and a cycle', () => {
    expect(buildCategoryParents(undefined).size).toBe(0);
    const cyclic = new Map<number, number | null>([
      [1, 2],
      [2, 1],
    ]);
    expect(ancestorsAndSelf(cyclic, 1)).toEqual([1, 2]);
  });
});

describe('isOnTeam', () => {
  it('everyone plans include every member; others only listed ones', () => {
    expect(isOnTeam(goal({ everyone: true, members: [] }), 12)).toBe(true);
    expect(isOnTeam(goal(), 10)).toBe(true);
    expect(isOnTeam(goal(), 12)).toBe(false);
    expect(isOnTeam(goal({ everyone: true }), null)).toBe(false);
  });
});

describe('categoryGoalMarker', () => {
  it('marks the scope and its subtree as counting', () => {
    expect(categoryGoalMarker([goal()], parents, 4, 10)).toEqual({
      kind: 'counts',
      goals: [expect.objectContaining({ id: 2 })],
    });
    expect(categoryGoalMarker([goal()], parents, 7, 10)?.kind).toBe('counts');
  });

  it('marks a parent with a scope deeper inside as "inside"', () => {
    expect(categoryGoalMarker([goal()], parents, 1, 10)?.kind).toBe('inside');
  });

  it('does not mark unrelated categories (the Pizza Friday case)', () => {
    expect(categoryGoalMarker([goal()], parents, 6, 10)).toBeNull(); // Mental Math
    expect(categoryGoalMarker([goal()], parents, 3, 10)).toBeNull(); // Sudoku
    expect(categoryGoalMarker([goal()], parents, 5, 10)).toBeNull(); // sibling Maps
  });

  it('does not mark for a member who is not on the team', () => {
    expect(categoryGoalMarker([goal()], parents, 4, 12)).toBeNull();
    expect(categoryGoalMarker([goal({ everyone: true })], parents, 4, 12)?.kind).toBe('counts');
  });

  it('skips all-categories, paused and not-yet-open goals', () => {
    expect(
      categoryGoalMarker([goal({ all_categories: true, scopes: [] })], parents, 4, 10),
    ).toBeNull();
    expect(categoryGoalMarker([goal({ is_active: false })], parents, 4, 10)).toBeNull();
    expect(categoryGoalMarker([goal({ current_period: null })], parents, 4, 10)).toBeNull();
  });

  it('lists every counting goal', () => {
    const other = goal({ id: 3, name: 'Brainy week', scopes: [{ category_id: 1, name: 'Geo' }] });
    expect(categoryGoalMarker([goal(), other], parents, 7, 10)?.goals.map((g) => g.id)).toEqual([
      2, 3,
    ]);
  });
});

describe('goalMarkerText', () => {
  it('names one goal, counts several', () => {
    expect(goalMarkerText({ kind: 'counts', goals: [goal()] }, t)).toEqual({
      kind: 'counts',
      label: 'play.goalCounts:{"name":"Pizza Friday"}',
      a11y: 'play.goalCountsA11y:{"names":"Pizza Friday"}',
    });
    expect(goalMarkerText({ kind: 'inside', goals: [goal(), goal({ id: 3 })] }, t)?.label).toBe(
      'play.goalInsideMany:{"count":2}',
    );
    expect(goalMarkerText(null, t)).toBeNull();
  });
});

describe('sessionGoalContributions', () => {
  it('credits goals whose categories include the session category', () => {
    expect(sessionGoalContributions([goal()], parents, 7, 10, 12)).toEqual([
      { goalId: 2, name: 'Pizza Friday', points: 12 },
    ]);
  });

  it('includes all-categories goals', () => {
    const all = goal({ id: 5, name: 'Any game', all_categories: true, scopes: [] });
    expect(sessionGoalContributions([goal(), all], parents, 3, 10, 4)).toEqual([
      { goalId: 5, name: 'Any game', points: 4 },
    ]);
  });

  it('gives nothing without points, off the team, or for a parent category', () => {
    expect(sessionGoalContributions([goal()], parents, 4, 10, 0)).toEqual([]);
    expect(sessionGoalContributions([goal()], parents, 4, 12, 9)).toEqual([]);
    expect(sessionGoalContributions([goal()], parents, 1, 10, 9)).toEqual([]);
    expect(sessionGoalContributions(undefined, parents, 4, 10, 9)).toEqual([]);
  });
});

describe('goalSummary', () => {
  it('one category · players', () => {
    expect(goalSummary(goal(), t)).toBe('World Geography · goals.summary.players:{"count":2}');
  });

  it('all categories · everyone', () => {
    expect(goalSummary(goal({ all_categories: true, scopes: [], everyone: true }), t)).toBe(
      'goals.summary.allCategories · goals.summary.everyone',
    );
  });

  it('several categories', () => {
    const scopes = [
      { category_id: 4, name: 'World Geography' },
      { category_id: 6, name: 'Mental Math' },
    ];
    expect(goalSummary(goal({ scopes }), t)).toBe(
      'goals.summary.categories:{"count":2} · goals.summary.players:{"count":2}',
    );
  });
});
