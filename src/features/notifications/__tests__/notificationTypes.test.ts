import {
  NOTIFICATION_TYPES,
  notificationTypeDefault,
  visibleNotificationTypes,
} from '@/features/notifications/notificationTypes';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';

const keys = (memberIsAdmin: boolean) => visibleNotificationTypes(memberIsAdmin).map((t) => t.key);

describe('notification types', () => {
  it('shows the chat report toggle to admins only', () => {
    expect(keys(true)).toContain('family_chat_report');
    expect(keys(false)).not.toContain('family_chat_report');
    expect(keys(false)).toContain('family_chat');
  });

  it('defaults the newer chat types to on', () => {
    expect(notificationTypeDefault('family_chat')).toBe(true);
    expect(notificationTypeDefault('family_chat_report')).toBe(true);
    expect(notificationTypeDefault('daily_reminder')).toBe(false);
  });

  it('has a label and a hint for every type in every locale', () => {
    for (const locale of [en, fr]) {
      for (const { key } of NOTIFICATION_TYPES) {
        expect(locale.notifications.types[key]).toEqual(expect.any(String));
        expect(locale.notifications.typeHints[key]).toEqual(expect.any(String));
      }
    }
  });
});
