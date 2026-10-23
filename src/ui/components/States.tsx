import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { ApiError } from '@/api/client';
import { errorMessage } from '@/lib/errorMessage';
import { CLAN_SVGS } from '@/ui/avatars/clanSvgs.generated';
import { Appear } from '@/ui/components/Appear';
import { Button } from '@/ui/components/Button';
import { Icon, type IconName } from '@/ui/components/Icon';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';

function BouncingDot({ index, color }: { index: number; color: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(
      withDelay(
        index * 120,
        withRepeat(
          withSequence(withSpring(-12, { damping: 6 }), withTiming(0, { duration: 260 })),
          -1,
        ),
      ),
    );
  }, [index, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** Loading indicator: bouncing candy dots in playful (unless reduced motion), spinner elsewhere. */
export function Loading({ label, fill = true }: { label?: string; fill?: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const dots = theme.vibe === 'kid' && !theme.reducedMotion;
  return (
    <View
      style={[styles.center, fill && styles.fill]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('common.loading')}>
      {dots ? (
        <View style={styles.dots}>
          {theme.colors.confetti.slice(0, 3).map((color, i) => (
            <BouncingDot key={i} index={i} color={color} />
          ))}
        </View>
      ) : (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      )}
      {label ? (
        <Text tone="muted" align="center">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  body?: string;
  /** Emoji shown in playful, icon elsewhere. */
  emoji?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  body,
  emoji = '✨',
  icon = 'sparkles-outline',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Appear style={[styles.center, styles.padded]}>
      <View
        style={[
          styles.illustration,
          {
            backgroundColor: theme.colors.primarySoft,
            borderRadius: theme.surface === 'outlined' ? theme.radius.lg : 999,
          },
        ]}>
        {theme.emojiIcons ? (
          <>
            {/* Ollie (the Clan's owl) holds the state's emoji in the playful theme. */}
            <View style={styles.clip}>
              <SvgXml xml={CLAN_SVGS.owl} width={84} height={84} />
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
              <RNText style={styles.badgeEmoji}>{emoji}</RNText>
            </View>
          </>
        ) : (
          <Icon name={icon} size={36} color={theme.colors.primary} />
        )}
      </View>
      <Text variant="title" align="center">
        {title}
      </Text>
      {body ? (
        <Text tone="muted" align="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} fullWidth={false} />
      ) : null}
    </Appear>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const offline = error instanceof ApiError && error.isNetworkError;
  return (
    <Appear style={[styles.center, styles.padded]}>
      <View
        style={[
          styles.illustration,
          {
            backgroundColor: theme.colors.dangerSoft,
            borderRadius: theme.surface === 'outlined' ? theme.radius.lg : 999,
          },
        ]}>
        {theme.emojiIcons ? (
          <RNText style={styles.emoji}>{offline ? '📡' : '🙈'}</RNText>
        ) : (
          <Icon
            name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
            size={36}
            color={theme.colors.danger}
          />
        )}
      </View>
      <Text variant="title" align="center">
        {title ?? (offline ? t('errors.offlineTitle') : t('errors.title'))}
      </Text>
      <Text tone="muted" align="center">
        {errorMessage(error, t)}
      </Text>
      {onRetry ? (
        <Button
          title={t('common.retry')}
          onPress={onRetry}
          variant="outline"
          icon="refresh"
          fullWidth={false}
        />
      ) : null}
    </Appear>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  padded: { paddingVertical: 32, paddingHorizontal: 16 },
  dots: { flexDirection: 'row', gap: 10, height: 40, alignItems: 'flex-end' },
  dot: { width: 16, height: 16, borderRadius: 8 },
  illustration: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 42 },
  badge: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 20 },
  clip: { width: 84, height: 84, borderRadius: 42, overflow: 'hidden' },
});
