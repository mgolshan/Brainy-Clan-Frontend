import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BirthDateFields } from '@/features/auth/components/BirthDateFields';
import { useRegister } from '@/features/auth/hooks';
import { SocialSignIn } from '@/features/auth/social/SocialSignIn';
import i18n from '@/i18n';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Screen, Text, TextField } from '@/ui';

const FIELDS = ['display_name', 'email', 'password', 'birth_year', 'birth_month'] as const;

/**
 * Parent sign-up (`POST /auth/register`). The server decides whether the age qualifies for an
 * adult account and answers 422 otherwise; the app does no age math.
 */
export function RegisterScreen() {
  const { t } = useTranslation();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState<number | null>(null);
  const errors = formErrors(register.error, t, FIELDS);

  const ready = name.trim() && email.trim() && password.length > 0 && year.length === 4 && month;

  const submit = () => {
    if (!ready || month === null) return;
    register.mutate({
      display_name: name.trim(),
      email: email.trim(),
      password,
      birth_year: Number(year),
      birth_month: month,
      locale: i18n.language,
    });
  };

  return (
    <Screen title={t('register.title')} subtitle={t('register.subtitle')} back>
      <SocialSignIn divider="bottom" />
      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={t('forms.displayName')}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          placeholder={t('register.namePlaceholder')}
          error={errors.field('display_name')}
        />
        <TextField
          label={t('forms.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.field('email')}
        />
        <TextField
          label={t('forms.password')}
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          hint={t('register.passwordHint')}
          error={errors.field('password')}
        />
        <BirthDateFields
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          yearError={errors.field('birth_year')}
          monthError={errors.field('birth_month')}
          hint={t('register.birthHint')}
          yearPlaceholder="1988"
        />
        {errors.general ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {errors.general}
          </Text>
        ) : null}
        <Button
          title={t('register.submit')}
          icon="sparkles-outline"
          onPress={submit}
          loading={register.isPending}
          disabled={!ready}
        />
      </Card>
      <Button
        title={t('register.haveAccount')}
        variant="ghost"
        onPress={() => router.replace('/login')}
      />
    </Screen>
  );
}
