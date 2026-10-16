import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { providerConfigured } from '@/features/auth/social/config';
import {
  SocialProviderError,
  type ProviderCredential,
  type ProviderTokenSource,
} from '@/features/auth/social/types';

/** 32 random bytes as hex: the raw nonce we keep and send to the server. */
function randomNonce(): string {
  return Array.from(getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Apple shares the name on the first authorization only; the app sends the first name then. */
function nameFrom(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  const name = (fullName?.givenName ?? fullName?.nickname ?? '').trim();
  return name || undefined;
}

async function getAppleCredential(): Promise<ProviderCredential | null> {
  const nonce = randomNonce();
  // Apple puts the SHA-256 (hex) into the identity token; the server checks it against `nonce`.
  const hashed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    });
    if (!credential.identityToken) {
      throw new SocialProviderError('apple', 'Apple returned no identity token');
    }
    return {
      token: credential.identityToken,
      nonce,
      displayName: nameFrom(credential.fullName),
      authorizationCode: credential.authorizationCode ?? undefined,
    };
  } catch (error) {
    if (error instanceof SocialProviderError) throw error;
    const code = (error as { code?: string } | null)?.code;
    if (code === 'ERR_REQUEST_CANCELED') return null;
    throw new SocialProviderError(
      'apple',
      error instanceof Error ? error.message : 'Apple sign-in failed',
      code,
    );
  }
}

/**
 * Sign in with Apple (iOS dev/production builds only): native sheet -> identity token, with a
 * random nonce (SHA-256 to Apple, raw to the server). Hidden on Android, web and Expo Go, and on
 * devices where `isAvailableAsync()` is false.
 */
export function useAppleToken(): ProviderTokenSource {
  const configured = providerConfigured('apple');
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => {
        if (active) setAvailable(ok);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [configured]);

  const getToken = useCallback(() => getAppleCredential(), []);
  return useMemo(
    () => ({ provider: 'apple', available, ready: available, getToken }),
    [available, getToken],
  );
}
