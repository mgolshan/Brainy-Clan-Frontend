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

/** A provider's token source. `getToken()` resolves `null` when the user cancels. */
export interface ProviderTokenSource {
  provider: SocialProvider;
  /** Configured and supported on this platform (else the button is hidden). */
  available: boolean;
  /** The provider request is prepared (web popups must open synchronously from the tap). */
  ready: boolean;
  getToken: () => Promise<string | null>;
}
