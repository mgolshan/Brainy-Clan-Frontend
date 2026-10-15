import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type {
  Envelope,
  NotificationPreferences,
  UpdateNotificationPreferencesBody,
} from '@/api/types';

/**
 * Whose preferences: the signed-in member (`/me/...`) or, for admins, another member
 * (`/family/members/{id}/...`).
 */
function target(memberId?: number) {
  return memberId === undefined
    ? { key: queryKeys.notificationPreferences, path: '/me/notification-preferences' }
    : {
        key: queryKeys.memberNotificationPreferences(memberId),
        path: `/family/members/${memberId}/notification-preferences`,
      };
}

/**
 * `GET /me/notification-preferences` (needs a family), or the admin variant with `memberId`.
 * For the own preferences a 404 (endpoint not deployed) resolves to `null` so callers can hide
 * the entry; for a member, 404/403 stay errors (member gone / not an admin).
 */
export function useNotificationPreferences(memberId?: number) {
  const { key, path } = target(memberId);
  return useQuery({
    queryKey: key,
    queryFn: async ({ signal }): Promise<NotificationPreferences | null> => {
      try {
        return (await api.get<Envelope<NotificationPreferences>>(path, { signal })).data;
      } catch (error) {
        if (memberId === undefined && error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: (count, error) =>
      !(error instanceof ApiError && (error.status === 403 || error.status === 404)) && count < 2,
  });
}

function applyPatch(
  prev: NotificationPreferences,
  body: UpdateNotificationPreferencesBody,
): NotificationPreferences {
  return {
    ...prev,
    ...body,
    types: { ...prev.types, ...body.types },
  };
}

/** `PATCH` the preferences (own or a member's), applied optimistically and rolled back on error. */
export function useUpdateNotificationPreferences(memberId?: number) {
  const client = useQueryClient();
  const { key, path } = target(memberId);
  return useMutation({
    mutationKey: key,
    mutationFn: async (body: UpdateNotificationPreferencesBody) =>
      (await api.patch<Envelope<NotificationPreferences>>(path, body)).data,
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<NotificationPreferences | null>(key);
      if (previous) client.setQueryData(key, applyPatch(previous, body));
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
      void client.invalidateQueries({ queryKey: key });
    },
    onSuccess: (prefs) => {
      // A later toggle may still be in flight: keep its optimistic value until it settles.
      if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, prefs);
    },
  });
}
