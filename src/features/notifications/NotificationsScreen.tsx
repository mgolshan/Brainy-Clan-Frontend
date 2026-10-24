import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { ApiError } from '@/api/client';
import type { AgeBand, UpdateNotificationPreferencesBody } from '@/api/types';
import { useIsAdmin, useMe } from '@/features/auth/hooks';
import { useFamily } from '@/features/family/hooks';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notifications/hooks';
import {
  notificationTypeDefault,
  visibleNotificationTypes,
} from '@/features/notifications/notificationTypes';
import { defaultQuietHours, formatTime, pad2, parseTime } from '@/features/notifications/time';
import { usePushPermission } from '@/features/notifications/usePush';
import { errorMessage } from '@/lib/errorMessage';
import {
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SectionHeader,
  Stepper,
  Text,
  ToggleRow,
  useTheme,
} from '@/ui';

const MINUTE_STEP = 15;

/** Hour + minute steppers; works the same on web and native. */
function TimeSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const parsed = parseTime(value);
  const current = parsed ?? { hour: 0, minute: 0 };
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text weight="bold">{label}</Text>
        <Text weight="bold" tone="primary" accessibilityLiveRegion="polite">
          {parsed ? formatTime(parsed) : '–'}
        </Text>
      </View>
      <Stepper
        label={t('notifications.hour')}
        value={parsed ? parsed.hour : null}
        min={0}
        max={23}
        format={pad2}
        onChange={(hour) => onChange(formatTime({ ...current, hour }))}
      />
      <Stepper
        label={t('notifications.minute')}
        value={parsed ? parsed.minute : null}
        min={0}
        max={60 - MINUTE_STEP}
        step={MINUTE_STEP}
        format={pad2}
        onChange={(minute) => onChange(formatTime({ ...current, minute }))}
      />
    </View>
  );
}

/**
 * "Turn on notifications" when this device has not granted push permission yet (hidden on web,
 * in Expo Go and without an EAS project). When the OS no longer prompts, link to system settings.
 */
function PushPermissionCard() {
  const { t } = useTranslation();
  const { state, asking, request } = usePushPermission();
  if (!state || state.status === 'granted' || state.status === 'unsupported') return null;
  const blocked = !state.canAskAgain;
  return (
    <Card>
      <EmptyState
        title={t('notifications.pushTitle')}
        body={blocked ? t('notifications.pushBlockedBody') : t('notifications.pushBody')}
        icon="notifications-outline"
        actionLabel={
          asking
            ? undefined
            : blocked
              ? t('notifications.pushOpenSettings')
              : t('notifications.pushEnable')
        }
        onAction={() => void (blocked ? Linking.openSettings() : request())}
      />
    </Card>
  );
}

interface SettingsProps {
  /** Omit for the signed-in member; set for the admin variant. */
  memberId?: number;
  ageBand?: AgeBand;
  /** Whether the member whose settings these are is a family admin (admin-only types). */
  memberIsAdmin: boolean;
  title: string;
  subtitle: string;
}

/** Per-type toggles, quiet hours and reminder time (saved at once, optimistic). */
function NotificationSettings({
  memberId,
  ageBand,
  memberIsAdmin,
  title,
  subtitle,
}: SettingsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const prefs = useNotificationPreferences(memberId);
  const update = useUpdateNotificationPreferences(memberId);
  const save = (body: UpdateNotificationPreferencesBody) => update.mutate(body);
  // Quiet hours before they were switched off, restored when switched back on.
  const [lastQuiet, setLastQuiet] = useState<{ quiet_from: string; quiet_to: string } | null>(null);

  if (prefs.isPending) return <Loading />;
  const data = prefs.data;
  const quietOn = !!data && (data.quiet_from !== null || data.quiet_to !== null);
  const errorStatus = prefs.error instanceof ApiError ? prefs.error.status : null;

  return (
    <Screen title={title} subtitle={subtitle} back>
      {memberId === undefined ? <PushPermissionCard /> : null}
      {prefs.isError ? (
        errorStatus === 403 || errorStatus === 404 ? (
          <EmptyState
            title={errorStatus === 403 ? t('errors.forbidden') : t('errors.notFound')}
            icon="search-outline"
          />
        ) : (
          <ErrorState error={prefs.error} onRetry={() => void prefs.refetch()} />
        )
      ) : !data ? (
        <Card>
          <EmptyState
            title={t('notifications.unavailable')}
            body={t('notifications.unavailableBody')}
            icon="notifications-off-outline"
          />
        </Card>
      ) : (
        <>
          <SectionHeader title={t('notifications.typesTitle')} />
          <Card padding="sm">
            {visibleNotificationTypes(memberIsAdmin).map(({ key, icon }, i) => (
              <View key={key}>
                {i > 0 ? <Divider /> : null}
                <ToggleRow
                  icon={icon}
                  label={t(`notifications.types.${key}`)}
                  description={t(`notifications.typeHints.${key}`)}
                  // Newer types default to on (older backends don't send them yet).
                  value={data.types[key] ?? notificationTypeDefault(key)}
                  onValueChange={(on) => save({ types: { [key]: on } })}
                />
              </View>
            ))}
          </Card>

          {data.types.daily_reminder ? (
            <Card padding="lg">
              <TimeSelector
                label={t('notifications.reminderTime')}
                value={data.reminder_time}
                onChange={(reminder_time) => save({ reminder_time })}
              />
            </Card>
          ) : null}

          <SectionHeader title={t('notifications.quietTitle')} />
          <Card padding="lg" style={{ gap: theme.spacing.md }}>
            <ToggleRow
              icon="moon-outline"
              label={t('notifications.quietToggle')}
              description={t('notifications.quietHint')}
              value={quietOn}
              onValueChange={(on) => {
                if (on) {
                  save(lastQuiet ?? defaultQuietHours(ageBand));
                  return;
                }
                if (data.quiet_from && data.quiet_to) {
                  setLastQuiet({ quiet_from: data.quiet_from, quiet_to: data.quiet_to });
                }
                save({ quiet_from: null, quiet_to: null });
              }}
            />
            {quietOn ? (
              <>
                <Divider />
                <TimeSelector
                  label={t('notifications.quietFrom')}
                  value={data.quiet_from}
                  onChange={(quiet_from) => save({ quiet_from })}
                />
                <Divider />
                <TimeSelector
                  label={t('notifications.quietTo')}
                  value={data.quiet_to}
                  onChange={(quiet_to) => save({ quiet_to })}
                />
              </>
            ) : (
              <Text variant="caption" tone="muted">
                {t('notifications.quietOff')}
              </Text>
            )}
          </Card>

          {update.error ? (
            <Text variant="caption" tone="danger" align="center">
              {errorMessage(update.error, t)}
            </Text>
          ) : null}
          <Text variant="caption" tone="subtle" align="center">
            {t('notifications.timezoneHint')}
          </Text>
        </>
      )}
    </Screen>
  );
}

/** Profile → Notifications: the signed-in member's own settings. */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const ageBand = useMe().data?.member?.age_band;
  const isAdmin = useIsAdmin();
  return (
    <NotificationSettings
      ageBand={ageBand}
      memberIsAdmin={isAdmin}
      title={t('notifications.title')}
      subtitle={t('notifications.subtitle')}
    />
  );
}

/** Family → member → Notifications: an admin edits another member's settings. */
export function MemberNotificationsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = useIsAdmin();
  const family = useFamily();
  const member = family.data?.members.find((m) => String(m.id) === id);
  const memberId = Number(id);

  if (!isAdmin || !Number.isInteger(memberId)) {
    return (
      <Screen back>
        <EmptyState title={t('errors.notFound')} icon="search-outline" />
      </Screen>
    );
  }
  return (
    <NotificationSettings
      key={memberId}
      memberId={memberId}
      ageBand={member?.age_band}
      memberIsAdmin={member?.role === 'admin'}
      title={member ? member.nickname : t('notifications.title')}
      subtitle={t('notifications.memberSubtitle')}
    />
  );
}
