import { ResponseType } from 'expo-auth-session';

import { providerConfigured, socialConfig } from '@/features/auth/social/config';
import type { ProviderTokenSource } from '@/features/auth/social/types';
import { isWeb, useBrowserOAuth } from '@/features/auth/social/useBrowserOAuth';

/** Graph API version of the login dialog. */
const FACEBOOK_DIALOG = 'https://www.facebook.com/v23.0/dialog/oauth';

/**
 * Facebook on every platform: the Facebook Login dialog in the system browser (popup on web)
 * returning a user **access token** (what `/auth/social/facebook` expects). Native builds get the
 * redirect on `fb<APP_ID>://authorize` (scheme registered in app.config.ts).
 */
export function useFacebookToken(): ProviderTokenSource {
  const appId = socialConfig.facebookAppId;
  return useBrowserOAuth({
    provider: 'facebook',
    available: providerConfigured('facebook'),
    authorizationEndpoint: FACEBOOK_DIALOG,
    tokenParam: 'access_token',
    config: {
      clientId: appId,
      responseType: ResponseType.Token,
      usePKCE: false,
      scopes: ['public_profile', 'email'],
      redirectUri: isWeb ? undefined : `fb${appId}://authorize`,
      extraParams: isWeb ? {} : { display: 'touch' },
    },
  });
}
