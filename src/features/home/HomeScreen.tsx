import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { isApiError } from '@/api/client';
import type { LeaderboardEntry } from '@/api/types';
import { useIsAdmin, useMe } from '@/features/auth/hooks';
import { useLeaderboard } from '@/features/family/hooks';
import { GoalCard } from '@/features/goals/components/GoalCard';
import { pickMainGoal, useGoals } from '@/features/goals/hooks';
import { useMeStats } from '@/features/profile/hooks';
import { formatNumber } from '@/lib/format';
import {
  Appear,
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SectionHeader,
  Text,
  useTheme,
} from '@/ui';

const MEDALS = ['🥇', '🥈', '🥉'];

function greetingKey(): 'home.morning' | 'home.afternoon' | 'home.evening' {
  const hour = new Date().getHours();
  return hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening';
}

function LeaderRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  return (
    <View
      style={[styles.row, { minHeight: theme.touchTarget, gap: theme.spacing.sm }]}
      accessible
      accessibilityLabel={t('home.rankA11y', {
        rank: entry.rank,
        name: entry.nickname,
        count: entry.points,
      })}>
      <View style={styles.rank}>
        {entry.rank <= 3 ? (
          <RNText style={styles.medal}>{MEDALS[entry.rank - 1]}</RNText>
        ) : (
          <Text weight="bold" tone="muted">
            {entry.rank}
          </Text>
        )}
      </View>
      <Avatar avatar={entry.avatar} size={40} ring={isMe} />
      <Text weight={isMe ? 'bold' : 'medium'} style={styles.flex} numberOfLines={2}>
        {isMe ? t('family.you', { name: entry.nickname }) : entry.nickname}
      </Text>
      <Text weight="bold">
        {t('home.pts', {
          count: entry.points,
          formatted: formatNumber(entry.points, i18n.language),
        })}
      </Text>
    </View>
  );
}

/** Home tab: greeting, my points and streak, and this week's family leaderboard. */
export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const stats = useMeStats();
  const board = useLeaderboard('week');
  const goals = useGoals();
  const isAdmin = useIsAdmin();
  const mainGoal = pickMainGoal(goals.data);
  const name = me?.member?.nickname ?? me?.user.display_name ?? '';

  return (
    <Screen
      onRefresh={() => {
        void stats.refetch();
        void board.refetch();
        void goals.refetch();
      }}
      refreshing={stats.isRefetching || board.isRefetching}>
      <View style={[styles.row, { gap: theme.spacing.md }]}>
        <Avatar avatar={me?.member?.avatar ?? me?.user.avatar} size={60} ring />
        <View style={styles.flex}>
          <Text tone="muted">{t(greetingKey())}</Text>
          <Text variant="heading" numberOfLines={1}>
            {t('home.hi', { name })}
          </Text>
          {me?.family ? (
            <Text variant="caption" tone="subtle" numberOfLines={1}>
              {me.family.name}
            </Text>
          ) : null}
        </View>
      </View>

      {stats.isPending ? (
        <Loading fill={false} />
      ) : stats.isError ? (
        // 404 = endpoint not deployed yet on this backend: just leave the card out.
        isApiError(stats.error, 'not_found') ? null : (
          <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
        )
      ) : (
        <Appear>
          <Card variant="hero" padding="lg" style={{ gap: theme.spacing.sm }}>
            <Text variant="caption" tone="onPrimary" weight="bold">
              {t('home.thisWeek')}
            </Text>
            <Text variant="display" tone="onPrimary">
              {t('home.pts', {
                count: stats.data.points_week,
                formatted: formatNumber(stats.data.points_week, i18n.language),
              })}
            </Text>
            <View style={styles.statRow}>
              <View style={styles.flex}>
                <Text variant="caption" tone="onPrimary">
                  {t('home.today')}
                </Text>
                <Text variant="title" tone="onPrimary">
                  {formatNumber(stats.data.points_today, i18n.language)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="caption" tone="onPrimary">
                  {t('home.total')}
                </Text>
                <Text variant="title" tone="onPrimary">
                  {formatNumber(stats.data.points_total, i18n.language)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="caption" tone="onPrimary">
                  {t('home.streak')}
                </Text>
                <Text variant="title" tone="onPrimary">
                  {`🔥 ${stats.data.streak.current}`}
                </Text>
              </View>
            </View>
            {stats.data.streak.longest > 0 ? (
              <Text variant="caption" tone="onPrimary">
                {t('home.longestStreak', { count: stats.data.streak.longest })}
              </Text>
            ) : null}
          </Card>
        </Appear>
      )}

      {mainGoal ? (
        <>
          <SectionHeader
            title={t('home.familyGoal')}
            action={
              <Button
                title={t('home.allGoals')}
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => router.push('/goals')}
              />
            }
          />
          <GoalCard
            goal={mainGoal}
            meId={me?.member?.id}
            featured
            onPress={() =>
              router.push({ pathname: '/goals/[id]', params: { id: String(mainGoal.id) } })
            }
          />
        </>
      ) : goals.isSuccess && isAdmin ? (
        <Card variant="tinted" style={{ gap: theme.spacing.sm }}>
          <Text weight="bold">{t('home.noGoalTitle')}</Text>
          <Text variant="caption" tone="muted">
            {t('home.noGoalBody')}
          </Text>
          <Button
            title={t('goals.create')}
            icon="flag-outline"
            variant="outline"
            onPress={() => router.push('/goals/new')}
          />
        </Card>
      ) : null}

      <Button
        title={t('home.playNow')}
        icon="play"
        size="lg"
        onPress={() => router.navigate('/play')}
      />

      <SectionHeader
        title={t('home.leaderboard')}
        action={
          board.data ? (
            <Text variant="caption" tone="muted">
              {t('home.teamTotal', {
                count: board.data.team_total,
                formatted: formatNumber(board.data.team_total, i18n.language),
              })}
            </Text>
          ) : undefined
        }
      />
      {board.isPending ? (
        <Loading fill={false} />
      ) : board.isError ? (
        isApiError(board.error, 'not_found') ? (
          <Card>
            <EmptyState
              title={t('home.noScores')}
              body={t('home.noScoresBody')}
              emoji="🏁"
              icon="flag-outline"
            />
          </Card>
        ) : (
          <ErrorState error={board.error} onRetry={() => void board.refetch()} />
        )
      ) : board.data.entries.length === 0 ? (
        <Card>
          <EmptyState
            title={t('home.noScores')}
            body={t('home.noScoresBody')}
            emoji="🏁"
            icon="flag-outline"
          />
        </Card>
      ) : (
        <Card padding="sm">
          {board.data.entries.slice(0, 5).map((entry, i) => (
            <View key={entry.member_id}>
              {i > 0 ? <Divider /> : null}
              <LeaderRow entry={entry} isMe={entry.member_id === me?.member?.id} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  statRow: { flexDirection: 'row', gap: 12 },
  rank: { width: 32, alignItems: 'center' },
  medal: { fontSize: 24 },
});
