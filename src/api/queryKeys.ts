import type { LeaderboardPeriod } from '@/api/types';

/** All TanStack Query keys in one place. */
export const queryKeys = {
  health: ['health'] as const,
  me: ['me'] as const,
  /** Public `GET /legal` (current terms/privacy versions + URLs). */
  legal: ['legal'] as const,
  meStats: ['me', 'stats'] as const,
  /** `GET /me/worlds`: the signed-in member's world unlock catalog. */
  myWorlds: ['me', 'worlds'] as const,
  deletionCheck: ['me', 'deletion-check'] as const,
  socialAccounts: ['me', 'social-accounts'] as const,
  notificationPreferences: ['me', 'notification-preferences'] as const,
  family: ['family'] as const,
  invites: ['family', 'invites'] as const,
  invitePreview: (birthYear: number, birthMonth: number) =>
    ['invite-preview', birthYear, birthMonth] as const,
  subscription: ['family', 'subscription'] as const,
  /** `GET /family/members/{member}/worlds` (admin): that member's world catalog. */
  memberWorlds: (memberId: number) => ['family', 'members', memberId, 'worlds'] as const,
  memberDevices: (memberId: number) => ['family', 'members', memberId, 'devices'] as const,
  memberNotificationPreferences: (memberId: number) =>
    ['family', 'members', memberId, 'notification-preferences'] as const,
  leaderboard: (period: LeaderboardPeriod) => ['family', 'leaderboard', period] as const,
  /** Family chat (own root: refreshing `family` must not refetch every chat page). */
  chat: ['chat'] as const,
  /** `GET /family/chat/messages?before=` pages (infinite query, newest first). */
  chatMessages: ['chat', 'messages'] as const,
  /** `GET /family/chat/messages?after=` polling while the chat screen is open. */
  chatPoll: ['chat', 'poll'] as const,
  /** `GET /family/chat/unread` (tab badge). */
  chatUnread: ['chat', 'unread'] as const,
  categories: ['categories'] as const,
  goals: ['goals'] as const,
  goal: (id: number) => ['goals', id] as const,
  goalHistory: (id: number) => ['goals', id, 'history'] as const,
  playSession: (id: number) => ['play', 'session', id] as const,
  /** `GET /play/sessions/current` ("Continue your game"). */
  currentSession: ['play', 'current'] as const,
  /** Store data (RevenueCat), not our API: offering packages with store prices. */
  paywallPackages: (appUserId: string) => ['revenuecat', 'packages', appUserId] as const,
};

/** Roots of queries that don't depend on who is signed in (kept across sign-in/sign-out). */
const PUBLIC_QUERY_ROOTS: readonly string[] = [queryKeys.health[0], queryKeys.legal[0]];

/** True for public, account-independent data (`GET /health`, `GET /legal`). */
export function isPublicQueryKey(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === 'string' && PUBLIC_QUERY_ROOTS.includes(queryKey[0]);
}
