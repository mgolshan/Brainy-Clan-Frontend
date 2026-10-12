import { FlashList } from '@shopify/flash-list';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { GoalHistoryEntry, GoalPlan } from '@/api/types';
import { useIsAdmin, useMe } from '@/features/auth/hooks';
import { RaceProgress, TeamProgress } from '@/features/goals/components/GoalProgressViews';
import { RewardBanner } from '@/features/goals/components/RewardBanner';
import {
  isGoalGone,
  useDeleteGoal,
  useForgetGoal,
  useGoal,
  useGoalHistory,
  useUpdateGoal,
} from '@/features/goals/hooks';
import { dateInTimeZone, formatPeriodRange, formatTimeLeft, useNow } from '@/features/goals/time';
import { errorMessage } from '@/lib/errorMessage';
import { goBack } from '@/lib/navigation';
import { formatDate } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Celebration,
  Confetti,
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
  const range = formatPeriodRange(entry.starts_at, entry.ends_at, i18n.language);
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
      {/* Top-level `reached` is the cooperation result only (API.md); races show the winners. */}
      {goal.mode === 'cooperation' ? (
        <Badge
          label={entry.reached ? t('goals.reached') : t('goals.missed')}
          tone={entry.reached ? 'success' : 'neutral'}
          icon={entry.reached ? 'trophy' : undefined}
        />
      ) : null}
    </View>
  );
}

/** Space between history rows. */
function HistoryGap() {
  const theme = useTheme();
  return <View style={{ height: theme.spacing.xs }} />;
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
          remove.mutate(undefined, { onSuccess: () => goBack('/goals') });
        }}
      />
      <Text variant="caption" tone="muted">
        {t('goals.deleteHint')}
      </Text>
      {error ? <Text tone="danger">{errorMessage(error, t)}</Text> : null}
    </Card>
  );
}

/**
 * One goal: current period (team bar or race), countdown, reward, history. The history is
 * unbounded (one row per closed period), so the screen is a FlashList: everything above the
 * history is its header, admin actions its footer, and the next page loads near the end.
 */
export function GoalDetailScreen({ id }: { id: number }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isAdmin = useIsAdmin();
  const me = useMe().data;
  const goal = useGoal(id);
  const history = useGoalHistory(id);
  const now = useNow();
  const forget = useForgetGoal();
  const gone = goal.isError && isGoalGone(goal.error);

  // Deleted elsewhere (soft delete → 404): drop it from the cached list too.
  useEffect(() => {
    if (gone) forget(id);
  }, [gone, id, forget]);

  if (goal.isPending) return <Loading />;
  if (gone) {
    return (
      <Screen back>
        <EmptyState
          title={t('goals.gone.title')}
          body={t('goals.gone.body')}
          emoji="🗑️"
          icon="trash-outline"
          actionLabel={t('goals.gone.action')}
          onAction={() => goBack('/goals')}
        />
      </Screen>
    );
  }
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
  // Competition: celebrate the viewer's own target; the reward is decided when the period closes.
  const mine = p?.entries.find((e) => e.member_id === me?.member?.id);
  const reached = g.mode === 'cooperation' ? !!p?.reached : !!mine?.reached;
  const historyRows = history.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title={g.name}
      back
      onRefresh={() => {
        void goal.refetch();
        void history.refetch();
      }}
      refreshing={goal.isRefetching}
      list={({ header, contentContainerStyle, refreshControl }) => (
        <FlashList
          data={historyRows}
          keyExtractor={(row) => String(row.period_id)}
          renderItem={({ item }) => (
            <Card padding="sm">
              <HistoryRow entry={item} goal={g} />
            </Card>
          )}
          ItemSeparatorComponent={HistoryGap}
          ListHeaderComponent={header}
          ListFooterComponent={
            <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.md }}>
              {history.hasNextPage ? (
                <Button
                  title={t('goals.loadMore')}
                  variant="ghost"
                  loading={history.isFetchingNextPage}
                  onPress={() => void history.fetchNextPage()}
                />
              ) : null}
              {isAdmin ? (
                <>
                  <SectionHeader title={t('goals.manage')} />
                  <AdminActions goal={g} />
                </>
              ) : null}
            </View>
          }
          onEndReached={() => {
            if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={contentContainerStyle}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
        />
      )}>
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

      {reached ? (
        <Card style={styles.center}>
          <Celebration size={96} />
          <Text variant="heading" align="center">
            {t('goals.reachedTitle')}
          </Text>
        </Card>
      ) : null}

      <RewardBanner reward={g.reward_text} reached={g.mode === 'cooperation' && reached} />

      {p ? (
        <Card padding="lg" style={{ gap: theme.spacing.md }}>
          <View style={styles.between}>
            <Text variant="title">{t('goals.thisPeriod')}</Text>
            <Badge label={formatTimeLeft(t, p.ends_at, now)} icon="time-outline" tone="accent" />
          </View>
          <Text variant="caption" tone="muted">
            {formatPeriodRange(p.starts_at, p.ends_at, i18n.language)}
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
            {!g.is_active
              ? t('goals.pausedHint')
              : g.starts_on > dateInTimeZone(new Date(now), me?.family?.timezone)
                ? t('goals.startsOn', {
                    date: formatDate(`${g.starts_on}T12:00:00`, i18n.language),
                  })
                : t('goals.noOpenPeriod')}
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
      {history.isPending ? (
        <Loading fill={false} />
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      ) : historyRows.length === 0 ? (
        <Card>
          <Text tone="muted">{t('goals.noHistory')}</Text>
        </Card>
      ) : null}

      {reached && theme.celebration === 'confetti' ? <Confetti /> : null}
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
