import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { NotificationType, UpdateNotificationPreferencesBody } from '@/api/types';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notifications/hooks';
import { formatTime, pad2, parseTime } from '@/features/notifications/time';
import { errorMessage } from '@/lib/errorMessage';
import {
  Card,
  Divider,
  EmptyState,
  ErrorState,
  type IconName,
  Loading,
  Screen,
  SectionHeader,
  Stepper,
  Text,
  ToggleRow,
  useTheme,
} from '@/ui';

const TYPES: { key: NotificationType; icon: IconName }[] = [
  { key: 'goal_reached', icon: 'flag-outline' },
  { key: 'period_closed', icon: 'trophy-outline' },
  { key: 'family_activity', icon: 'people-outline' },
  { key: 'daily_reminder', icon: 'alarm-outline' },
];

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

/** Profile → Notifications: per-type toggles, quiet hours and reminder time (saved at once). */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const prefs = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const save = (body: UpdateNotificationPreferencesBody) => update.mutate(body);

  if (prefs.isPending) return <Loading />;
  const data = prefs.data;

  return (
    <Screen title={t('notifications.title')} subtitle={t('notifications.subtitle')} back>
      {prefs.isError ? (
        <ErrorState error={prefs.error} onRetry={() => void prefs.refetch()} />
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
            {TYPES.map(({ key, icon }, i) => (
              <View key={key}>
                {i > 0 ? <Divider /> : null}
                <ToggleRow
                  icon={icon}
                  label={t(`notifications.types.${key}`)}
                  description={t(`notifications.typeHints.${key}`)}
                  value={data.types[key] ?? false}
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
            <Text variant="caption" tone="muted">
              {t('notifications.quietHint')}
            </Text>
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
