import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { useSubmitReferralCode } from '@/features/billing/hooks';
import {
  REFERRAL_CODE_MAX_LENGTH,
  cleanReferralInput,
  normalizeReferralCode,
  referralFailure,
  referralFailureKey,
  useReferralStore,
} from '@/features/billing/referral';
import { PLAY_REDEEM_URL } from '@/features/billing/source';
import { store } from '@/features/billing/store';
import { StoreError } from '@/features/billing/storeTypes';
import { useFamily } from '@/features/family/hooks';
import { openInAppBrowser } from '@/features/legal/hooks';
import { errorMessage } from '@/lib/errorMessage';
import { Button, Card, Icon, Text, TextField, useTheme } from '@/ui';

/** Friendly text for a refused referral code (en/fr), else the generic API error text. */
export function useReferralErrorText() {
  const { t } = useTranslation();
  return (error: unknown) => {
    const failure = referralFailure(error);
    return failure ? t(referralFailureKey(failure)) : errorMessage(error, t);
  };
}

/**
 * Notice for a code typed at sign-up that the server refused after the family was created
 * (shown once to the admin; dismissable).
 */
export function PendingReferralNotice() {
  const { t } = useTranslation();
  const theme = useTheme();
  const failure = useReferralStore((s) => s.failure);
  const setFailure = useReferralStore((s) => s.setFailure);
  if (!failure) return null;
  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <Text tone="danger" accessibilityLiveRegion="polite">
        {t('billing.referral.failedPending', {
          code: failure.code,
          reason: t(referralFailureKey(failure.reason)),
        })}
      </Text>
      <Button
        title={t('common.done')}
        variant="ghost"
        size="sm"
        fullWidth={false}
        onPress={() => setFailure(null)}
      />
    </Card>
  );
}

/**
 * "Have a code?" on the paywall (admins): `POST /family/referral-code` once. When the family
 * already has a code (admin view of `GET /family`), only that code is shown.
 */
export function ReferralCodeSection() {
  const { t } = useTranslation();
  const theme = useTheme();
  const family = useFamily().data?.family;
  const submit = useSubmitReferralCode();
  const errorText = useReferralErrorText();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const code = normalizeReferralCode(value);
  const applied = submit.data?.code ?? family?.referral_code ?? null;

  if (applied) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Icon name="pricetag-outline" color={theme.colors.success} size={20} />
        <Text tone="muted" style={{ flex: 1 }}>
          {t('billing.referral.applied', { code: applied })}
        </Text>
      </View>
    );
  }

  if (!open) {
    return (
      <Button
        title={t('billing.referral.title')}
        icon="pricetag-outline"
        variant="ghost"
        onPress={() => setOpen(true)}
      />
    );
  }

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <TextField
        label={t('billing.referral.label')}
        value={value}
        onChangeText={(v) => {
          setValue(cleanReferralInput(v));
          if (submit.isError) submit.reset();
        }}
        placeholder={t('billing.referral.placeholder')}
        hint={t('billing.referral.hint')}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={REFERRAL_CODE_MAX_LENGTH}
        error={submit.isError ? errorText(submit.error) : undefined}
        onSubmitEditing={() => code && submit.mutate(code)}
        returnKeyType="done"
      />
      <Button
        title={t('billing.referral.apply')}
        variant="outline"
        onPress={() => code && submit.mutate(code)}
        loading={submit.isPending}
        disabled={!code}
      />
    </Card>
  );
}

/**
 * Store offer codes (native only, admins): the iOS code redemption sheet, or Google Play's
 * redeem page on Android. Hidden on web / Expo Go (`offerCodeRedemption` null).
 */
export function OfferCodeButton() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const mode = store.offerCodeRedemption;
  if (!mode) return null;

  const redeem = () => {
    setError(null);
    if (mode === 'link') {
      void Linking.openURL(PLAY_REDEEM_URL).catch(() => openInAppBrowser(PLAY_REDEEM_URL));
      return;
    }
    store.presentCodeRedemptionSheet().catch((e: unknown) => {
      setError(t(`billing.errors.${e instanceof StoreError ? e.kind : 'unknown'}`));
    });
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Button
        title={t('billing.offerCode.redeem')}
        icon="gift-outline"
        variant="ghost"
        onPress={redeem}
      />
      <Text variant="caption" tone="muted" align="center">
        {mode === 'sheet' ? t('billing.offerCode.hintSheet') : t('billing.offerCode.hintLink')}
      </Text>
      {error ? <Text tone="danger">{error}</Text> : null}
    </View>
  );
}
