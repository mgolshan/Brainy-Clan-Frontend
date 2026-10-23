import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { GoalPlan } from '@/api/types';
import { RewardBanner } from '@/features/goals/components/RewardBanner';
import { formatTimeLeft, useNow } from '@/features/goals/time';
import { Avatar, Badge, Card, Icon, ProgressBar, Text, useTheme } from '@/ui';

interface GoalCardProps {
  goal: GoalPlan;
  meId?: number;
  onPress?: () => void;
  /** Bigger version for Home. */
  featured?: boolean;
}

/** Summary of a goal plan: name, mode/period, current progress, reward, time left. */
export function GoalCard({ goal, meId, onPress, featured }: GoalCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const now = useNow();
  const p = goal.current_period;
  const mine = p?.entries.find((e) => e.member_id === meId);
  const leader = p?.entries[0];

  // Cooperation: the team reached the target. Competition: the bar shows the viewer's own target
  // (or the leader's), and the reward goes to the top scorer when the period closes, so "reached"
  // here is about the entry shown, never a reward already won.
  const shown = goal.mode === 'competition' ? (mine ?? leader) : undefined;
  const reached = goal.mode === 'cooperation' ? !!p?.reached : !!shown?.reached;

  let value = 0;
  let caption = goal.is_active ? t('goals.noOpenPeriod') : t('goals.pausedHint');
  if (p) {
    if (goal.mode === 'cooperation') {
      value = p.target_points ? p.team_total / p.target_points : 0;
      caption = t('goals.teamProgress', { count: p.team_total, target: p.target_points });
    } else if (mine) {
      value = mine.target ? mine.points / mine.target : 0;
      caption = t('goals.myProgress', {
        count: mine.points,
        target: mine.target,
        rank: mine.rank,
      });
    } else if (leader) {
      value = leader.target ? leader.points / leader.target : 0;
      caption = t('goals.leaderProgress', { name: leader.nickname, count: leader.points });
    }
  }

  return (
    <Card
      onPress={onPress}
      padding={featured ? 'lg' : 'md'}
      style={{ gap: theme.spacing.sm, opacity: goal.is_active ? 1 : 0.7 }}
      accessibilityLabel={goal.name}>
      <View style={styles.header}>
        <Icon
          name={goal.mode === 'cooperation' ? 'people' : 'podium'}
          color={theme.vibe === 'teen' ? theme.colors.secondary : theme.colors.primary}
        />
        <Text variant={featured ? 'heading' : 'title'} style={styles.flex} numberOfLines={2}>
          {goal.name}
        </Text>
        {reached ? <Badge label={t('goals.reached')} tone="success" icon="checkmark" /> : null}
        {!goal.is_active ? <Badge label={t('goals.paused')} /> : null}
      </View>
      <View style={styles.badges}>
        <Badge label={t(`goals.mode.${goal.mode}`)} tone="primary" />
        <Badge label={t(`goals.period.${goal.period_type}`)} />
        {p ? (
          <Badge label={formatTimeLeft(t, p.ends_at, now)} icon="time-outline" tone="accent" />
        ) : null}
      </View>
      {p ? (
        <>
          <ProgressBar
            value={value}
            color={reached ? theme.colors.success : undefined}
            label={caption}
          />
          {goal.mode === 'competition' && p.entries.length > 0 ? (
            <View style={styles.avatars}>
              {p.entries.slice(0, 5).map((e) => (
                <Avatar key={e.member_id} avatar={e.avatar} size={28} ring={e.member_id === meId} />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Text variant="caption" tone="muted">
          {caption}
        </Text>
      )}
      <RewardBanner
        reward={goal.reward_text}
        reached={goal.mode === 'cooperation' && p?.reached}
        compact={!featured}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avatars: { flexDirection: 'row', gap: 4 },
});
