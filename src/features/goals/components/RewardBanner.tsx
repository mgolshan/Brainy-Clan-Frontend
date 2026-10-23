import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon, Text, useTheme, withAlpha } from '@/ui';

interface RewardBannerProps {
  reward: string | null;
  reached?: boolean;
  compact?: boolean;
}

/**
 * The reward is the motivating hook. Playful: a wiggling gift on a sunny card. Sleek: a
 * gradient-edged pill. Modern/classic: a calm framed line with a trophy icon.
 */
export function RewardBanner({ reward, reached, compact }: RewardBannerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (theme.vibe !== 'kid' || theme.reducedMotion) return;
    wiggle.set(
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 120 }),
          withTiming(10, { duration: 120 }),
          withTiming(-6, { duration: 100 }),
          withTiming(0, { duration: 100 }),
          withTiming(0, { duration: 1800 }),
        ),
        -1,
      ),
    );
  }, [theme, wiggle]);
  const giftStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.get()}deg` }] }));

  if (!reward) return null;
  const label = reached ? t('goals.rewardEarned') : t('goals.rewardLabel');

  if (theme.vibe === 'kid') {
    return (
      <View
        accessible
        accessibilityLabel={`${label}: ${reward}`}
        style={[
          styles.row,
          {
            backgroundColor: withAlpha(c.accent, theme.scheme === 'dark' ? 0.25 : 0.35),
            borderColor: c.accent,
            borderWidth: 2,
            borderBottomWidth: 5,
            borderRadius: theme.radius.lg,
            padding: compact ? theme.spacing.sm : theme.spacing.md,
            gap: theme.spacing.sm,
          },
        ]}>
        <Animated.View style={giftStyle}>
          <RNText style={{ fontSize: compact ? 28 : 40 }}>{reached ? '🎉' : '🎁'}</RNText>
        </Animated.View>
        <View style={styles.flex}>
          <Text variant="caption" weight="bold" tone="muted">
            {label}
          </Text>
          <Text variant={compact ? 'bodyLarge' : 'title'} numberOfLines={2}>
            {reward}
          </Text>
        </View>
      </View>
    );
  }

  const inner = (
    <View
      style={[
        styles.row,
        { gap: theme.spacing.sm, padding: compact ? theme.spacing.sm : theme.spacing.md },
      ]}>
      <Icon
        name={reached ? 'trophy' : 'gift-outline'}
        color={theme.vibe === 'teen' ? c.secondary : c.accent}
        size={compact ? 22 : 28}
      />
      <View style={styles.flex}>
        <Text
          variant="caption"
          tone="muted"
          weight="bold"
          style={theme.overlineUppercase && styles.upper}>
          {label}
        </Text>
        <Text variant={compact ? 'body' : 'bodyLarge'} weight="bold" numberOfLines={2}>
          {reward}
        </Text>
      </View>
    </View>
  );

  if (theme.vibe === 'teen') {
    return (
      <View
        accessible
        accessibilityLabel={`${label}: ${reward}`}
        style={[styles.sleekWrap, { borderRadius: theme.radius.md }]}>
        <LinearGradient
          colors={c.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.md }]}
        />
        <View style={{ backgroundColor: c.surface, borderRadius: theme.radius.md - 1, margin: 1 }}>
          {inner}
        </View>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${reward}`}
      style={{
        borderRadius: theme.radius.md,
        borderWidth: theme.surface === 'outlined' ? 1.5 : 1,
        borderColor: theme.surface === 'outlined' ? c.accent : c.border,
        borderLeftWidth: 5,
        borderLeftColor: c.accent,
        backgroundColor: withAlpha(c.accent, 0.06),
      }}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  upper: { textTransform: 'uppercase', letterSpacing: 1.2 },
  sleekWrap: { overflow: 'hidden' },
});
