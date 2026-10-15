import { makeRedirectUri, useAuthRequest, type AuthRequestConfig } from 'expo-auth-session';
import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';

import type { SocialProvider } from '@/api/types';
import {
  SocialProviderError,
  type ProviderCredential,
  type ProviderTokenSource,
} from '@/features/auth/social/types';

/** Web redirect target (register `<origin>/oauth-callback` with the provider). */
export const WEB_REDIRECT_PATH = 'oauth-callback';

export function webRedirectUri(): string {
  return makeRedirectUri({ path: WEB_REDIRECT_PATH });
}

interface BrowserOAuthOptions {
  provider: SocialProvider;
  available: boolean;
  authorizationEndpoint: string;
  config: Omit<AuthRequestConfig, 'redirectUri'> & { redirectUri?: string };
  /** Query/fragment parameter holding the token in the redirect (`id_token`, `access_token`). */
  tokenParam: string;
}

/**
 * Implicit-grant OAuth in the system browser (popup on web) via expo-auth-session. Used for
 * Facebook everywhere and for Google on web. The request is prepared ahead of the tap so the web
 * popup opens synchronously from the click (popup blockers).
 */
export function useBrowserOAuth({
  provider,
  available,
  authorizationEndpoint,
  config,
  tokenParam,
}: BrowserOAuthOptions): ProviderTokenSource {
  const discovery = useMemo(() => ({ authorizationEndpoint }), [authorizationEndpoint]);
  const [request, , promptAsync] = useAuthRequest(
    { ...config, redirectUri: config.redirectUri ?? webRedirectUri() },
    discovery,
  );

  const getToken = useCallback(async (): Promise<ProviderCredential | null> => {
    const result = await promptAsync();
    if (result.type === 'success') {
      const token = result.params[tokenParam];
      if (!token) throw new SocialProviderError(provider, `No ${tokenParam} in the redirect`);
      return { token };
    }
    if (result.type === 'error') {
      // e.g. Facebook `error=access_denied` when the user taps "Cancel" on the dialog.
      if (result.params.error === 'access_denied') return null;
      throw new SocialProviderError(
        provider,
        result.error?.description ?? result.params.error_description ?? 'OAuth error',
        result.params.error,
      );
    }
    return null; // cancel / dismiss / locked
  }, [promptAsync, provider, tokenParam]);

  const ready = available && !!request;
  return useMemo(
    () => ({ provider, available, ready, getToken }),
    [provider, available, ready, getToken],
  );
}

export const isWeb = Platform.OS === 'web';
