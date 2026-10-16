import type { SocialProvider } from '@/api/types';

/** Thrown when the provider's own sign-in fails (not when the user cancels). */
export class SocialProviderError extends Error {
  constructor(
    readonly provider: SocialProvider,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'SocialProviderError';
  }
}

/**
 * What a provider hands back for `/auth/social/{provider}` and `/me/social-accounts/{provider}`.
 * Only Apple fills `nonce` (raw nonce; its SHA-256 went to Apple) and `displayName` (Apple shares
 * the user's name on the first authorization only).
 */
export interface ProviderCredential {
  token: string;
  nonce?: string;
  displayName?: string;
  /** Apple only: `authorizationCode` from the sign-in result (lets the server revoke later). */
  authorizationCode?: string;
}

/** A provider's credential source. `getToken()` resolves `null` when the user cancels. */
export interface ProviderTokenSource {
  provider: SocialProvider;
  /** Configured and supported on this platform (else the button is hidden). */
  available: boolean;
  /** The provider request is prepared (web popups must open synchronously from the tap). */
  ready: boolean;
  getToken: () => Promise<ProviderCredential | null>;
}
