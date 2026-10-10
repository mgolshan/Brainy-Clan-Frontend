import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Envelope, Health } from '@/api/types';
import { APP_VERSION } from '@/config/env';
import { isVersionOlder } from '@/lib/version';

/** `GET /health` (public, exempt from the version check). Polled every minute. */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<Health>>('/health', { signal, timeoutMs: 10_000 })).data,
    retry: false,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** True when the API reports a `min_app_version` newer than this build. */
export function useMinVersionGate(): boolean {
  const { data } = useHealth();
  return !!data?.min_app_version && isVersionOlder(APP_VERSION, data.min_app_version);
}
