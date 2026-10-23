import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, Icon, Text, useTheme } from '@/ui';

/**
 * Shown while sign-in is paused (`login_locked`): a static title (announced once by screen
 * readers), the live countdown (not a live region, it changes every second), a hint and the other
 * ways in as `children`. Never says whether the email has an account.
 */
export function LockoutNotice({
  countdown,
  hint,
  children,
}: {
  countdown: string;
  hint: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  return (
    <Card variant="tinted" tint={c.warning} style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Icon name="time-outline" color={c.text} />
        <Text
          weight="bold"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ flex: 1 }}>
          {t('lockout.title')}
        </Text>
      </View>
      <Text variant="bodyLarge" weight="bold">
        {countdown}
      </Text>
      <Text variant="caption" tone="muted">
        {hint}
      </Text>
      {children}
    </Card>
  );
}
