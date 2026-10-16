import type { LeaderboardPeriod } from '@/api/types';

/** All TanStack Query keys in one place. */
export const queryKeys = {
  health: ['health'] as const,
  me: ['me'] as const,
  /** Public `GET /legal` (current terms/privacy versions + URLs). */
  legal: ['legal'] as const,
  meStats: ['me', 'stats'] as const,
  deletionCheck: ['me', 'deletion-check'] as const,
  socialAccounts: ['me', 'social-accounts'] as const,
  notificationPreferences: ['me', 'notification-preferences'] as const,
  family: ['family'] as const,
  invites: ['family', 'invites'] as const,
  invitePreview: (birthYear: number, birthMonth: number) =>
    ['invite-preview', birthYear, birthMonth] as const,
  subscription: ['family', 'subscription'] as const,
  memberDevices: (memberId: number) => ['family', 'members', memberId, 'devices'] as const,
  memberNotificationPreferences: (memberId: number) =>
    ['family', 'members', memberId, 'notification-preferences'] as const,
  leaderboard: (period: LeaderboardPeriod) => ['family', 'leaderboard', period] as const,
  categories: ['categories'] as const,
  goals: ['goals'] as const,
  goal: (id: number) => ['goals', id] as const,
  goalHistory: (id: number) => ['goals', id, 'history'] as const,
  playSession: (id: number) => ['play', 'session', id] as const,
  /** Store data (RevenueCat), not our API: offering packages with store prices. */
  paywallPackages: (appUserId: string) => ['revenuecat', 'packages', appUserId] as const,
};
