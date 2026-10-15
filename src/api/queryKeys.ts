import type { LeaderboardPeriod } from '@/api/types';

/** All TanStack Query keys in one place. */
export const queryKeys = {
  health: ['health'] as const,
  me: ['me'] as const,
  meStats: ['me', 'stats'] as const,
  socialAccounts: ['me', 'social-accounts'] as const,
  notificationPreferences: ['me', 'notification-preferences'] as const,
  family: ['family'] as const,
  invites: ['family', 'invites'] as const,
  subscription: ['family', 'subscription'] as const,
  memberDevices: (memberId: number) => ['family', 'members', memberId, 'devices'] as const,
  leaderboard: (period: LeaderboardPeriod) => ['family', 'leaderboard', period] as const,
  categories: ['categories'] as const,
  goals: ['goals'] as const,
  goal: (id: number) => ['goals', id] as const,
  goalHistory: (id: number) => ['goals', id, 'history'] as const,
  playSession: (id: number) => ['play', 'session', id] as const,
};
