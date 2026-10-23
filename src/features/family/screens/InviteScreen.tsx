import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Share, StyleSheet, View } from 'react-native';

import type { AvatarKey, Invite } from '@/api/types';
import { BirthDateFields } from '@/features/auth/components/BirthDateFields';
import { useCreateInvite, useInvitePreview } from '@/features/family/hooks';
import { LegalLinks } from '@/features/legal/components';
import { useLegal } from '@/features/legal/hooks';
import { AvatarPicker } from '@/features/profile/AvatarPicker';
import { formatDate } from '@/lib/format';
import { formErrors } from '@/lib/formErrors';
import { ageBandLabel } from '@/lib/labels';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Appear,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Confetti,
  Screen,
  Text,
  TextField,
  useTheme,
} from '@/ui';

/** The created invite: a big, easy-to-read code to share or show. */
function InviteCode({ invite }: { invite: Invite }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const message = t('invite.shareMessage', { name: invite.nickname, code: invite.code });

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Appear>
        <Card variant="hero" padding="lg" style={styles.codeCard}>
          <Avatar avatar={invite.avatar} size={72} />
          <Text tone="onPrimary" weight="bold" align="center">
            {t('invite.codeFor', { name: invite.nickname })}
          </Text>
          <Text
            variant="display"
            tone="onPrimary"
            align="center"
            selectable
            accessibilityLabel={invite.code.split('').join(' ')}
            style={[styles.code, { fontFamily: theme.fonts.display }]}>
            {invite.code}
          </Text>
          <Text variant="caption" tone="onPrimary" align="center">
            {t('invite.expires', { date: formatDate(invite.expires_at, i18n.language) })}
          </Text>
        </Card>
      </Appear>
      <Badge label={ageBandLabel(t, invite.age_band)} />
      <Text tone="muted">{t('invite.howTo')}</Text>
      <Button
        title={t('invite.share')}
        icon="share-outline"
        onPress={() => void Share.share({ message }).catch(() => undefined)}
      />
      <Button
        title={copied ? t('invite.copied') : t('invite.copy')}
        icon={copied ? 'checkmark' : 'copy-outline'}
        variant="outline"
        onPress={() => {
          void Clipboard.setStringAsync(invite.code).then(() => setCopied(true));
        }}
      />
      <Button title={t('common.done')} variant="ghost" onPress={() => router.back()} />
      {Platform.OS !== 'web' && theme.celebration !== 'calm' ? <Confetti count={30} /> : null}
    </View>
  );
}

/** How the parental-consent checkbox is shown on the invite form. */
type ConsentMode = 'hidden' | 'required' | 'optional';

/**
 * Admin: invite a member with nickname + birth year/month (`POST /family/invites`).
 *
 * Parental consent (B9): once the birth date is complete (debounced), the form asks
 * `GET /family/invites/preview` and shows the consent checkbox only when the server says
 * `parental_consent_required` (then Create waits for the tick). If the backend doesn't serve the
 * preview (404) or it fails, the form falls back to an optional checkbox worded "if this is a
 * child"; the server's 422 on `parental_consent` always decides and shows the checkbox.
 */
export function InviteScreen() {
  const { t } = useTranslation();
  const create = useCreateInvite();
  const [nickname, setNickname] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<AvatarKey | null>(null);
  const [consent, setConsent] = useState(false);
  const legal = useLegal().data;
  const errors = formErrors(create.error, t, [
    'nickname',
    'birth_year',
    'birth_month',
    'avatar',
    'parental_consent',
  ]);

  const birthKey = /^\d{4}$/.test(year) && month !== null ? `${year}-${month}` : null;
  const settledKey = useDebouncedValue(birthKey, 400);
  const [settledYear, settledMonth] = (settledKey ?? '').split('-').map(Number);
  const preview = useInvitePreview(
    settledKey && settledKey === birthKey ? { year: settledYear, month: settledMonth } : null,
  );
  // True until the preview for the date currently typed has answered (or failed).
  const checking = birthKey !== null && (settledKey !== birthKey || preview.isPending);

  let consentMode: ConsentMode = 'hidden';
  if (birthKey !== null && !checking) {
    if (preview.isError || preview.data === null) consentMode = 'optional';
    else if (preview.data?.parental_consent_required) consentMode = 'required';
  }
  if (errors.field('parental_consent') && consentMode === 'hidden') consentMode = 'required';
  const previewBand = !checking && preview.data ? preview.data.age_band : null;

  if (create.data) {
    return (
      <Screen title={t('invite.readyTitle')} back>
        <InviteCode invite={create.data} />
      </Screen>
    );
  }

  const ready =
    !!nickname.trim() && birthKey !== null && !checking && (consentMode !== 'required' || consent);

  return (
    <Screen title={t('invite.title')} subtitle={t('invite.subtitle')} back>
      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={t('invite.nickname')}
          value={nickname}
          onChangeText={setNickname}
          placeholder={t('invite.nicknamePlaceholder')}
          hint={t('invite.nicknameHint')}
          error={errors.field('nickname')}
        />
        <BirthDateFields
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          yearError={errors.field('birth_year')}
          monthError={errors.field('birth_month')}
          hint={t('invite.birthHint')}
        />
        <AvatarPicker value={avatar} onChange={setAvatar} ageBand={previewBand} />
        {previewBand ? (
          <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
            {t('invite.ageGroup', { band: ageBandLabel(t, previewBand) })}
          </Text>
        ) : null}
        {consentMode !== 'hidden' ? (
          <View>
            <Checkbox
              label={
                consentMode === 'required'
                  ? t('legal.parentalConsentRequired')
                  : t('legal.parentalConsent')
              }
              description={
                consentMode === 'required'
                  ? t('legal.parentalConsentRequiredHint')
                  : t('legal.parentalConsentHint')
              }
              checked={consent}
              onChange={setConsent}
              error={errors.field('parental_consent')}
            />
            <LegalLinks legal={legal} />
          </View>
        ) : null}
        {errors.general ? <Text tone="danger">{errors.general}</Text> : null}
        <Button
          title={t('invite.create')}
          icon="key-outline"
          size="lg"
          loading={create.isPending}
          disabled={!ready}
          onPress={() =>
            ready &&
            month !== null &&
            create.mutate({
              nickname: nickname.trim(),
              birth_year: Number(year),
              birth_month: month,
              ...(avatar ? { avatar } : {}),
              ...(consentMode !== 'hidden' && consent ? { parental_consent: true } : {}),
            })
          }
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: 'center', gap: 10 },
  code: { letterSpacing: 6, fontSize: 40, lineHeight: 50 },
});
