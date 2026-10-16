import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { SubscriptionStore } from '@/api/types';
import { Card, Icon, Text, useTheme } from '@/ui';

/** Bullet list item. */
export function Point({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      <Text tone="muted">•</Text>
      <Text style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

/** "Cancel in the App Store / Google Play" text for the store that bills the family. */
function storeCancelText(t: TFunction, store: SubscriptionStore | null): string {
  if (store === 'app_store') return t('deletion.cancelAppStore');
  if (store === 'play_store') return t('deletion.cancelPlayStore');
  return t('deletion.cancelStoreGeneric');
}

/** Deleting doesn't stop store billing: prominent notice while a subscription is active. */
export function SubscriptionNotice({ store }: { store: SubscriptionStore | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Card variant="tinted" tint={theme.colors.warning} style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
        <Icon name="card-outline" color={theme.colors.warning} />
        <Text weight="bold" style={{ flex: 1 }}>
          {t('deletion.subscriptionTitle')}
        </Text>
      </View>
      <Text>{storeCancelText(t, store)}</Text>
    </Card>
  );
}
