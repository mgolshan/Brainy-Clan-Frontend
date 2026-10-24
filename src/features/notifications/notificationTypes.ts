import type { NotificationType } from '@/api/types';
import type { IconName } from '@/ui';

/** Push types the Notifications screen offers, in display order. */
export const NOTIFICATION_TYPES: readonly {
  key: NotificationType;
  icon: IconName;
  /** Only family admins receive this type (the toggle is hidden for everyone else). */
  adminOnly?: boolean;
}[] = [
  { key: 'goal_reached', icon: 'flag-outline' },
  { key: 'period_closed', icon: 'trophy-outline' },
  { key: 'family_activity', icon: 'people-outline' },
  { key: 'family_chat', icon: 'chatbubbles-outline' },
  // Reports from the family chat go to the family's admins only.
  { key: 'family_chat_report', icon: 'flag', adminOnly: true },
  { key: 'daily_reminder', icon: 'alarm-outline' },
];

/** The toggles to show: admin-only types only when the edited member is an admin. */
export function visibleNotificationTypes(memberIsAdmin: boolean) {
  return NOTIFICATION_TYPES.filter((type) => !type.adminOnly || memberIsAdmin);
}

/** Value shown when an older backend doesn't send a type yet (the newer ones default to on). */
export function notificationTypeDefault(key: NotificationType): boolean {
  return key === 'family_chat' || key === 'family_chat_report';
}
