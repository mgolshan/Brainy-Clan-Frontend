import { useQuery } from '@tanstack/react-query';

import { ApiError, api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Envelope, Subscription } from '@/api/types';
import { useIsAdmin, usePolicy } from '@/features/auth/hooks';

/**
 * `GET /family/subscription` (admins only, never for children).
 * Resolves to `null` on 404 (endpoint not deployed yet) so callers can hide the section.
 */
export function useSubscription() {
  const isAdmin = useIsAdmin();
  const policy = usePolicy();
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async ({ signal }): Promise<Subscription | null> => {
      try {
        return (await api.get<Envelope<Subscription>>('/family/subscription', { signal })).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: isAdmin && policy?.is_child === false,
  });
}
