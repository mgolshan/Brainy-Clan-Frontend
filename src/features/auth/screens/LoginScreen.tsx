import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LockoutNotice } from '@/features/auth/components/LockoutNotice';
import { handOffForgotEmail } from '@/features/auth/forgotPassword';
import { useLogin } from '@/features/auth/hooks';
import { useLockout } from '@/features/auth/lockout';
import { SocialSignIn } from '@/features/auth/social/SocialSignIn';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Screen, Text, TextField } from '@/ui';

/**
 * Adult sign-in with email + password (`POST /auth/login`) or Google/Facebook/Apple. After too
 * many failures the API answers `login_locked`: submit is disabled during a live countdown and the
 * other ways in are offered (forgot password, sign-in code, social buttons above).
 */
export function LoginScreen() {
  const { t } = useTranslation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const errors = formErrors(login.error, t, ['email', 'password']);
  const lockout = useLockout(login.error);
  const ready = !!email.trim() && !!password && !lockout.locked;

  const submit = () => {
    if (!ready || login.isPending) return;
    login.mutate({ email: email.trim(), password });
  };

  const forgotPassword = () => {
    handOffForgotEmail(email);
    router.push('/forgot-password');
  };

  return (
    <Screen title={t('login.title')} subtitle={t('login.subtitle')} back>
      <SocialSignIn divider="bottom" />
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
          returnKeyType="next"
        />
        <TextField
          label={t('forms.password')}
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="current-password"
          textContentType="password"
          error={errors.field('password')}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        {lockout.locked && lockout.countdown ? (
          <LockoutNotice countdown={lockout.countdown} hint={t('lockout.loginHint')}>
            <Button
              title={t('login.forgotPassword')}
              variant="outline"
              size="sm"
              icon="key-outline"
              onPress={forgotPassword}
            />
            <Button
              title={t('welcome.haveSignInCode')}
              variant="ghost"
              size="sm"
              onPress={() => router.replace('/code')}
            />
          </LockoutNotice>
        ) : errors.general ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {errors.general}
          </Text>
        ) : null}
        <Button
          title={t('login.submit')}
          icon="log-in-outline"
          onPress={submit}
          loading={login.isPending}
          disabled={!ready}
        />
        {lockout.locked ? null : (
          <Button
            title={t('login.forgotPassword')}
            variant="ghost"
            size="sm"
            onPress={forgotPassword}
          />
        )}
      </Card>
      <Button
        title={t('login.noAccount')}
        variant="ghost"
        onPress={() => router.replace('/register')}
      />
      <Button title={t('login.haveCode')} variant="ghost" onPress={() => router.replace('/join')} />
      <Button
        title={t('welcome.haveSignInCode')}
        variant="ghost"
        onPress={() => router.replace('/code')}
      />
    </Screen>
  );
}
