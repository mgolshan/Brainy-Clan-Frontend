import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { queryKeys } from '@/api/queryKeys';
import type { Invite, Member } from '@/api/types';
import { useIsAdmin, useMe, usePolicy } from '@/features/auth/hooks';
import { SubscriptionCard } from '@/features/billing/SubscriptionCard';
import { useDeleteInvite, useFamily, useInvites } from '@/features/family/hooks';
import { formatDate } from '@/lib/format';
import { ageBandLabel, tierLabel } from '@/lib/labels';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Icon,
  ListRow,
  Loading,
  Screen,
  SectionHeader,
  Text,
  useTheme,
} from '@/ui';

function MemberRow({
  member,
  isMe,
  onPress,
}: {
  member: Member;
  isMe: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const bandLabel = ageBandLabel(t, member.age_band);
  return (
    <ListRow
      title={isMe ? t('family.you', { name: member.nickname }) : member.nickname}
      subtitle={bandLabel}
      leading={<Avatar avatar={member.avatar} size={48} ring={isMe} />}
      trailing={
        member.role === 'admin' ? <Badge label={t('family.admin')} tone="primary" /> : undefined
      }
      onPress={onPress}
      accessibilityHint={onPress ? t('family.editHint') : undefined}
    />
  );
}

function InviteRow({ invite }: { invite: Invite }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const remove = useDeleteInvite();
  return (
    <ListRow
      title={invite.nickname}
      subtitle={t('family.inviteExpires', { date: formatDate(invite.expires_at, i18n.language) })}
      leading={<Avatar avatar={invite.avatar} size={44} />}
      chevron={false}
      trailing={
        <View style={styles.inviteTrailing}>
          <Text
            variant="label"
            weight="bold"
            selectable
            style={{ fontFamily: theme.fonts.display, letterSpacing: 2 }}>
            {invite.code}
          </Text>
          <Button
            title={t('family.cancelInvite')}
            variant="ghost"
            size="sm"
            fullWidth={false}
            loading={remove.isPending}
            onPress={() => remove.mutate(invite.id)}
            accessibilityLabel={t('family.cancelInviteFor', { name: invite.nickname })}
          />
        </View>
      }
    />
  );
}

/** Family tab: members, and for admins pending invites + invite / edit actions. */
export function FamilyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const policy = usePolicy();
  const isAdmin = useIsAdmin();
  const family = useFamily();
  const invites = useInvites();
  const client = useQueryClient();

  if (family.isPending) return <Loading />;
  if (family.isError) {
    return (
      <Screen title={t('tabs.family')}>
        <ErrorState error={family.error} onRetry={() => void family.refetch()} />
      </Screen>
    );
  }

  const { family: info, members } = family.data;
  const pending = invites.data ?? [];
  const maxMembers = policy?.limits.max_members;
  const used = members.length + pending.length;
  const atLimit = maxMembers !== undefined && used >= maxMembers;

  return (
    <Screen
      title={info.name}
      subtitle={
        maxMembers !== undefined
          ? t('family.memberCountOf', { count: members.length, max: maxMembers })
          : t('family.memberCount', { count: members.length })
      }
      onRefresh={() => {
        void family.refetch();
        if (isAdmin) {
          void invites.refetch();
          void client.invalidateQueries({ queryKey: queryKeys.subscription });
        }
      }}
      refreshing={family.isRefetching}
      headerRight={
        <Badge
          label={tierLabel(t, info.tier)}
          tone={info.tier === 'free' ? 'neutral' : 'accent'}
          icon={info.tier === 'free' ? undefined : 'star'}
        />
      }>
      <Card padding="sm">
        <ListRow
          title={t('goals.title')}
          subtitle={isAdmin ? t('family.goalsHintAdmin') : t('family.goalsHint')}
          leading={<Icon name="flag" color={theme.colors.primary} />}
          onPress={() => router.push('/goals')}
        />
      </Card>
      <SectionHeader title={t('family.members')} />
      <Card padding="sm">
        {members.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <MemberRow
              member={m}
              isMe={m.id === me?.member?.id}
              onPress={
                isAdmin
                  ? () => router.push({ pathname: '/member/[id]', params: { id: String(m.id) } })
                  : undefined
              }
            />
          </View>
        ))}
      </Card>

      {isAdmin ? (
        <>
          <SectionHeader title={t('family.invites')} />
          {invites.isPending ? (
            <Loading fill={false} />
          ) : invites.isError ? (
            <ErrorState error={invites.error} onRetry={() => void invites.refetch()} />
          ) : pending.length === 0 ? (
            <Card>
              <EmptyState
                title={t('family.noInvites')}
                body={t('family.noInvitesBody')}
                emoji="💌"
                icon="mail-outline"
              />
            </Card>
          ) : (
            <Card padding="sm">
              {pending.map((inv, i) => (
                <View key={inv.id}>
                  {i > 0 ? <Divider /> : null}
                  <InviteRow invite={inv} />
                </View>
              ))}
            </Card>
          )}
          {atLimit ? (
            <Card variant="tinted" tint={theme.colors.warning}>
              <Text weight="bold">{t('family.limitTitle')}</Text>
              <Text variant="caption" tone="muted">
                {t('family.limitBody', { max: maxMembers })}
              </Text>
            </Card>
          ) : null}
          <Button
            title={t('family.inviteMember')}
            icon="person-add-outline"
            size="lg"
            onPress={() => router.push('/invite')}
          />
          <SubscriptionCard />
        </>
      ) : (
        <Text variant="caption" tone="muted" align="center">
          {t('family.adminOnlyHint')}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  inviteTrailing: { alignItems: 'flex-end', gap: 2 },
});
