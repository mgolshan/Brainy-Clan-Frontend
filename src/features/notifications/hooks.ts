import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type {
  Envelope,
  NotificationPreferences,
  UpdateNotificationPreferencesBody,
} from '@/api/types';

/**
 * `GET /me/notification-preferences` (needs a family).
 * Resolves to `null` on 404 (endpoint not deployed yet) so callers can hide the entry.
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: async ({ signal }): Promise<NotificationPreferences | null> => {
      try {
        return (
          await api.get<Envelope<NotificationPreferences>>('/me/notification-preferences', {
            signal,
          })
        ).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
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

/** `PATCH /me/notification-preferences`, applied optimistically and rolled back on error. */
export function useUpdateNotificationPreferences() {
  const client = useQueryClient();
  const key = queryKeys.notificationPreferences;
  return useMutation({
    mutationKey: key,
    mutationFn: async (body: UpdateNotificationPreferencesBody) =>
      (await api.patch<Envelope<NotificationPreferences>>('/me/notification-preferences', body))
        .data,
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
