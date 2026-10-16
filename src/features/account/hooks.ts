import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type {
  DeleteAccountBody,
  DeleteFamilyBody,
  DeletionCheck,
  Envelope,
  MePayload,
} from '@/api/types';
import { useChallengeDrafts } from '@/challenges/drafts';
import { useAnswerQueue } from '@/features/play/answerQueue';
import { useAppStatus } from '@/store/appStatus';
import { useSession } from '@/store/session';

/**
 * Full local sign-out after the account is gone server-side (every token is already revoked, so
 * no `/auth/logout` or push-token call): token, cached server data, queued answers and challenge
 * drafts. Welcome then shows "Your account was deleted".
 */
export function signOutAfterDeletion() {
  useAppStatus.getState().setAccountDeleted(true);
  useAnswerQueue.getState().clear();
  useChallengeDrafts.getState().clear();
  useSession.getState().clear();
  queryClient.clear();
}

/** `GET /me/deletion-check`: blockers, store subscription, whether the family goes too. */
export function useDeletionCheck() {
  return useQuery({
    queryKey: queryKeys.deletionCheck,
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<DeletionCheck>>('/me/deletion-check', { signal })).data,
    // Always fresh: the answer depends on family membership and billing right now.
    staleTime: 0,
    gcTime: 0,
  });
}

/** `DELETE /me` (`confirm: "DELETE"`). 409 `family_owner_cannot_leave`. */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const body: DeleteAccountBody = { confirm: 'DELETE' };
      await api.delete<void>('/me', body);
    },
    onSuccess: signOutAfterDeletion,
  });
}

/**
 * `DELETE /family` (owner, `confirm` = family name). With `delete_my_account` the owner's account
 * goes too (full sign-out); otherwise the cache restarts from a fresh `/me` without a family, so
 * the auth guard shows the create-family onboarding.
 */
export function useDeleteFamily() {
  return useMutation({
    mutationFn: async (body: DeleteFamilyBody) => {
      await api.delete<void>('/family', body);
      if (body.delete_my_account) return null;
      return (await api.get<Envelope<MePayload>>('/me')).data;
    },
    onSuccess: (me) => {
      if (!me) {
        signOutAfterDeletion();
        return;
      }
      useAnswerQueue.getState().clear();
      useChallengeDrafts.getState().clear();
      queryClient.clear();
      queryClient.setQueryData<MePayload>(queryKeys.me, me);
    },
  });
}
