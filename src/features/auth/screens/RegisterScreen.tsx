import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BirthDateFields } from '@/features/auth/components/BirthDateFields';
import { useRegister } from '@/features/auth/hooks';
import {
  REFERRAL_CODE_MAX_LENGTH,
  cleanReferralInput,
  normalizeReferralCode,
  useReferralStore,
} from '@/features/billing/referral';
import { usePricingTiers } from '@/features/billing/hooks';
import { classroomAgeMissed, planMinOwnerAge } from '@/features/billing/plans';
import { AcceptTerms } from '@/features/legal/components';
import { SocialSignIn } from '@/features/auth/social/SocialSignIn';
import { resolveIntent, startSignup, useSignupIntent } from '@/features/onboarding/signupIntent';
import i18n from '@/i18n';
import { MIN_FAMILY_OWNER_AGE, ageFromBirth } from '@/lib/age';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Screen, Text, TextField, useTheme } from '@/ui';

const FIELDS = [
  'display_name',
  'email',
  'password',
  'birth_year',
  'birth_month',
  'accept_terms',
] as const;

/**
 * Sign-up (`POST /auth/register`) for both welcome doors: a parent (family) or a teacher
 * (classroom; `?intent=classroom`, also kept in `useSignupIntent` so it survives to the
 * create-family step and social sign-up). The server decides whether the age qualifies for an
 * adult account and answers 422 otherwise. With the teacher intent, a birth date under the
 * Classroom owner minimum (18; `GET /pricing` wins) is explained up front with a way to continue
 * as a family instead; the server still decides when the plan is bought.
 */
export function RegisterScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const register = useRegister();
  const params = useLocalSearchParams<{ intent?: string | string[] }>();
  const storedIntent = useSignupIntent((s) => s.intent);
  const intent = resolveIntent(params.intent, storedIntent);
  const teacher = intent === 'classroom';
  const pricing = usePricingTiers(teacher);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false);
  // "Have a code?" (optional): kept on the device and sent once the family exists
  // (`POST /family/referral-code` after `POST /families`), also for social sign-ups from here.
  const pendingCode = useReferralStore((s) => s.pendingCode);
  const setPendingCode = useReferralStore((s) => s.setPending);
  const [codeOpen, setCodeOpen] = useState(!!pendingCode);
  const [code, setCode] = useState(pendingCode ?? '');
  const changeCode = (value: string) => {
    const cleaned = cleanReferralInput(value);
    setCode(cleaned);
    setPendingCode(normalizeReferralCode(cleaned));
  };
  const errors = formErrors(register.error, t, FIELDS);

  const age = year.length === 4 && month !== null ? ageFromBirth(Number(year), month) : null;
  const teacherAgeMissed = teacher ? classroomAgeMissed(age, pricing.data) : null;
  const classroomMinAge = planMinOwnerAge('classroom', pricing.data);

  const ready =
    name.trim() &&
    email.trim() &&
    password.length > 0 &&
    year.length === 4 &&
    month &&
    accepted &&
    teacherAgeMissed === null;

  const continueAsFamily = () => {
    startSignup('family');
    router.setParams({ intent: 'family' });
  };

  const submit = () => {
    if (!ready || month === null) return;
    startSignup(intent);
    register.mutate({
      display_name: name.trim(),
      email: email.trim(),
      password,
      birth_year: Number(year),
      birth_month: month,
      locale: i18n.language,
      accept_terms: true,
    });
  };

  return (
    <Screen
      title={teacher ? t('register.teacherTitle') : t('register.title')}
      subtitle={teacher ? t('register.teacherSubtitle') : t('register.subtitle')}
      back>
      <SocialSignIn divider="bottom" onStart={() => startSignup(intent)} />
      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={t('forms.displayName')}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          placeholder={
            teacher ? t('register.teacherNamePlaceholder') : t('register.namePlaceholder')
          }
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
          hint={
            teacher
              ? t('register.teacherBirthHint', { age: classroomMinAge ?? MIN_FAMILY_OWNER_AGE })
              : t('register.birthHint')
          }
          yearPlaceholder="1988"
        />
        {teacherAgeMissed !== null ? (
          <Card variant="tinted" tint={theme.colors.warning} style={{ gap: theme.spacing.sm }}>
            <Text weight="bold" accessibilityRole="header">
              {t('register.teacherTooYoungTitle', { age: teacherAgeMissed })}
            </Text>
            <Text accessibilityLiveRegion="polite">
              {t('register.teacherTooYoungBody', { age: teacherAgeMissed })}
            </Text>
            <Button
              title={t('register.continueAsFamily')}
              icon="people-outline"
              variant="outline"
              size="sm"
              onPress={continueAsFamily}
            />
          </Card>
        ) : null}
        {codeOpen ? (
          <TextField
            label={t('billing.referral.label')}
            value={code}
            onChangeText={changeCode}
            placeholder={t('billing.referral.placeholder')}
            hint={t('billing.referral.hint')}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={REFERRAL_CODE_MAX_LENGTH}
          />
        ) : (
          <Button
            title={t('register.codeToggle')}
            icon="pricetag-outline"
            variant="ghost"
            size="sm"
            onPress={() => setCodeOpen(true)}
          />
        )}
        <AcceptTerms
          checked={accepted}
          onChange={setAccepted}
          error={errors.field('accept_terms')}
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
        onPress={() => {
          // Signing in to an existing account: the code typed here isn't for that family, and
          // the sign-up intent isn't either.
          setPendingCode(null);
          useSignupIntent.getState().clear();
          router.replace('/login');
        }}
      />
    </Screen>
  );
}
