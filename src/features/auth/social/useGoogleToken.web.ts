import { ResponseType } from 'expo-auth-session';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';

import { providerConfigured, socialConfig } from '@/features/auth/social/config';
import type { ProviderTokenSource } from '@/features/auth/social/types';
import { useBrowserOAuth } from '@/features/auth/social/useBrowserOAuth';

/**
 * Google on web: OpenID Connect implicit flow in a popup (`response_type=id_token` with a nonce)
 * with the Web client ID -> the same ID token the native SDKs return.
 */
export function useGoogleToken(): ProviderTokenSource {
  const [nonce] = useState(() => randomUUID());
  return useBrowserOAuth({
    provider: 'google',
    available: providerConfigured('google'),
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenParam: 'id_token',
    config: {
      clientId: socialConfig.googleWebClientId,
      responseType: ResponseType.IdToken,
      usePKCE: false,
      scopes: ['openid', 'email', 'profile'],
      extraParams: { nonce, prompt: 'select_account' },
    },
  });
}
