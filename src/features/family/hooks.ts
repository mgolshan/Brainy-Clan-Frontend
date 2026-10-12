import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type {
  CreateFamilyBody,
  CreateInviteBody,
  Envelope,
  Family,
  FamilyPayload,
  Invite,
  Leaderboard,
  LeaderboardPeriod,
  MePayload,
  Member,
  MemberDevice,
  SignInCode,
  UpdateFamilyBody,
  UpdateMemberBody,
} from '@/api/types';
import { useIsAdmin } from '@/features/auth/hooks';

/** `GET /family`: family + members. */
export function useFamily() {
  return useQuery({
    queryKey: queryKeys.family,
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<FamilyPayload>>('/family', { signal })).data,
  });
}

/** `GET /family/invites` (admin only; disabled for members). */
export function useInvites() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: queryKeys.invites,
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<Invite[]>>('/family/invites', { signal })).data,
    enabled: isAdmin,
  });
}

/** `GET /family/leaderboard?period=` */
export function useLeaderboard(period: LeaderboardPeriod = 'week') {
  return useQuery({
    queryKey: queryKeys.leaderboard(period),
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<Leaderboard>>(`/family/leaderboard?period=${period}`, { signal }))
        .data,
  });
}

/** `POST /families`: the caller becomes owner/admin. Refreshes `me` so routing moves on. */
export function useCreateFamily() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateFamilyBody) =>
      (await api.post<Envelope<Family>>('/families', body)).data,
    onSuccess: async (family) => {
      // Membership + policy (tier) changed: reload them from the source of truth.
      client.setQueryData<MePayload>(queryKeys.me, (prev) => (prev ? { ...prev, family } : prev));
      await client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useUpdateFamily() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateFamilyBody) =>
      (await api.patch<Envelope<Family>>('/family', body)).data,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.family });
      void client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

/** Replace a member inside the cached family payload. */
function patchMemberInCache(client: ReturnType<typeof useQueryClient>, member: Member) {
  client.setQueryData<FamilyPayload>(queryKeys.family, (prev) =>
    prev ? { ...prev, members: prev.members.map((m) => (m.id === member.id ? member : m)) } : prev,
  );
  client.setQueryData<MePayload>(queryKeys.me, (prev) =>
    prev?.member?.id === member.id ? { ...prev, member } : prev,
  );
}

export function useUpdateMember(memberId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateMemberBody) =>
      (await api.patch<Envelope<Member>>(`/family/members/${memberId}`, body)).data,
    onSuccess: (member) => {
      patchMemberInCache(client, member);
      void client.invalidateQueries({ queryKey: queryKeys.family });
      void client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useRemoveMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: number) => {
      await api.delete(`/family/members/${memberId}`);
      return memberId;
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.family }),
  });
}

export function useCreateInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateInviteBody) =>
      (await api.post<Envelope<Invite>>('/family/invites', body)).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.invites }),
  });
}

export function useDeleteInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: number) => {
      await api.delete(`/family/invites/${inviteId}`);
      return inviteId;
    },
    onSuccess: (inviteId) => {
      client.setQueryData<Invite[]>(queryKeys.invites, (prev) =>
        prev?.filter((i) => i.id !== inviteId),
      );
    },
  });
}

/** `POST /family/members/{member}/sign-in-codes` (admin): one-time code for a new device. */
export function useIssueSignInCode(memberId: number) {
  return useMutation({
    mutationFn: async () =>
      (await api.post<Envelope<SignInCode>>(`/family/members/${memberId}/sign-in-codes`)).data,
  });
}

/**
 * `GET /family/members/{member}/devices` (admin, or the member themself). One request per
 * screen for the whole list.
 */
export function useMemberDevices(memberId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.memberDevices(memberId ?? 0),
    queryFn: async ({ signal }) =>
      (await api.get<Envelope<MemberDevice[]>>(`/family/members/${memberId}/devices`, { signal }))
        .data,
    enabled: memberId !== undefined,
  });
}

/** `DELETE /family/members/{member}/devices/{device}`: signs that device out. */
export function useSignOutDevice(memberId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: number) => {
      await api.delete(`/family/members/${memberId}/devices/${deviceId}`);
      return deviceId;
    },
    onSuccess: (deviceId) => {
      client.setQueryData<MemberDevice[]>(queryKeys.memberDevices(memberId), (prev) =>
        prev?.filter((d) => d.id !== deviceId),
      );
    },
  });
}
