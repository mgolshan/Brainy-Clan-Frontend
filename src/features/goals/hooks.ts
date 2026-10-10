import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
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

export function useDeleteGoal(id: number) {
  const done = useInvalidateGoals();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/goals/${id}`);
    },
    onSuccess: () => done(),
  });
}

/** The goal to feature on Home: first active plan with an open period. */
export function pickMainGoal(goals: GoalPlan[] | undefined): GoalPlan | undefined {
  return goals?.find((g) => g.is_active && g.current_period) ?? goals?.find((g) => g.is_active);
}
