import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { GoalHistoryEntry, GoalPlan } from '@/api/types';
import { useIsAdmin, useMe } from '@/features/auth/hooks';
import { RaceProgress, TeamProgress } from '@/features/goals/components/GoalProgressViews';
import { RewardBanner } from '@/features/goals/components/RewardBanner';
import { useDeleteGoal, useGoal, useGoalHistory, useUpdateGoal } from '@/features/goals/hooks';
import { formatTimeLeft, useNow } from '@/features/goals/time';
import { errorMessage } from '@/lib/errorMessage';
import { formatDate } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Celebration,
  Confetti,
  Divider,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SectionHeader,
  Text,
  useTheme,
} from '@/ui';

function HistoryRow({ entry, goal }: { entry: GoalHistoryEntry; goal: GoalPlan }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const winners = entry.entries.filter((e) => entry.winner_member_ids.includes(e.member_id));
  const range = `${formatDate(entry.starts_at, i18n.language)} – ${formatDate(entry.ends_at, i18n.language)}`;
  return (
    <View style={[styles.historyRow, { gap: theme.spacing.sm, minHeight: theme.touchTarget }]}>
      <View style={styles.flex}>
        <Text weight="bold">{range}</Text>
        <Text variant="caption" tone="muted">
          {goal.mode === 'cooperation'
            ? t('goals.teamProgress', { total: entry.team_total, target: entry.target_points })
            : winners.length > 0
              ? t('goals.winnerIs', { names: winners.map((w) => w.nickname).join(', ') })
              : t('goals.noWinner')}
        </Text>
      </View>
      <View style={styles.winners}>
        {winners.slice(0, 4).map((w) => (
          <Avatar key={w.member_id} avatar={w.avatar} size={30} />
        ))}
      </View>
      <Badge
        label={entry.reached ? t('goals.reached') : t('goals.missed')}
        tone={entry.reached ? 'success' : 'neutral'}
        icon={entry.reached ? 'trophy' : undefined}
      />
    </View>
  );
}

function History({ goal }: { goal: GoalPlan }) {
  const { t } = useTranslation();
  const history = useGoalHistory(goal.id);
  if (history.isPending) return <Loading fill={false} />;
  if (history.isError)
    return <ErrorState error={history.error} onRetry={() => void history.refetch()} />;
  const rows = history.data.pages.flatMap((p) => p.data);
  if (rows.length === 0) {
    return (
      <Card>
        <Text tone="muted">{t('goals.noHistory')}</Text>
      </Card>
    );
  }
  return (
    <>
      <Card padding="sm">
        {rows.map((row, i) => (
          <View key={row.period_id}>
            {i > 0 ? <Divider /> : null}
            <HistoryRow entry={row} goal={goal} />
          </View>
        ))}
      </Card>
      {history.hasNextPage ? (
        <Button
          title={t('goals.loadMore')}
          variant="ghost"
          loading={history.isFetchingNextPage}
          onPress={() => void history.fetchNextPage()}
        />
      ) : null}
    </>
  );
}

function AdminActions({ goal }: { goal: GoalPlan }) {
  const { t } = useTranslation();
  const update = useUpdateGoal(goal.id);
  const remove = useDeleteGoal(goal.id);
  const [confirm, setConfirm] = useState(false);
  const error = update.error ?? remove.error;
  return (
    <Card style={{ gap: 8 }}>
      <Button
        title={goal.is_active ? t('goals.pause') : t('goals.resume')}
        icon={goal.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
        variant="outline"
        loading={update.isPending}
        onPress={() => update.mutate({ is_active: !goal.is_active })}
      />
      <Button
        title={confirm ? t('goals.deleteConfirm') : t('goals.delete')}
        icon="trash-outline"
        variant={confirm ? 'danger' : 'ghost'}
        loading={remove.isPending}
        onPress={() => {
          if (!confirm) {
            setConfirm(true);
            return;
          }
          remove.mutate(undefined, { onSuccess: () => router.back() });
        }}
      />
      <Text variant="caption" tone="muted">
        {t('goals.deleteHint')}
      </Text>
      {error ? <Text tone="danger">{errorMessage(error, t)}</Text> : null}
    </Card>
  );
}

/** One goal: current period (team bar or race), countdown, reward, history. */
export function GoalDetailScreen({ id }: { id: number }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isAdmin = useIsAdmin();
  const me = useMe().data;
  const goal = useGoal(id);
  const now = useNow();

  if (goal.isPending) return <Loading />;
  if (goal.isError || !goal.data) {
    return (
      <Screen back>
        {goal.isError ? (
          <ErrorState error={goal.error} onRetry={() => void goal.refetch()} />
        ) : (
          <EmptyState title={t('errors.notFound')} emoji="🔍" icon="search-outline" />
        )}
      </Screen>
    );
  }

  const g = goal.data;
  const p = g.current_period;

  return (
    <Screen
      title={g.name}
      back
      onRefresh={() => void goal.refetch()}
      refreshing={goal.isRefetching}>
      <View style={styles.badges}>
        <Badge label={t(`goals.mode.${g.mode}`)} tone="primary" />
        <Badge label={t(`goals.period.${g.period_type}`)} />
        {!g.is_active ? <Badge label={t('goals.paused')} /> : null}
      </View>
      <Text tone="muted">
        {g.mode === 'cooperation'
          ? t('goals.modeHelp.cooperation')
          : t('goals.modeHelp.competition')}
      </Text>

      {p?.reached ? (
        <Card style={styles.center}>
          <Celebration size={96} />
          <Text variant="heading" align="center">
            {t('goals.reachedTitle')}
          </Text>
        </Card>
      ) : null}

      <RewardBanner reward={g.reward_text} reached={p?.reached} />

      {p ? (
        <Card padding="lg" style={{ gap: theme.spacing.md }}>
          <View style={styles.between}>
            <Text variant="title">{t('goals.thisPeriod')}</Text>
            <Badge label={formatTimeLeft(t, p.ends_at, now)} icon="time-outline" tone="accent" />
          </View>
          <Text variant="caption" tone="muted">
            {`${formatDate(p.starts_at, i18n.language)} – ${formatDate(p.ends_at, i18n.language)}`}
          </Text>
          {g.mode === 'cooperation' ? (
            <TeamProgress progress={p} />
          ) : (
            <RaceProgress progress={p} meId={me?.member?.id} />
          )}
        </Card>
      ) : (
        <Card>
          <Text tone="muted">
            {t('goals.startsOn', { date: formatDate(`${g.starts_on}T12:00:00`, i18n.language) })}
          </Text>
        </Card>
      )}

      <Card style={{ gap: 6 }}>
        <Text variant="label" tone="muted">
          {t('goals.scopes')}
        </Text>
        <View style={styles.badges}>
          {g.scopes.map((s) => (
            <Badge key={s.category_id} label={s.name} />
          ))}
        </View>
        <Text variant="label" tone="muted">
          {t('goals.membersLabel')}
        </Text>
        <View style={styles.badges}>
          {g.members.map((m) => (
            <View key={m.member_id} style={styles.memberChip}>
              <Avatar avatar={m.avatar} size={28} />
              <Text variant="caption">
                {g.mode === 'competition'
                  ? t('goals.memberTarget', {
                      name: m.nickname,
                      target: m.target_override ?? g.target_points,
                    })
                  : m.nickname}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title={t('goals.history')} />
      <History goal={g} />

      {isAdmin ? (
        <>
          <SectionHeader title={t('goals.manage')} />
          <AdminActions goal={g} />
        </>
      ) : null}

      {p?.reached && theme.celebration === 'confetti' ? <Confetti /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  center: { alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  winners: { flexDirection: 'row', gap: 2 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
