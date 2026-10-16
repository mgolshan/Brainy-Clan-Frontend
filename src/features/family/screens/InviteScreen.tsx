import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Share, StyleSheet, View } from 'react-native';

import type { AvatarKey, Invite } from '@/api/types';
import { BirthDateFields } from '@/features/auth/components/BirthDateFields';
import { useCreateInvite } from '@/features/family/hooks';
import { LegalLinks } from '@/features/legal/components';
import { useLegal } from '@/features/legal/hooks';
import { AvatarPicker } from '@/features/profile/AvatarPicker';
import { formatDate } from '@/lib/format';
import { formErrors } from '@/lib/formErrors';
import { ageBandLabel } from '@/lib/labels';
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
      {Platform.OS !== 'web' && theme.celebration === 'confetti' ? <Confetti count={30} /> : null}
    </View>
  );
}

/**
 * Admin: invite a member with nickname + birth year/month (`POST /family/invites`).
 *
 * Parental consent (B9): the server requires `parental_consent: true` when the birth date falls
 * in a band with `is_child`. The app must not compute age bands and there is no server signal
 * before the invite exists, so the consent checkbox is shown for every invite (worded "if this is
 * a child"), is optional on the client, and is sent only when ticked; the server's 422 on
 * `parental_consent` decides and is shown under the checkbox.
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

  if (create.data) {
    return (
      <Screen title={t('invite.readyTitle')} back>
        <InviteCode invite={create.data} />
      </Screen>
    );
  }

  const ready = nickname.trim() && year.length === 4 && month !== null;

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
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <View>
          <Checkbox
            label={t('legal.parentalConsent')}
            description={t('legal.parentalConsentHint')}
            checked={consent}
            onChange={setConsent}
            error={errors.field('parental_consent')}
          />
          <LegalLinks legal={legal} />
        </View>
        {errors.general ? <Text tone="danger">{errors.general}</Text> : null}
        <Button
          title={t('invite.create')}
          icon="key-outline"
          size="lg"
          loading={create.isPending}
          disabled={!ready}
          onPress={() =>
            month !== null &&
            create.mutate({
              nickname: nickname.trim(),
              birth_year: Number(year),
              birth_month: month,
              ...(avatar ? { avatar } : {}),
              ...(consent ? { parental_consent: true } : {}),
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
