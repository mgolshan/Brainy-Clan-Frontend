import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { LegalDocument } from '@/api/types';
import { useMe, useSignOut } from '@/features/auth/hooks';
import { openLegalPage, useAcceptLegal, useLegal } from '@/features/legal/hooks';
import { errorMessage } from '@/lib/errorMessage';
import {
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  IconBubble,
  ListRow,
  Loading,
  Screen,
  Text,
  useTheme,
} from '@/ui';

/**
 * Blocking screen after sign-in when `me.legal.needs_acceptance` is true (adults only; children
 * never get it because their parent consented). The current versions come from `me.legal` (the
 * server's view, also what `POST /me/legal-acceptance` must echo), falling back to `GET /legal`.
 * A document whose accepted version differs from the current one is marked "Updated" and shows
 * the localized `summary` from `GET /legal` ("what changed"). The root guard routes on once the
 * `me` cache says nothing is pending.
 */
export function LegalUpdateScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const meLegal = useMe().data?.legal;
  const legal = useLegal();
  const accept = useAcceptLegal();
  const signOut = useSignOut();

  if (legal.isPending) return <Loading />;

  const termsVersion = meLegal?.terms_version ?? legal.data?.terms.version;
  const privacyVersion = meLegal?.privacy_version ?? legal.data?.privacy.version;

  const docRow = (
    title: string,
    doc: LegalDocument | undefined,
    version: string | undefined,
    accepted: string | null | undefined,
  ) => {
    // Without `me.legal` we can't tell what changed; then both count as updated.
    const updated = !meLegal || accepted !== version;
    const summary = updated ? doc?.summary?.trim() : undefined;
    return (
      <ListRow
        title={title}
        subtitle={version ? t('legal.version', { version }) : undefined}
        leading={<Icon name="document-text-outline" color={theme.colors.primary} />}
        onPress={doc ? () => openLegalPage(doc.url) : undefined}
        chevron={!!doc}
        accessibilityHint={doc ? t('legal.opensBrowser') : undefined}
        below={
          updated ? (
            <View style={{ gap: theme.spacing.xs, alignItems: 'flex-start' }}>
              <Badge label={t('legal.updated')} tone="primary" icon="sparkles-outline" />
              {summary ? <Text variant="caption">{summary}</Text> : null}
              {accepted && accepted !== version ? (
                <Text variant="caption" tone="subtle">
                  {t('legal.previouslyAccepted', { version: accepted })}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text variant="caption" tone="subtle">
              {t('legal.unchanged')}
            </Text>
          )
        }
      />
    );
  };

  return (
    <Screen title={t('legal.updateTitle')} subtitle={t('legal.updateSubtitle')}>
      <View style={{ alignItems: 'center' }}>
        <IconBubble size={72}>
          <Icon name="shield-checkmark-outline" size={36} color={theme.colors.primary} />
        </IconBubble>
      </View>
      <Text tone="muted">{t('legal.updateBody')}</Text>
      <Card padding="sm">
        {docRow(t('legal.terms'), legal.data?.terms, termsVersion, meLegal?.accepted_terms_version)}
        <Divider />
        {docRow(
          t('legal.privacy'),
          legal.data?.privacy,
          privacyVersion,
          meLegal?.accepted_privacy_version,
        )}
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
