import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { ApiError } from '@/api/client';
import type { Policy } from '@/api/types';
import { openLegalPage, useExportMyData, useLegal } from '@/features/legal/hooks';
import { errorMessage } from '@/lib/errorMessage';
import { Card, Divider, Icon, type IconName, ListRow, SectionHeader, Text, useTheme } from '@/ui';

/**
 * Profile → Privacy: Terms / Privacy Policy (from `GET /legal`, hidden when not served),
 * "Download my data" (`GET /me/export`) and "Delete account" for everyone but children (the
 * policy's `is_child`; the server answers 403 for anyone else it refuses).
 */
export function PrivacySection({ policy }: { policy: Policy }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const legal = useLegal().data;
  const exportData = useExportMyData();
  const selfService = !policy.is_child;

  if (!legal && !selfService) return null;

  const exportError = (error: unknown): string => {
    if (error instanceof ApiError) {
      if (error.status === 429) return t('legal.exportRateLimited');
      if (error.status === 404) return t('legal.exportUnavailable');
      if (error.status === 403) return t('legal.exportNotAllowed');
      return errorMessage(error, t);
    }
    return t('legal.exportFailed');
  };

  const leading = (name: IconName) => <Icon name={name} color={theme.colors.primary} />;

  return (
    <>
      <SectionHeader title={t('legal.privacyTitle')} />
      <Card padding="sm">
        {legal ? (
          <>
            <ListRow
              title={t('legal.terms')}
              leading={leading('document-text-outline')}
              accessibilityHint={t('legal.opensBrowser')}
              onPress={() => openLegalPage(legal.terms.url)}
            />
            <Divider />
            <ListRow
              title={t('legal.privacy')}
              leading={leading('shield-checkmark-outline')}
              accessibilityHint={t('legal.opensBrowser')}
              onPress={() => openLegalPage(legal.privacy.url)}
            />
          </>
        ) : null}
        {selfService ? (
          <>
            {legal ? <Divider /> : null}
            <ListRow
              title={t('legal.exportTitle')}
              subtitle={t('legal.exportHint')}
              leading={leading('download-outline')}
              trailing={
                exportData.isPending ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : undefined
              }
              chevron={!exportData.isPending}
              onPress={exportData.isPending ? undefined : () => exportData.mutate()}
              below={
                exportData.isError ? (
                  <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
                    {exportError(exportData.error)}
                  </Text>
                ) : exportData.data === 'downloaded' ? (
                  <Text variant="caption" tone="success" accessibilityLiveRegion="polite">
                    {t('legal.exportDone')}
                  </Text>
                ) : null
              }
            />
            <Divider />
            <ListRow
              title={t('deletion.accountTitle')}
              leading={<Icon name="trash-outline" color={theme.colors.danger} />}
              onPress={() => router.push('/delete-account')}
            />
          </>
        ) : null}
      </Card>
    </>
  );
}
