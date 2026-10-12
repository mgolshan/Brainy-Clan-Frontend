import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLogin } from '@/features/auth/hooks';
import { SocialSignIn } from '@/features/auth/social/SocialSignIn';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Screen, Text, TextField } from '@/ui';

/** Adult sign-in with email + password (`POST /auth/login`) or Google/Facebook. */
export function LoginScreen() {
  const { t } = useTranslation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const errors = formErrors(login.error, t, ['email', 'password']);

  const submit = () => {
    if (!email.trim() || !password) return;
    login.mutate({ email: email.trim(), password });
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
        {errors.general ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {errors.general}
          </Text>
        ) : null}
        <Button
          title={t('login.submit')}
          icon="log-in-outline"
          onPress={submit}
          loading={login.isPending}
          disabled={!email.trim() || !password}
        />
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
