import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import type { GoalProgress, GoalProgressEntry } from '@/api/types';
import { Avatar, Badge, Icon, ProgressBar, Text, useTheme, withAlpha } from '@/ui';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Cooperation: one big team bar toward the target. */
export function TeamProgress({ progress }: { progress: GoalProgress }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const ratio = progress.target_points ? progress.team_total / progress.target_points : 0;
  const left = Math.max(0, progress.target_points - progress.team_total);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={styles.between}>
        <Text variant="display">{progress.team_total}</Text>
        <Text tone="muted">{t('goals.ofTarget', { target: progress.target_points })}</Text>
      </View>
      <ProgressBar
        value={ratio}
        color={progress.reached ? theme.colors.success : undefined}
        accessibilityLabel={t('goals.teamA11y', {
          total: progress.team_total,
          target: progress.target_points,
        })}
      />
      <Text variant="label" tone={progress.reached ? 'success' : 'muted'} weight="bold">
        {progress.reached ? t('goals.teamReached') : t('goals.teamLeft', { count: left })}
      </Text>
      {progress.entries.length > 0 ? (
        <View style={styles.contributors}>
          {progress.entries.map((e) => (
            <View key={e.member_id} style={styles.contributor}>
              <Avatar avatar={e.avatar} size={36} />
              <Text variant="caption" tone="muted">
                {e.points}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RaceLane({ entry, isMe }: { entry: GoalProgressEntry; isMe: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const ratio = Math.max(0, Math.min(1, entry.target ? entry.points / entry.target : 0));
  const c = theme.colors;
  const name = isMe ? t('family.you', { name: entry.nickname }) : entry.nickname;
  const a11y = t('goals.raceA11y', {
    rank: entry.rank,
    name: entry.nickname,
    points: entry.points,
    target: entry.target,
  });

  if (theme.key === 'playful') {
    // A race track: the avatar rides along its lane toward the finish flag.
    const size = 40;
    return (
      <View accessible accessibilityLabel={a11y} style={{ gap: 4 }}>
        <View style={styles.between}>
          <Text weight="bold">
            {entry.rank <= 3 ? `${MEDALS[entry.rank - 1]} ` : `${entry.rank}. `}
            {name}
          </Text>
          <Text weight="bold">{`${entry.points}/${entry.target}`}</Text>
        </View>
        <View
          style={[
            styles.track,
            {
              height: size + 8,
              borderRadius: (size + 8) / 2,
              backgroundColor: withAlpha(
                c.categories[(entry.rank - 1) % c.categories.length],
                0.18,
              ),
              borderColor: withAlpha(c.categories[(entry.rank - 1) % c.categories.length], 0.5),
            },
          ]}>
          <View style={[styles.finish]}>
            <RNText style={styles.flag}>{entry.reached ? '🏆' : '🏁'}</RNText>
          </View>
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: `${ratio * 82}%`,
            }}>
            <Avatar avatar={entry.avatar} size={size} ring={isMe} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={[styles.row, { gap: theme.spacing.sm, minHeight: theme.touchTarget }]}>
      <View style={styles.rank}>
        {entry.rank === 1 ? (
          <Icon name="ribbon" color={theme.key === 'sleek' ? c.secondary : c.accent} size={24} />
        ) : (
          <Text weight="bold" tone="muted">
            {entry.rank}
          </Text>
        )}
      </View>
      <Avatar avatar={entry.avatar} size={40} ring={isMe} />
      <View style={[styles.flex, { gap: 4 }]}>
        <View style={styles.between}>
          <Text weight={isMe ? 'bold' : 'medium'} numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
          <Text variant="label" weight="bold">{`${entry.points} / ${entry.target}`}</Text>
        </View>
        <ProgressBar value={ratio} color={entry.reached ? c.success : undefined} />
      </View>
      {entry.reached ? <Badge label={t('goals.reached')} tone="success" icon="checkmark" /> : null}
    </View>
  );
}

/** Competition: members ranked, each with progress toward their own target. */
export function RaceProgress({ progress, meId }: { progress: GoalProgress; meId?: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (progress.entries.length === 0) {
    return <Text tone="muted">{t('goals.noPointsYet')}</Text>;
  }
  return (
    <View style={{ gap: theme.key === 'playful' ? theme.spacing.md : theme.spacing.xs }}>
      {progress.entries.map((e) => (
        <RaceLane key={e.member_id} entry={e} isMe={e.member_id === meId} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  rank: { width: 28, alignItems: 'center' },
  contributors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contributor: { alignItems: 'center', gap: 2 },
  track: { borderWidth: 2, justifyContent: 'center', overflow: 'hidden' },
  finish: { position: 'absolute', right: 8 },
  flag: { fontSize: 24 },
});
