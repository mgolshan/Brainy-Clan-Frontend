import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { clearPrivateQueries } from '@/api/clearPrivateQueries';
import { api } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type {
  AuthPayload,
  CodeSignInBody,
  Envelope,
  ForgotPasswordBody,
  ForgotPasswordResult,
  JoinBody,
  LoginBody,
  MePayload,
  RegisterBody,
} from '@/api/types';
import { normalizeCode } from '@/lib/code';
import { getDeviceInfo } from '@/lib/device';
import { store as purchasesStore } from '@/features/billing/store';
import { unregisterPushToken } from '@/features/notifications/push';
import { useSession } from '@/store/session';

/** Store the token and seed the `me` cache from an AuthPayload. */
export function applyAuth(payload: AuthPayload) {
  const { token, ...me } = payload;
  queryClient.setQueryData<MePayload>(queryKeys.me, me);
  useSession.getState().setToken(token);
}

/**
 * `GET /me`: user, member, family and the resolved **policy**. Called on launch; the policy is
 * read from this query everywhere (never copied into Zustand).
 */
export function useMe() {
  const token = useSession((s) => s.token);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }) => (await api.get<Envelope<MePayload>>('/me', { signal })).data,
    enabled: !!token,
    staleTime: 60_000,
  });
}

/** The signed-in member's policy (undefined while loading / signed out). */
export function usePolicy() {
  return useMe().data?.policy;
}

/** True when the signed-in member is a family admin (drives admin-only UI). */
export function useIsAdmin(): boolean {
  return useMe().data?.member?.role === 'admin';
}

export type LoginInput = Omit<LoginBody, 'device_name' | 'platform'>;
export type RegisterInput = Omit<RegisterBody, 'device_name' | 'platform'>;
export type JoinInput = Omit<JoinBody, 'device_name' | 'platform'>;
export type CodeSignInInput = Omit<CodeSignInBody, 'device_name' | 'platform'>;

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) =>
      (await api.post<Envelope<AuthPayload>>('/auth/login', { ...input, ...getDeviceInfo() })).data,
    onSuccess: applyAuth,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) =>
      (await api.post<Envelope<AuthPayload>>('/auth/register', { ...input, ...getDeviceInfo() }))
        .data,
    onSuccess: applyAuth,
  });
}

export function useJoin() {
  return useMutation({
    mutationFn: async (input: JoinInput) =>
      (
        await api.post<Envelope<AuthPayload>>('/auth/join', {
          ...input,
          code: normalizeCode(input.code),
          ...getDeviceInfo(),
        })
      ).data,
    onSuccess: applyAuth,
  });
}

/**
 * `POST /auth/code`: sign in on this device with a one-time sign-in code an admin issued
 * (children have no email/password). Signs in exactly like join.
 */
export function useCodeSignIn() {
  return useMutation({
    mutationFn: async (input: CodeSignInInput) =>
      (
        await api.post<Envelope<AuthPayload>>('/auth/code', {
          code: normalizeCode(input.code),
          ...getDeviceInfo(),
        })
      ).data,
    onSuccess: applyAuth,
  });
}

/**
 * `POST /auth/password/forgot`: asks the server to email a reset link (always 202, also for an
 * unknown email). The reset itself happens on the website page from the email.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (body: ForgotPasswordBody) =>
      (await api.post<Envelope<ForgotPasswordResult>>('/auth/password/forgot', body)).data,
  });
}

/** Revoke the token server-side (best effort), then forget it locally and drop all cached data. */
export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // While the Bearer token is still valid (best effort, never throws).
      await unregisterPushToken();
      // Back to an anonymous RevenueCat user (no-op unless the paywall ran; never throws).
      await purchasesStore.reset();
      try {
        await api.post<void>('/auth/logout', undefined, { timeoutMs: 5000 });
      } catch {
        // Offline or token already invalid: signing out locally is what matters.
      }
    },
    onSettled: () => {
      useSession.getState().clear();
      clearPrivateQueries(client);
    },
  });
}
