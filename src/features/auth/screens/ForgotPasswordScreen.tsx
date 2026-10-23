import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { LockoutNotice } from '@/features/auth/components/LockoutNotice';
import {
  canSubmitForgot,
  forgotPasswordBody,
  takeForgotEmail,
} from '@/features/auth/forgotPassword';
import { useForgotPassword } from '@/features/auth/hooks';
import { useLockout } from '@/features/auth/lockout';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Screen, Text, TextField, useTheme } from '@/ui';

function backToSignIn() {
  if (router.canGoBack()) router.back();
  else router.replace('/login');
}

/**
 * "Forgot password?" (`POST /auth/password/forgot`, locale = app language). Every 202 shows the
 * same confirmation, so the screen never reveals whether an account uses the email. The reset
 * itself happens on the website page linked from the email (no deep link back into the app).
 */
export function ForgotPasswordScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const forgot = useForgotPassword();
  const [email, setEmail] = useState(takeForgotEmail);
  const lockout = useLockout(forgot.error);
  const errors = formErrors(forgot.error, t, ['email']);
  const ready = canSubmitForgot(email, forgot.isPending, lockout.locked);

  const submit = () => {
    if (ready) forgot.mutate(forgotPasswordBody(email, i18n.language));
  };

  if (forgot.isSuccess) {
    return (
      <Screen title={t('forgot.sentTitle')} back onBack={backToSignIn}>
        <View style={styles.center}>
          <RNText style={styles.emoji}>{theme.emojiIcons ? '📬' : '✉️'}</RNText>
        </View>
        <Card style={{ gap: theme.spacing.sm }} padding="lg">
          <Text accessibilityLiveRegion="polite">{t('forgot.sentBody')}</Text>
          <Text variant="caption" tone="muted">
            {t('forgot.sentSpam')}
          </Text>
        </Card>
        <Button title={t('forgot.backToSignIn')} icon="log-in-outline" onPress={backToSignIn} />
        <Button title={t('forgot.tryAnother')} variant="ghost" onPress={() => forgot.reset()} />
      </Screen>
    );
  }

  return (
    <Screen title={t('forgot.title')} subtitle={t('forgot.subtitle')} back>
      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={t('forms.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.field('email')}
          returnKeyType="send"
          onSubmitEditing={submit}
          autoFocus={!email}
        />
        {lockout.locked && lockout.countdown ? (
          <LockoutNotice countdown={lockout.countdown} hint={t('lockout.forgotHint')} />
        ) : errors.general ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {errors.general}
          </Text>
        ) : null}
        <Button
          title={t('forgot.submit')}
          icon="mail-outline"
          onPress={submit}
          loading={forgot.isPending}
          disabled={!ready}
        />
      </Card>
      <Button title={t('forgot.backToSignIn')} variant="ghost" onPress={backToSignIn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  emoji: { fontSize: 56 },
});
