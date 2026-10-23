import { useQuery } from '@tanstack/react-query';

import { ApiError, api, isApiError } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type { Envelope, WorldCatalogEntry } from '@/api/types';
import { useIsAdmin, useMe } from '@/features/auth/hooks';
import { parseWorldCatalog, type World } from '@/features/worlds/catalog';

async function fetchCatalog(path: string, signal: AbortSignal): Promise<World[] | null> {
  try {
    return parseWorldCatalog((await api.get<Envelope<WorldCatalogEntry[]>>(path, { signal })).data);
  } catch (error) {
    // Backend without worlds yet (404): the picker falls back to every world, unlocked.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * `GET /me/worlds`: the signed-in member's catalog (known worlds only, server order), or `null`
 * when the backend doesn't serve it. Not cached server-side: points/streaks change during play,
 * so it is invalidated after answers, finished sessions and plan changes (`invalidateWorlds`).
 */
export function useMyWorlds() {
  const hasMember = !!useMe().data?.member;
  return useQuery({
    queryKey: queryKeys.myWorlds,
    queryFn: ({ signal }) => fetchCatalog('/me/worlds', signal),
    enabled: hasMember,
  });
}

/** `GET /family/members/{member}/worlds` (admin): what the admin editor may pick for that member. */
export function useMemberWorlds(memberId: number) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: queryKeys.memberWorlds(memberId),
    queryFn: ({ signal }) => fetchCatalog(`/family/members/${memberId}/worlds`, signal),
    enabled: isAdmin,
  });
}

/**
 * Marks every world catalog stale (own + admin views of members). Inactive queries refetch when
 * their screen shows again.
 */
export function invalidateWorlds(): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        (key[0] === 'me' && key[1] === 'worlds') ||
        (key[0] === 'family' && key[1] === 'members' && key[3] === 'worlds')
      );
    },
  });
}

/**
 * A `PATCH` raced an unlock change (403 `world_locked`): refetch the catalogs and the member
 * so the picker shows the truth. Returns whether the error was that one.
 */
export function recoverFromWorldLocked(error: unknown): boolean {
  if (!isApiError(error, 'world_locked')) return false;
  void invalidateWorlds();
  void queryClient.invalidateQueries({ queryKey: queryKeys.me, exact: true });
  void queryClient.invalidateQueries({ queryKey: queryKeys.family, exact: true });
  return true;
}
