import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/client';
import type { SocialProvider } from '@/api/types';
import { BirthDateFields } from '@/features/auth/components/BirthDateFields';
import { useSocialSignIn } from '@/features/auth/social/api';
import { AppleButton } from '@/features/auth/social/AppleButton';
import { fakeSocial, PROVIDER_NAMES } from '@/features/auth/social/config';
import { SocialButton } from '@/features/auth/social/SocialButton';
import type { ProviderCredential, ProviderTokenSource } from '@/features/auth/social/types';
import { useSocialProviders } from '@/features/auth/social/useSocialProviders';
import i18n from '@/i18n';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Text, useTheme } from '@/ui';

const BIRTH_FIELDS = ['birth_year', 'birth_month'] as const;

/** A thin "—— or ——" separator between the social buttons and the other options. */
export function OrDivider() {
  const { t } = useTranslation();
  const theme = useTheme();
  const line = {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: theme.colors.border,
  };
  return (
    <View style={styles.or} accessibilityElementsHidden importantForAccessibility="no">
      <View style={line} />
      <Text variant="caption" tone="subtle">
        {t('social.or')}
      </Text>
      <View style={line} />
    </View>
  );
}

interface SocialSignInProps {
  /** Where the "or" separator goes relative to the buttons. */
  divider?: 'top' | 'bottom' | 'none';
}

/**
 * "Continue with Apple / Google / Facebook" for adults (welcome, sign-in, register; never the invite or
 * child flows). Provider token -> `POST /auth/social/{provider}`; a new account answers 422
 * `social_signup_incomplete`, then a "birth year and month" step retries with the same token.
 * Success signs in like `/auth/login` (the root guard routes on). Renders nothing when no
 * provider is available on this build/platform.
 */
export function SocialSignIn({ divider = 'none' }: SocialSignInProps) {
  const { t } = useTranslation();
  const providers = useSocialProviders();
  const signIn = useSocialSignIn();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    provider: SocialProvider;
    credential: ProviderCredential;
  } | null>(null);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState<number | null>(null);

  if (providers.length === 0) return null;

  const incomplete = isApiError(signIn.error, 'social_signup_incomplete');
  const errors = formErrors(incomplete ? null : signIn.error, t, BIRTH_FIELDS);

  const start = (source: ProviderTokenSource) => {
    setProviderError(null);
    signIn.reset();
    setBusy(source.provider);
    // Called synchronously from the tap: on web the provider popup must open right here.
    source
      .getToken()
      .then((credential) => {
        if (!credential) {
          setBusy(null);
          return;
        }
        signIn.mutate(
          { provider: source.provider, credential },
          {
            onError: (error) => {
              if (isApiError(error, 'social_signup_incomplete')) {
                setYear('');
                setMonth(null);
                // Same credential on retry (Apple's name comes only once, so it rides along).
                setPending({ provider: source.provider, credential });
              }
            },
            onSettled: () => setBusy(null),
          },
        );
      })
      .catch(() => {
        setBusy(null);
        setProviderError(t('social.failed', { provider: PROVIDER_NAMES[source.provider] }));
      });
  };

  const finish = () => {
    if (!pending || year.length !== 4 || month === null) return;
    signIn.mutate({
      ...pending,
      birth: { birth_year: Number(year), birth_month: month, locale: i18n.language },
    });
  };

  const cancelBirth = () => {
    setPending(null);
    signIn.reset();
  };

  const general = pending ? null : (providerError ?? errors.general);

  return (
    <View style={styles.wrap}>
      {divider === 'top' ? <OrDivider /> : null}
      {providers.map((source) =>
        source.provider === 'apple' ? (
          <AppleButton
            key={source.provider}
            loading={busy === source.provider}
            disabled={!source.ready || (busy !== null && busy !== source.provider)}
            onPress={() => start(source)}
          />
        ) : (
          <SocialButton
            key={source.provider}
            provider={source.provider}
            loading={busy === source.provider}
            disabled={!source.ready || (busy !== null && busy !== source.provider)}
            onPress={() => start(source)}
          />
        ),
      )}
      {general ? (
        <Text tone="danger" variant="caption" accessibilityLiveRegion="polite">
          {general}
        </Text>
      ) : null}
      {__DEV__ && fakeSocial ? (
        <Text variant="caption" tone="subtle" align="center">
          {t('social.devFake', { provider: 'Google/Facebook' })}
        </Text>
      ) : null}
      {divider === 'bottom' ? <OrDivider /> : null}

      <BirthStep
        visible={!!pending}
        provider={pending?.provider ?? 'google'}
        year={year}
        month={month}
        onYearChange={setYear}
        onMonthChange={setMonth}
        yearError={errors.field('birth_year')}
        monthError={errors.field('birth_month')}
        error={pending ? errors.general : undefined}
        loading={signIn.isPending}
        onSubmit={finish}
        onCancel={cancelBirth}
      />
    </View>
  );
}

interface BirthStepProps {
  visible: boolean;
  provider: SocialProvider;
  year: string;
  month: number | null;
  onYearChange: (v: string) => void;
  onMonthChange: (v: number) => void;
  yearError?: string;
  monthError?: string;
  error?: string;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** First-time social sign-up: the server needs birth year + month (it decides the age band). */
function BirthStep(props: BirthStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const ready = props.year.length === 4 && props.month !== null;
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType={theme.reducedMotion ? 'none' : 'fade'}
      onRequestClose={props.onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
          <Card padding="lg" style={styles.sheet}>
            <Text variant="title" accessibilityRole="header">
              {t('social.birthTitle')}
            </Text>
            <Text tone="muted">
              {t('social.birthBody', { provider: PROVIDER_NAMES[props.provider] })}
            </Text>
            <BirthDateFields
              year={props.year}
              month={props.month}
              onYearChange={props.onYearChange}
              onMonthChange={props.onMonthChange}
              yearError={props.yearError}
              monthError={props.monthError}
              yearPlaceholder="1988"
            />
            {props.error ? (
              <Text tone="danger" accessibilityLiveRegion="polite">
                {props.error}
              </Text>
            ) : null}
            <Button
              title={t('social.continue')}
              icon="sparkles-outline"
              loading={props.loading}
              disabled={!ready}
              onPress={props.onSubmit}
            />
            <Button title={t('social.cancel')} variant="ghost" onPress={props.onCancel} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backdrop: { flex: 1 },
  sheetScroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  sheet: { gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
