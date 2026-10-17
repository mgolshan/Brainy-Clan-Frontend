import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { MemberDevice } from '@/api/types';
import { useSignOut } from '@/features/auth/hooks';
import { useMemberDevices, useSignOutDevice } from '@/features/family/hooks';
import { errorMessage } from '@/lib/errorMessage';
import { formatRelative } from '@/lib/format';
import {
  Button,
  Card,
  Divider,
  ErrorState,
  Icon,
  IconBubble,
  ListRow,
  Loading,
  Text,
  useTheme,
  type IconName,
} from '@/ui';

const PLATFORM_ICONS: Record<string, IconName> = {
  ios: 'phone-portrait-outline',
  android: 'phone-portrait-outline',
  web: 'globe-outline',
};

function platformLabel(t: TFunction, platform: string): string {
  if (platform === 'ios' || platform === 'android' || platform === 'web') {
    return t(`devices.platforms.${platform}`);
  }
  return platform;
}

function DeviceRow({
  device,
  pending,
  onSignOut,
}: {
  device: MemberDevice;
  pending: boolean;
  onSignOut: () => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [confirm, setConfirm] = useState(false);

  const seen = device.last_seen_at
    ? t('devices.lastSeen', { when: formatRelative(device.last_seen_at, i18n.language) })
    : t('devices.neverSeen');
  const subtitle = [
    device.is_current ? t('devices.thisDevice') : null,
    platformLabel(t, device.platform),
    seen,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListRow
      title={device.name}
      subtitle={subtitle}
      chevron={false}
      leading={
        <IconBubble size={40} color={device.is_current ? theme.colors.success : undefined}>
          <Icon
            name={PLATFORM_ICONS[device.platform] ?? 'hardware-chip-outline'}
            color={theme.colors.primary}
          />
        </IconBubble>
      }
      below={
        <Button
          title={confirm ? t('devices.signOutConfirm') : t('devices.signOut')}
          size="sm"
          variant={confirm ? 'danger' : 'outline'}
          fullWidth={false}
          loading={pending}
          accessibilityLabel={`${t('devices.signOut')}: ${device.name}`}
          onPress={() => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            onSignOut();
          }}
        />
      }
    />
  );
}

/**
 * A member's signed-in devices with "Sign out" per device (admin, or the member themself).
 * One `GET /family/members/{id}/devices` for the whole list. Signing out the current device goes
 * through the normal sign-out (revokes the token and clears local data).
 */
export function DevicesList({ memberId }: { memberId: number }) {
  const { t } = useTranslation();
  const devices = useMemberDevices(memberId);
  const revoke = useSignOutDevice(memberId);
  const signOut = useSignOut();

  if (devices.isPending) return <Loading />;
  if (devices.isError) {
    return <ErrorState error={devices.error} onRetry={() => void devices.refetch()} />;
  }

  return (
    <Card padding="sm" style={{ gap: 4 }}>
      {devices.data.length === 0 ? (
        <Text tone="muted">{t('devices.none')}</Text>
      ) : (
        devices.data.map((device, i) => (
          <View key={device.id}>
            {i > 0 ? <Divider /> : null}
            <DeviceRow
              device={device}
              pending={
                device.is_current
                  ? signOut.isPending
                  : revoke.isPending && revoke.variables === device.id
              }
              onSignOut={() => (device.is_current ? signOut.mutate() : revoke.mutate(device.id))}
            />
          </View>
        ))
      )}
      {revoke.error ? (
        <Text variant="caption" tone="danger">
          {errorMessage(revoke.error, t)}
        </Text>
      ) : null}
      <Text variant="caption" tone="subtle">
        {t('devices.signedOutHint')}
      </Text>
    </Card>
  );
}
