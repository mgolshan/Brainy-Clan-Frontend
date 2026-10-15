import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';

import { providerConfigured, socialConfig } from '@/features/auth/social/config';
import {
  SocialProviderError,
  type ProviderCredential,
  type ProviderTokenSource,
} from '@/features/auth/social/types';

type NitroGoogle = typeof import('react-native-nitro-google-signin');

let nitro: NitroGoogle | null | undefined;
let configured = false;

/**
 * Loads the native module lazily: a build made before it was added (or Expo Go) has no
 * `NitroGoogleSignin` hybrid object, and requiring it would throw. Then Google is hidden.
 */
function loadNitro(): NitroGoogle | null {
  if (nitro !== undefined) return nitro;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nitro = require('react-native-nitro-google-signin') as NitroGoogle;
  } catch {
    nitro = null;
  }
  return nitro;
}

async function getGoogleIdToken(): Promise<ProviderCredential | null> {
  const m = loadNitro();
  if (!m) throw new SocialProviderError('google', 'Google sign-in module missing');
  const { GoogleOneTapSignIn, isSuccessResponse, isCancelledResponse, isErrorWithCode } = m;
  if (!configured) {
    GoogleOneTapSignIn.configure({
      // The Web client ID makes Google issue the ID token for our backend (its `aud`).
      webClientId: socialConfig.googleWebClientId,
      iosClientId: Platform.OS === 'ios' ? socialConfig.googleIosClientId : null,
    });
    configured = true;
  }
  try {
    await GoogleOneTapSignIn.checkPlayServices();
    const response = await GoogleOneTapSignIn.presentExplicitSignIn();
    if (isCancelledResponse(response)) return null;
    if (!isSuccessResponse(response)) {
      throw new SocialProviderError('google', `Google sign-in: ${response.type}`);
    }
    return { token: response.data.idToken };
  } catch (error) {
    if (error instanceof SocialProviderError) throw error;
    if (isErrorWithCode(error) && error.code === 'SIGN_IN_CANCELLED') return null;
    throw new SocialProviderError(
      'google',
      error instanceof Error ? error.message : 'Google sign-in failed',
      isErrorWithCode(error) ? error.code : undefined,
    );
  } finally {
    // Our session is the Brainy Clan token; forget the Google session so the account picker
    // shows again next time (another family member may use this phone).
    void GoogleOneTapSignIn.signOut().catch(() => undefined);
  }
}

/** Google on iOS/Android: native sign-in (react-native-nitro-google-signin) -> ID token. */
export function useGoogleToken(): ProviderTokenSource {
  const available = providerConfigured('google') && loadNitro() !== null;
  const getToken = useCallback(() => getGoogleIdToken(), []);
  return useMemo(
    () => ({ provider: 'google', available, ready: available, getToken }),
    [available, getToken],
  );
}
