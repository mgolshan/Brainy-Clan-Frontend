import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type {
  AuthPayload,
  Envelope,
  SocialAccount,
  SocialProvider,
  SocialSignInBody,
} from '@/api/types';
import { applyAuth } from '@/features/auth/hooks';
import { getDeviceInfo } from '@/lib/device';

export interface SocialSignInInput {
  provider: SocialProvider;
  token: string;
  /** Only after 422 `social_signup_incomplete` (first-time sign-up). */
  birth?: { birth_year: number; birth_month: number; locale?: string };
}

/**
 * `POST /auth/social/{provider}`: sign in or sign up with a provider token. A new account answers
 * 422 `social_signup_incomplete`; the caller asks for birth year/month and retries with the same
 * token. Success signs in exactly like `/auth/login`.
 */
export function useSocialSignIn() {
  return useMutation({
    mutationFn: async ({ provider, token, birth }: SocialSignInInput) => {
      const body: SocialSignInBody = { token, ...birth, ...getDeviceInfo() };
      return (await api.post<Envelope<AuthPayload>>(`/auth/social/${provider}`, body)).data;
    },
    onSuccess: applyAuth,
  });
}

/** `GET /me/social-accounts`: Google/Facebook accounts linked to the signed-in adult. */
export function useSocialAccounts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.socialAccounts,
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<SocialAccount[]>>('/me/social-accounts', { signal })).data,
    enabled,
  });
}

/** `POST /me/social-accounts/{provider}` with a provider token. 409 `social_account_taken`. */
export function useLinkSocialAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider, token }: { provider: SocialProvider; token: string }) =>
      (await api.post<Envelope<SocialAccount>>(`/me/social-accounts/${provider}`, { token })).data,
    onSuccess: (account) => {
      client.setQueryData<SocialAccount[]>(queryKeys.socialAccounts, (prev) => [
        ...(prev ?? []).filter((a) => a.provider !== account.provider),
        account,
      ]);
    },
  });
}

/** `DELETE /me/social-accounts/{provider}`. 409 `last_sign_in_method` if it's the only way in. */
export function useUnlinkSocialAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (provider: SocialProvider) => {
      await api.delete<void>(`/me/social-accounts/${provider}`);
      return provider;
    },
    onSuccess: (provider) => {
      client.setQueryData<SocialAccount[]>(queryKeys.socialAccounts, (prev) =>
        prev?.filter((a) => a.provider !== provider),
      );
    },
  });
}
