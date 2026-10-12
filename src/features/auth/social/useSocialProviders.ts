import { useMemo } from 'react';

import type { SocialProvider } from '@/api/types';
import { fakeSocial } from '@/features/auth/social/config';
import type { ProviderTokenSource } from '@/features/auth/social/types';
import { useFacebookToken } from '@/features/auth/social/useFacebookToken';
import { useGoogleToken } from '@/features/auth/social/useGoogleToken';

function fakeSource(provider: SocialProvider): ProviderTokenSource {
  return {
    provider,
    available: true,
    ready: true,
    getToken: async () => `dev-fake-${provider}-token`,
  };
}

/**
 * The social providers this build can offer, in display order (Google, Facebook). Providers that
 * aren't configured or can't run here (e.g. Expo Go) are left out, so no broken button shows.
 */
export function useSocialProviders(): ProviderTokenSource[] {
  const google = useGoogleToken();
  const facebook = useFacebookToken();
  return useMemo(() => {
    if (__DEV__ && fakeSocial) return [fakeSource('google'), fakeSource('facebook')];
    return [google, facebook].filter((p) => p.available);
  }, [google, facebook]);
}
