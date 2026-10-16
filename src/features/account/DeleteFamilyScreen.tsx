import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDeleteFamily, useDeletionCheck } from '@/features/account/hooks';
import { Point, SubscriptionNotice } from '@/features/account/parts';
import { useMe } from '@/features/auth/hooks';
import { useFamily } from '@/features/family/hooks';
import { errorMessage } from '@/lib/errorMessage';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  Text,
  TextField,
  ToggleRow,
  useTheme,
} from '@/ui';

/**
 * Family → Delete family (owner only). Children's accounts are erased, other adults keep their
 * accounts without a family; optionally the owner's account goes too. Confirmed by typing the
 * family name.
 */
export function DeleteFamilyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const family = useFamily();
  // Only for the store-billing notice; the screen works without it.
  const check = useDeletionCheck();
  const deleteFamily = useDeleteFamily();
  const [typed, setTyped] = useState('');
  const [alsoAccount, setAlsoAccount] = useState(false);

  const title = t('deletion.familyTitle');
  if (family.isPending) return <Loading />;
  if (family.isError || !me) {
    return (
      <Screen title={title} back>
        <ErrorState error={family.error} onRetry={() => void family.refetch()} />
      </Screen>
    );
  }

  const { family: info, members } = family.data;
  if (info.owner_user_id !== me.user.id) {
    return (
      <Screen title={title} back>
        <Card>
          <EmptyState title={t('deletion.ownerOnly')} icon="lock-closed-outline" />
        </Card>
      </Screen>
    );
  }

  // The server erases every account without its own email login (children, and teens who sign
  // in with codes); members with an email login keep their accounts. Social-only accounts aren't
  // visible in the member list, so they count as erased here (the server keeps them).
  const others = members.filter((m) => m.user_id !== me.user.id);
  const erased = others.filter((m) => !m.email).length;
  const kept = others.length - erased;
  const confirmed = typed.trim() === info.name.trim();

  return (
    <Screen title={title} subtitle={info.name} back>
      {check.data?.active_subscription ? <SubscriptionNotice store={check.data.store} /> : null}

      <Card padding="lg" style={{ gap: theme.spacing.sm }}>
        <Text weight="bold">{t('deletion.whatHappens')}</Text>
        <Point text={t('deletion.familyPointGone')} />
        {erased > 0 ? <Point text={t('deletion.familyPointErased', { count: erased })} /> : null}
        {kept > 0 ? <Point text={t('deletion.familyPointKept', { count: kept })} /> : null}
        <Point text={t('deletion.pointHistory')} />
        <Text variant="caption" tone="muted">
          {t('deletion.cannotUndo')}
        </Text>
      </Card>

      <Card padding="lg" style={{ gap: theme.spacing.sm }}>
        <ToggleRow
          label={t('deletion.alsoMyAccount')}
          description={t('deletion.alsoMyAccountHint')}
          value={alsoAccount}
          onValueChange={setAlsoAccount}
          icon="person-remove-outline"
        />
        <TextField
          label={t('deletion.typeFamilyName', { name: info.name })}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          placeholder={info.name}
        />
        {deleteFamily.error ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {errorMessage(deleteFamily.error, t)}
          </Text>
        ) : null}
        <Button
          title={alsoAccount ? t('deletion.familyAndAccountSubmit') : t('deletion.familySubmit')}
          variant="danger"
          icon="trash-outline"
          disabled={!confirmed}
          loading={deleteFamily.isPending}
          onPress={() =>
            deleteFamily.mutate({
              confirm: typed.trim(),
              ...(alsoAccount ? { delete_my_account: true } : {}),
            })
          }
        />
      </Card>
    </Screen>
  );
}
