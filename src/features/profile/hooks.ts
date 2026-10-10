import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type {
  Envelope,
  FamilyPayload,
  MePayload,
  MeStats,
  Member,
  UpdateAccessibilityBody,
  UpdateMeBody,
  User,
} from '@/api/types';

/** `GET /me/stats`: points and streak. */
export function useMeStats() {
  return useQuery({
    queryKey: queryKeys.meStats,
    queryFn: async ({ signal }) => (await api.get<Envelope<MeStats>>('/me/stats', { signal })).data,
  });
}

/** `PATCH /me` (display name, avatar, locale). */
export function useUpdateMe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateMeBody) => (await api.patch<Envelope<User>>('/me', body)).data,
    onSuccess: (user) => {
      client.setQueryData<MePayload>(queryKeys.me, (prev) => (prev ? { ...prev, user } : prev));
      void client.invalidateQueries({ queryKey: queryKeys.family });
    },
  });
}

/**
 * `PATCH /me/accessibility`, applied optimistically so the theme / text size changes instantly
 * (the ThemeProvider reads them from the `me` query). Rolled back on error.
 */
export function useUpdateAccessibility() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateAccessibilityBody) =>
      (await api.patch<Envelope<Member>>('/me/accessibility', body)).data,
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: queryKeys.me });
      const previous = client.getQueryData<MePayload>(queryKeys.me);
      client.setQueryData<MePayload>(queryKeys.me, (prev) =>
        prev?.member
          ? {
              ...prev,
              member: { ...prev.member, accessibility: { ...prev.member.accessibility, ...body } },
            }
          : prev,
      );
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) client.setQueryData(queryKeys.me, context.previous);
    },
    onSuccess: (member) => {
      client.setQueryData<MePayload>(queryKeys.me, (prev) => (prev ? { ...prev, member } : prev));
      client.setQueryData<FamilyPayload>(queryKeys.family, (prev) =>
        prev
          ? { ...prev, members: prev.members.map((m) => (m.id === member.id ? member : m)) }
          : prev,
      );
    },
  });
}
