import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Accessibility, AvatarKey, Member } from '@/api/types';
import { useIsAdmin, useMe, usePolicy } from '@/features/auth/hooks';
import { DevicesList } from '@/features/family/components/DevicesList';
import { MemberEmailLogin } from '@/features/family/components/MemberEmailLogin';
import { useFamily, useRemoveMember, useUpdateMember } from '@/features/family/hooks';
import { AccessibilityEditor } from '@/features/profile/AccessibilityEditor';
import { AvatarPicker } from '@/features/profile/AvatarPicker';
import { goBack } from '@/lib/navigation';
import { formErrors } from '@/lib/formErrors';
import { ageBandLabel } from '@/lib/labels';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  ListRow,
  Loading,
  Screen,
  SectionHeader,
  Stepper,
  Text,
  TextField,
  isThemeKey,
  useTheme,
} from '@/ui';

function Editor({ member, ownerUserId }: { member: Member; ownerUserId: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const policy = usePolicy();
  const update = useUpdateMember(member.id);
  const remove = useRemoveMember();
  const [nickname, setNickname] = useState(member.nickname);
  const [avatar, setAvatar] = useState<string | null>(member.avatar);
  const [difficulty, setDifficulty] = useState<number | null>(member.difficulty_override);
  const [a11y, setA11y] = useState<Accessibility>(member.accessibility);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const errors = formErrors(update.error, t, ['nickname', 'avatar', 'difficulty_override']);

  const isOwner = member.user_id === ownerUserId;
  // "Automatic" previews the theme this member's own policy gives (`default_ui_theme`).
  const autoTheme = isThemeKey(member.default_ui_theme)
    ? member.default_ui_theme
    : (policy?.ui_theme ?? 'modern');

  const save = () =>
    update.mutate(
      {
        nickname: nickname.trim(),
        ...(avatar ? { avatar: avatar as AvatarKey } : {}),
        difficulty_override: difficulty,
        accessibility: a11y,
      },
      { onSuccess: () => goBack('/family') },
    );

  return (
    <Screen
      title={member.nickname}
      back
      footer={
        <Button
          title={t('common.save')}
          icon="checkmark"
          loading={update.isPending}
          disabled={!nickname.trim()}
          onPress={save}
        />
      }>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar avatar={avatar} size={96} ring={member.id === me?.member?.id} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Badge label={ageBandLabel(t, member.age_band)} />
          {member.role === 'admin' ? <Badge label={t('family.admin')} tone="primary" /> : null}
        </View>
      </View>

      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={t('invite.nickname')}
          value={nickname}
          onChangeText={setNickname}
          error={errors.field('nickname')}
        />
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </Card>

      <SectionHeader title={t('member.difficulty')} />
      <Card style={{ gap: 8 }} padding="lg">
        <Stepper
          label={t('member.difficultyLevel')}
          value={difficulty}
          min={1}
          max={10}
          onChange={setDifficulty}
          emptyLabel={t('member.auto')}
        />
        <Text variant="caption" tone="muted">
          {t('member.difficultyHint')}
        </Text>
        {difficulty !== null ? (
          <Button
            title={t('member.useAuto')}
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => setDifficulty(null)}
          />
        ) : null}
        {errors.field('difficulty_override') ? (
          <Text variant="caption" tone="danger">
            {errors.field('difficulty_override')}
          </Text>
        ) : null}
      </Card>

      <SectionHeader title={t('profile.appearance')} />
      <Card padding="lg">
        <AccessibilityEditor
          value={a11y}
          autoTheme={autoTheme}
          onChange={(patch) => setA11y((prev) => ({ ...prev, ...patch }))}
        />
      </Card>

      {errors.general ? <Text tone="danger">{errors.general}</Text> : null}

      <SectionHeader title={t('memberLogin.title')} />
      <Card padding="sm">
        <ListRow
          title={t('memberLogin.signInOnDevice')}
          subtitle={t('memberLogin.signInOnDeviceHint')}
          onPress={() =>
            router.push({ pathname: '/sign-in-code/[id]', params: { id: String(member.id) } })
          }
        />
      </Card>
      <MemberEmailLogin member={member} />

      <SectionHeader title={t('notifications.title')} />
      <Card padding="sm">
        <ListRow
          title={t('notifications.title')}
          subtitle={t('notifications.memberEntryHint')}
          leading={<Icon name="notifications-outline" color={theme.colors.primary} />}
          onPress={() =>
            router.push({
              pathname: '/member-notifications/[id]',
              params: { id: String(member.id) },
            })
          }
        />
      </Card>
      <DevicesList memberId={member.id} />

      {!isOwner ? (
        <Card style={{ gap: 8 }}>
          <Text variant="caption" tone="muted">
            {t('member.removeHint')}
          </Text>
          <Button
            title={confirmRemove ? t('member.removeConfirm') : t('member.remove')}
            variant={confirmRemove ? 'danger' : 'outline'}
            icon="person-remove-outline"
            loading={remove.isPending}
            onPress={() => {
              if (!confirmRemove) {
                setConfirmRemove(true);
                return;
              }
              remove.mutate(member.id, { onSuccess: () => goBack('/family') });
            }}
          />
          {remove.error ? <ErrorState error={remove.error} /> : null}
        </Card>
      ) : null}
    </Screen>
  );
}

/** Admin: edit a member's nickname, avatar, difficulty override and accessibility. */
export function MemberEditScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = useIsAdmin();
  const family = useFamily();

  if (family.isPending) return <Loading />;
  if (family.isError) {
    return (
      <Screen back>
        <ErrorState error={family.error} onRetry={() => void family.refetch()} />
      </Screen>
    );
  }
  const member = family.data.members.find((m) => String(m.id) === id);
  if (!member || !isAdmin) {
    return (
      <Screen back>
        <EmptyState title={t('errors.notFound')} emoji="🔍" icon="search-outline" />
      </Screen>
    );
  }
  return <Editor key={member.id} member={member} ownerUserId={family.data.family.owner_user_id} />;
}
