import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Share, StyleSheet, View } from 'react-native';

import type { AvatarKey, Invite } from '@/api/types';
import { BirthDateFields } from '@/features/auth/components/BirthDateFields';
import { useCreateInvite } from '@/features/family/hooks';
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

/** Admin: invite a member with nickname + birth year/month (`POST /family/invites`). */
export function InviteScreen() {
  const { t } = useTranslation();
  const create = useCreateInvite();
  const [nickname, setNickname] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<AvatarKey | null>(null);
  const errors = formErrors(create.error, t, ['nickname', 'birth_year', 'birth_month', 'avatar']);

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
