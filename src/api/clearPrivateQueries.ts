import type { QueryClient } from '@tanstack/react-query';

import { isPublicQueryKey } from '@/api/queryKeys';

/**
 * Drops every cached server response that belongs to an account (on sign-out), plus pending
 * mutations. Public queries (`/health`, `/legal`) stay: they are mounted above the auth groups
 * (version gate) or on the sign-up screens, and removing them would cancel their in-flight
 * request while the mounted observers keep pointing at the removed query, so they would never
 * load (no links on the sign-up forms, no minimum-version check).
 */
export function clearPrivateQueries(client: QueryClient): void {
  client.removeQueries({ predicate: (query) => !isPublicQueryKey(query.queryKey) });
  client.getMutationCache().clear();
}
