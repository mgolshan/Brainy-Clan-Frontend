import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { LegalDocument } from '@/api/types';
import { useMe, useSignOut } from '@/features/auth/hooks';
import { openLegalPage, useAcceptLegal, useLegal } from '@/features/legal/hooks';
import { errorMessage } from '@/lib/errorMessage';
import {
  Button,
  Card,
  Icon,
  IconBubble,
  ListRow,
  Divider,
  Loading,
  Screen,
  Text,
  useTheme,
} from '@/ui';

/**
 * Blocking screen after sign-in when `me.legal.needs_acceptance` is true (adults only; children
 * never get it because their parent consented). Shows the current Terms and Privacy Policy and
 * sends `POST /me/legal-acceptance` with the current versions. The root guard routes on once
 * the `me` cache says nothing is pending.
 */
export function LegalUpdateScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const legal = useLegal();
  const accept = useAcceptLegal();
  const signOut = useSignOut();

  if (legal.isPending) return <Loading />;

  // Current versions: from `GET /legal`, else what `me.legal` reports.
  const termsVersion = legal.data?.terms.version ?? me?.legal?.terms_version;
  const privacyVersion = legal.data?.privacy.version ?? me?.legal?.privacy_version;

  const docRow = (title: string, doc: LegalDocument | undefined, version: string | undefined) => (
    <ListRow
      title={title}
      subtitle={version ? t('legal.version', { version }) : undefined}
      leading={<Icon name="document-text-outline" color={theme.colors.primary} />}
      onPress={doc ? () => openLegalPage(doc.url) : undefined}
      chevron={!!doc}
      accessibilityHint={doc ? t('legal.opensBrowser') : undefined}
    />
  );

  return (
    <Screen title={t('legal.updateTitle')} subtitle={t('legal.updateSubtitle')}>
      <View style={{ alignItems: 'center' }}>
        <IconBubble size={72}>
          <Icon name="shield-checkmark-outline" size={36} color={theme.colors.primary} />
        </IconBubble>
      </View>
      <Text tone="muted">{t('legal.updateBody')}</Text>
      <Card padding="sm">
        {docRow(t('legal.terms'), legal.data?.terms, termsVersion)}
        <Divider />
        {docRow(t('legal.privacy'), legal.data?.privacy, privacyVersion)}
      </Card>
      {accept.isError ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {errorMessage(accept.error, t)}
        </Text>
      ) : null}
      <Button
        title={t('legal.accept')}
        icon="checkmark"
        size="lg"
        loading={accept.isPending}
        disabled={!termsVersion || !privacyVersion}
        onPress={() =>
          termsVersion &&
          privacyVersion &&
          accept.mutate({ terms_version: termsVersion, privacy_version: privacyVersion })
        }
      />
      <Button
        title={t('profile.signOut')}
        variant="ghost"
        icon="log-out-outline"
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
      <Text variant="caption" tone="subtle" align="center">
        {t('legal.declineHint')}
      </Text>
    </Screen>
  );
}
