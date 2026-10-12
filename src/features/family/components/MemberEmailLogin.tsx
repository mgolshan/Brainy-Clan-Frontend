import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Member } from '@/api/types';
import { useUpdateMember } from '@/features/family/hooks';
import { formErrors } from '@/lib/formErrors';
import { Badge, Button, Card, Text, TextField } from '@/ui';

/**
 * Admin: add, change or remove a member's email login (`PATCH /family/members/{id}` with
 * `email`). Whether the member's band may have one is the server's call: the field is shown when
 * the member's `email_login_allowed` is true (from their band policy) or when they already have
 * an email (so it can still be changed or removed). Older APIs without the flag fall back to
 * "not a child"; the server's 422 on `email` stays the final word. Members without an email
 * login who may not get one just see that they sign in with a code.
 */
export function MemberEmailLogin({ member }: { member: Member }) {
  const { t } = useTranslation();
  const update = useUpdateMember(member.id);
  const current = member.email ?? null;
  const [email, setEmail] = useState(current ?? '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saved, setSaved] = useState(false);
  const errors = formErrors(update.error, t, ['email']);

  // Older API without the field: nothing to show.
  if (member.email === undefined) return null;

  const name = member.nickname;
  const allowed = member.email_login_allowed ?? !member.is_child;
  if (!current && !allowed) {
    return (
      <Card padding="lg">
        <Text tone="muted">{t('memberLogin.emailNone', { name })}</Text>
      </Card>
    );
  }

  const trimmed = email.trim();
  const changed = trimmed !== (current ?? '');

  return (
    <Card padding="lg" style={{ gap: 12 }}>
      <TextField
        label={t('memberLogin.email')}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setSaved(false);
          if (update.error) update.reset();
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="off"
        error={errors.field('email')}
        hint={t('memberLogin.emailHint', { name })}
      />
      {current ? (
        <View style={{ flexDirection: 'row' }}>
          <Badge
            label={
              member.has_password ? t('memberLogin.passwordSet') : t('memberLogin.passwordNotSet')
            }
            tone={member.has_password ? 'success' : 'neutral'}
          />
        </View>
      ) : null}
      {errors.general ? <Text tone="danger">{errors.general}</Text> : null}
      {saved && !changed ? (
        <Text tone="success" accessibilityLiveRegion="polite">
          {t('memberLogin.emailSaved')}
        </Text>
      ) : null}
      {changed && trimmed ? (
        <Button
          title={t('memberLogin.emailSave')}
          icon="mail-outline"
          loading={update.isPending && update.variables?.email !== null}
          onPress={() =>
            update.mutate(
              { email: trimmed },
              {
                onSuccess: () => {
                  setSaved(true);
                  setConfirmRemove(false);
                },
              },
            )
          }
        />
      ) : null}
      {current ? (
        <>
          <Text variant="caption" tone="muted">
            {t('memberLogin.removeEmailHint', { name })}
          </Text>
          <Button
            title={
              confirmRemove ? t('memberLogin.removeEmailConfirm') : t('memberLogin.removeEmail')
            }
            variant={confirmRemove ? 'danger' : 'outline'}
            icon="trash-outline"
            loading={update.isPending && update.variables?.email === null}
            onPress={() => {
              if (!confirmRemove) {
                setConfirmRemove(true);
                return;
              }
              update.mutate(
                { email: null },
                {
                  onSuccess: () => {
                    setEmail('');
                    setConfirmRemove(false);
                    setSaved(false);
                  },
                },
              );
            }}
          />
        </>
      ) : null}
    </Card>
  );
}
