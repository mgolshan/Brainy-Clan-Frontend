import type { TFunction } from 'i18next';

import type { Category, GoalPlan } from '@/api/types';

/**
 * Pure goal logic (no React, no network): which of the member's goals a category counts toward,
 * what a finished session added to them, and the "what counts · who plays" summary of a card.
 *
 * Mirrors the server rule (API.md "Goals (B6)"): points count toward a plan when they are earned
 * by a plan member, inside the open period, in a category within one of the plan's scopes (a
 * scope includes its whole subtree), or in any category when `all_categories` is set. The app
 * works this out from the category tree it already has (`GET /categories`); no new endpoint.
 */

/** Category id → parent id (`null` for top-level), from the category tree. */
export type CategoryParents = ReadonlyMap<number, number | null>;

export function buildCategoryParents(tree: readonly Category[] | undefined): CategoryParents {
  const parents = new Map<number, number | null>();
  const walk = (nodes: readonly Category[], parent: number | null) => {
    for (const node of nodes) {
      if (parents.has(node.id)) continue;
      parents.set(node.id, parent);
      walk(node.children ?? [], node.id);
    }
  };
  walk(tree ?? [], null);
  return parents;
}

/** The category and all its ancestors (self first). Unknown ids are their own only ancestor. */
export function ancestorsAndSelf(parents: CategoryParents, id: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  let current: number | null | undefined = id;
  while (current !== null && current !== undefined && !seen.has(current)) {
    seen.add(current);
    out.push(current);
    current = parents.get(current);
  }
  return out;
}

/** Whether `ancestor` is a strict ancestor of `id`. */
function isStrictAncestor(parents: CategoryParents, ancestor: number, id: number): boolean {
  return ancestorsAndSelf(parents, id).slice(1).includes(ancestor);
}

/** The member plays for this plan: `everyone` plans include every member. */
export function isOnTeam(goal: GoalPlan, memberId: number | null | undefined): boolean {
  if (memberId === null || memberId === undefined) return false;
  return goal.everyone === true || goal.members.some((m) => m.member_id === memberId);
}

/** Active plan with an open period: points earned now count toward it. */
export function isCounting(goal: GoalPlan): boolean {
  return goal.is_active && goal.current_period?.status === 'open';
}

/** Points in this category count toward the plan (all categories, or within a scope's subtree). */
export function categoryCounts(goal: GoalPlan, parents: CategoryParents, categoryId: number) {
  if (goal.all_categories === true) return true;
  const chain = ancestorsAndSelf(parents, categoryId);
  return goal.scopes.some((s) => chain.includes(s.category_id));
}

/**
 * Marker for a category tile on the Play screens, for the member's counting goals:
 * - `counts`: playing this category counts toward these goals (it is a scope or inside one);
 * - `inside`: some topics inside it count (a scope is deeper in its subtree; drill down).
 * Goals with `all_categories` are left out: they would mark every tile (the goal card says
 * "All categories" instead). `null` when nothing to show.
 */
export type CategoryGoalMarker = { kind: 'counts' | 'inside'; goals: GoalPlan[] } | null;

export function categoryGoalMarker(
  goals: readonly GoalPlan[] | undefined,
  parents: CategoryParents,
  categoryId: number,
  memberId: number | null | undefined,
): CategoryGoalMarker {
  const mine = (goals ?? []).filter(
    (g) => isCounting(g) && isOnTeam(g, memberId) && g.all_categories !== true,
  );
  if (mine.length === 0) return null;
  const counts = mine.filter((g) => categoryCounts(g, parents, categoryId));
  if (counts.length > 0) return { kind: 'counts', goals: counts };
  const inside = mine.filter((g) =>
    g.scopes.some((s) => isStrictAncestor(parents, categoryId, s.category_id)),
  );
  return inside.length > 0 ? { kind: 'inside', goals: inside } : null;
}

/** Tile marker text: "Counts for Pizza Friday" / "Topics for 2 goals", plus a screen-reader sentence. */
export function goalMarkerText(
  marker: CategoryGoalMarker,
  t: TFunction,
): { kind: 'counts' | 'inside'; label: string; a11y: string } | null {
  if (!marker || marker.goals.length === 0) return null;
  const names = marker.goals.map((g) => g.name).join(', ');
  const count = marker.goals.length;
  if (marker.kind === 'counts') {
    return {
      kind: 'counts',
      label:
        count === 1 ? t('play.goalCounts', { name: names }) : t('play.goalCountsMany', { count }),
      a11y: t('play.goalCountsA11y', { names }),
    };
  }
  return {
    kind: 'inside',
    label:
      count === 1 ? t('play.goalInside', { name: names }) : t('play.goalInsideMany', { count }),
    a11y: t('play.goalInsideA11y', { names }),
  };
}

export interface GoalContribution {
  goalId: number;
  name: string;
  points: number;
}

/**
 * What a finished session added to the member's goals ("+12 toward Pizza Friday"): every
 * counting plan the member plays for whose categories include the session's category (all
 * categories included). Nothing when no points were earned.
 */
export function sessionGoalContributions(
  goals: readonly GoalPlan[] | undefined,
  parents: CategoryParents,
  categoryId: number,
  memberId: number | null | undefined,
  points: number,
): GoalContribution[] {
  if (!(points > 0)) return [];
  return (goals ?? [])
    .filter((g) => isCounting(g) && isOnTeam(g, memberId) && categoryCounts(g, parents, categoryId))
    .map((g) => ({ goalId: g.id, name: g.name, points }));
}

/**
 * "World Geography · 4 players", "All categories · Everyone", "2 categories · 3 players":
 * what counts and who plays, for goal cards.
 */
export function goalSummary(
  goal: Pick<GoalPlan, 'all_categories' | 'scopes' | 'everyone' | 'members'>,
  t: TFunction,
): string {
  const what =
    goal.all_categories === true
      ? t('goals.summary.allCategories')
      : goal.scopes.length === 1
        ? goal.scopes[0].name
        : t('goals.summary.categories', { count: goal.scopes.length });
  const who =
    goal.everyone === true
      ? t('goals.summary.everyone')
      : t('goals.summary.players', { count: goal.members.length });
  return `${what} · ${who}`;
}
