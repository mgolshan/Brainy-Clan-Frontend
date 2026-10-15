import { useMemo } from 'react';

import type { SocialProvider } from '@/api/types';
import { fakeSocial } from '@/features/auth/social/config';
import type { ProviderTokenSource } from '@/features/auth/social/types';
import { useAppleToken } from '@/features/auth/social/useAppleToken';
import { useFacebookToken } from '@/features/auth/social/useFacebookToken';
import { useGoogleToken } from '@/features/auth/social/useGoogleToken';

function fakeSource(provider: SocialProvider): ProviderTokenSource {
  return {
    provider,
    available: true,
    ready: true,
    getToken: async () => ({ token: `dev-fake-${provider}-token` }),
  };
}

/**
 * The social providers this build can offer, in display order (Apple first on iOS, as prominent as
 * the others per App Review, then Google, Facebook). Providers that aren't configured or can't run
 * here (e.g. Expo Go) are left out, so no broken button shows. The dev fake never includes Apple:
 * its button is Apple's native view (iOS builds only).
 */
export function useSocialProviders(): ProviderTokenSource[] {
  const apple = useAppleToken();
  const google = useGoogleToken();
  const facebook = useFacebookToken();
  return useMemo(() => {
    if (__DEV__ && fakeSocial) return [fakeSource('google'), fakeSource('facebook')];
    return [apple, google, facebook].filter((p) => p.available);
  }, [apple, google, facebook]);
}
