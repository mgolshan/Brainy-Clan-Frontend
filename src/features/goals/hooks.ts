import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type {
  CreateGoalBody,
  Envelope,
  GoalHistoryEntry,
  GoalPlan,
  Paginated,
  UpdateGoalBody,
} from '@/api/types';

/** `GET /goals`: active plans first, each with `current_period`. */
export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: async ({ signal }) => (await api.get<Envelope<GoalPlan[]>>('/goals', { signal })).data,
  });
}

/** `GET /goals/{plan}`, seeded from the list when available. */
export function useGoal(id: number) {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.goal(id),
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<GoalPlan>>(`/goals/${id}`, { signal })).data,
    enabled: Number.isFinite(id) && id > 0,
    initialData: () => client.getQueryData<GoalPlan[]>(queryKeys.goals)?.find((g) => g.id === id),
    initialDataUpdatedAt: () => client.getQueryState(queryKeys.goals)?.dataUpdatedAt,
  });
}

/** `GET /goals/{plan}/history?page=` (closed periods, newest first, 20 per page). */
export function useGoalHistory(id: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.goalHistory(id),
    queryFn: async ({ pageParam, signal }) =>
      api.get<Paginated<GoalHistoryEntry>>(`/goals/${id}/history?page=${pageParam}`, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    enabled: Number.isFinite(id) && id > 0,
  });
}

function useInvalidateGoals() {
  const client = useQueryClient();
  return (plan?: GoalPlan) => {
    if (plan) client.setQueryData(queryKeys.goal(plan.id), plan);
    void client.invalidateQueries({ queryKey: queryKeys.goals });
  };
}

export function useCreateGoal() {
  const done = useInvalidateGoals();
  return useMutation({
    mutationFn: async (body: CreateGoalBody) =>
      (await api.post<Envelope<GoalPlan>>('/goals', body)).data,
    onSuccess: (plan) => done(plan),
  });
}

export function useUpdateGoal(id: number) {
  const done = useInvalidateGoals();
  return useMutation({
    mutationFn: async (body: UpdateGoalBody) =>
      (await api.patch<Envelope<GoalPlan>>(`/goals/${id}`, body)).data,
    onSuccess: (plan) => done(plan),
  });
}

/** Drop a plan from the cached list (it was deleted, here or elsewhere). */
export function useForgetGoal() {
  const client = useQueryClient();
  return useCallback(
    (id: number) => {
      client.setQueryData<GoalPlan[]>(queryKeys.goals, (list) => list?.filter((g) => g.id !== id));
      // Only the list: a prefix invalidation would refetch the open detail and hit the 404.
      void client.invalidateQueries({ queryKey: queryKeys.goals, exact: true });
    },
    [client],
  );
}

/**
 * `DELETE /goals/{plan}` is a soft delete: the plan vanishes from `GET /goals` and its detail
 * answers 404. The cached list drops it at once; the detail and history caches are removed once
 * no screen shows them (the detail screen navigates away on success).
 */
export function useDeleteGoal(id: number) {
  const client = useQueryClient();
  const forget = useForgetGoal();
  return useMutation({
    mutationFn: async () => {
      try {
        await api.delete(`/goals/${id}`);
      } catch (error) {
        // Already deleted (another admin, another device): same outcome.
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
    },
    onSuccess: () => {
      forget(id);
      client.removeQueries({ queryKey: queryKeys.goal(id), type: 'inactive' });
    },
  });
}

/** True when a goal request failed because the plan no longer exists (deleted). */
export function isGoalGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** The goal to feature on Home: first active plan with an open period. */
export function pickMainGoal(goals: GoalPlan[] | undefined): GoalPlan | undefined {
  return goals?.find((g) => g.is_active && g.current_period) ?? goals?.find((g) => g.is_active);
}
