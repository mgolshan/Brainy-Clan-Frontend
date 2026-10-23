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
  UpdatePasswordBody,
  User,
} from '@/api/types';
import { recoverFromWorldLocked } from '@/features/worlds/hooks';

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
              member: {
                ...prev.member,
                accessibility: { ...prev.member.accessibility, ...body },
                // The picker only offers unlocked worlds (the server confirms in the response).
                ...(body.theme !== undefined ? { theme_unlocked: true } : {}),
              },
            }
          : prev,
      );
      return { previous };
    },
    onError: (error, _body, context) => {
      if (context?.previous) client.setQueryData(queryKeys.me, context.previous);
      // Raced an unlock change (403 `world_locked`): refetch the catalog + member.
      recoverFromWorldLocked(error);
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

/** `PUT /me/password`: set (first time) or change the email login's password. */
export function useUpdatePassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdatePasswordBody) => {
      await api.put<void>('/me/password', body);
    },
    onSuccess: () => {
      // `has_password` flips on the member; mark it locally, then confirm from the server.
      client.setQueryData<MePayload>(queryKeys.me, (prev) =>
        prev?.member ? { ...prev, member: { ...prev.member, has_password: true } } : prev,
      );
      void client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
