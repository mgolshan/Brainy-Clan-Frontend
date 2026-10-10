import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';

interface ProgressBarProps {
  /** 0–1. */
  value: number;
  /** Optional label shown above the bar (left) with `valueLabel` on the right. */
  label?: string;
  valueLabel?: string;
  /** Fill color; defaults to the theme gradient (playful/sleek) or primary. */
  color?: string;
  accessibilityLabel?: string;
}

/** Animated progress bar: chunky with a shine (playful), gradient glow (sleek), slim (modern/classic). */
export function ProgressBar({
  value,
  label,
  valueLabel,
  color,
  accessibilityLabel,
}: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const width = useSharedValue(0);
  const progress = useSharedValue(theme.reducedMotion ? clamped : 0);

  useEffect(() => {
    if (theme.reducedMotion) progress.set(clamped);
    else if (theme.motion.enter === 'bounce')
      progress.set(withSpring(clamped, theme.motion.spring));
    else progress.set(withTiming(clamped, { duration: theme.motion.duration + 200 }));
  }, [clamped, progress, theme]);

  const fill = useAnimatedStyle(() => ({
    width: Math.max(0, progress.get() * width.get()),
    opacity: progress.get() > 0.001 ? 1 : 0,
  }));

  const height =
    theme.surface === 'chunky'
      ? 18
      : theme.surface === 'outlined'
        ? 14
        : theme.surface === 'glass'
          ? 8
          : 10;
  const useGradient = !color && (theme.surface === 'chunky' || theme.surface === 'glass');

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      {label || valueLabel ? (
        <View style={styles.labels}>
          {label ? (
            <Text variant="label" tone="muted">
              {label}
            </Text>
          ) : (
            <View />
          )}
          {valueLabel ? (
            <Text variant="label" weight="bold">
              {valueLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        onLayout={(e: LayoutChangeEvent) => width.set(e.nativeEvent.layout.width)}
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: theme.surface === 'outlined' ? 1.5 : theme.surface === 'chunky' ? 2 : 0,
          borderColor:
            theme.surface === 'outlined' ? theme.colors.borderStrong : theme.colors.border,
          overflow: 'hidden',
        }}>
        <Animated.View
          style={[
            styles.fill,
            {
              borderRadius: height / 2,
              backgroundColor: useGradient ? undefined : (color ?? theme.colors.primary),
            },
            fill,
          ]}>
          {useGradient ? (
            <LinearGradient
              colors={theme.colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {theme.surface === 'chunky' ? (
            <View style={[styles.shine, { borderRadius: height / 2 }]} />
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, alignSelf: 'stretch' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  fill: { height: '100%', overflow: 'hidden' },
  shine: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
