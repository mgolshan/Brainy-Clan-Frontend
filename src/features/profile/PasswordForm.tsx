import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useUpdatePassword } from '@/features/profile/hooks';
import { formErrors } from '@/lib/formErrors';
import { Button, Text, TextField } from '@/ui';

/**
 * Set (first time, after an admin added an email login) or change the password of the user's
 * email login (`PUT /me/password`). The current password is only asked for when one exists.
 */
export function PasswordForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const { t } = useTranslation();
  const update = useUpdatePassword();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saved, setSaved] = useState(false);
  const errors = formErrors(update.error, t, [
    'current_password',
    'password',
    'password_confirmation',
  ]);

  const mismatch = confirmation.length > 0 && confirmation !== password;
  const ready = password.length > 0 && confirmation === password && (!hasPassword || current);

  const reset = () => {
    setCurrent('');
    setPassword('');
    setConfirmation('');
    update.reset();
  };

  if (!open) {
    return (
      <View style={{ gap: 8 }}>
        {saved ? (
          <Text tone="success" accessibilityLiveRegion="polite">
            {t('password.saved')}
          </Text>
        ) : null}
        {!hasPassword ? (
          <Text variant="caption" tone="muted">
            {t('password.setHint', { email })}
          </Text>
        ) : null}
        <Button
          title={hasPassword ? t('password.change') : t('password.set')}
          variant="outline"
          icon="lock-closed-outline"
          onPress={() => {
            setSaved(false);
            setOpen(true);
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {hasPassword ? (
        <TextField
          label={t('password.current')}
          value={current}
          onChangeText={setCurrent}
          password
          autoComplete="current-password"
          error={errors.field('current_password')}
        />
      ) : null}
      <TextField
        label={t('password.new')}
        value={password}
        onChangeText={setPassword}
        password
        autoComplete="new-password"
        hint={t('register.passwordHint')}
        error={errors.field('password')}
      />
      <TextField
        label={t('password.confirm')}
        value={confirmation}
        onChangeText={setConfirmation}
        password
        autoComplete="new-password"
        error={mismatch ? t('password.mismatch') : errors.field('password_confirmation')}
      />
      {errors.general ? <Text tone="danger">{errors.general}</Text> : null}
      <Button
        title={t('password.save')}
        icon="checkmark"
        loading={update.isPending}
        disabled={!ready}
        onPress={() =>
          update.mutate(
            {
              password,
              password_confirmation: confirmation,
              ...(hasPassword ? { current_password: current } : {}),
            },
            {
              onSuccess: () => {
                reset();
                setOpen(false);
                setSaved(true);
              },
            },
          )
        }
      />
      <Button
        title={t('common.cancel')}
        variant="ghost"
        onPress={() => {
          reset();
          setOpen(false);
        }}
      />
    </View>
  );
}
