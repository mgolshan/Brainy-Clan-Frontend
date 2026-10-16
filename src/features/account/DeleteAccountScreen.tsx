import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDeleteAccount, useDeletionCheck } from '@/features/account/hooks';
import { Point, SubscriptionNotice } from '@/features/account/parts';
import { useMe } from '@/features/auth/hooks';
import { errorMessage } from '@/lib/errorMessage';
import { Button, Card, ErrorState, Loading, Screen, Text, TextField, useTheme } from '@/ui';

const CONFIRM_WORD = 'DELETE';

/**
 * Profile → Delete account (hidden for children; teens see that a family admin removes them —
 * blocker `child_account` — and the server refuses anyway). Explains what is erased, warns about store billing, routes the owner of
 * a family with other members to "Delete family", then asks to type DELETE.
 */
export function DeleteAccountScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const check = useDeletionCheck();
  const deleteAccount = useDeleteAccount();
  const [typed, setTyped] = useState('');

  if (check.isPending) return <Loading />;

  const title = t('deletion.accountTitle');
  if (check.isError || !me) {
    return (
      <Screen title={title} back>
        <ErrorState error={check.error} onRetry={() => void check.refetch()} />
      </Screen>
    );
  }

  const info = check.data;
  const ownerBlocked = info.blockers.includes('family_owner');
  const managedByAdmin = info.blockers.includes('child_account');
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Screen title={title} subtitle={t('deletion.accountSubtitle')} back>
      {info.active_subscription ? <SubscriptionNotice store={info.store} /> : null}

      <Card padding="lg" style={{ gap: theme.spacing.sm }}>
        <Text weight="bold">{t('deletion.whatHappens')}</Text>
        <Point text={t('deletion.pointErased')} />
        <Point text={t('deletion.pointSignOut')} />
        <Point text={t('deletion.pointSocial')} />
        <Point text={t('deletion.pointHistory')} />
        {info.deletes_family ? <Point text={t('deletion.pointFamilyToo')} /> : null}
        <Text variant="caption" tone="muted">
          {t('deletion.cannotUndo')}
        </Text>
      </Card>

      {ownerBlocked ? (
        <Card variant="tinted" tint={theme.colors.danger} style={{ gap: theme.spacing.sm }}>
          <Text weight="bold">{t('deletion.ownerTitle')}</Text>
          <Text>{t('deletion.ownerBody')}</Text>
          <Button
            title={t('deletion.familyTitle')}
            variant="outline"
            icon="people-outline"
            onPress={() => router.push('/delete-family')}
          />
        </Card>
      ) : managedByAdmin ? (
        <Card variant="tinted" tint={theme.colors.primary} style={{ gap: theme.spacing.sm }}>
          <Text weight="bold">{t('deletion.managedTitle')}</Text>
          <Text>{t('deletion.managedBody')}</Text>
        </Card>
      ) : info.can_delete ? (
        <Card padding="lg" style={{ gap: theme.spacing.sm }}>
          <TextField
            label={t('deletion.typeToConfirm', { word: CONFIRM_WORD })}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            placeholder={CONFIRM_WORD}
          />
          {deleteAccount.error ? (
            <Text tone="danger" accessibilityLiveRegion="polite">
              {errorMessage(deleteAccount.error, t)}
            </Text>
          ) : null}
          <Button
            title={t('deletion.accountSubmit')}
            variant="danger"
            icon="trash-outline"
            disabled={!confirmed}
            loading={deleteAccount.isPending}
            onPress={() => deleteAccount.mutate()}
          />
        </Card>
      ) : (
        <Card>
          <Text tone="muted">{t('deletion.notPossible')}</Text>
        </Card>
      )}
    </Screen>
  );
}
