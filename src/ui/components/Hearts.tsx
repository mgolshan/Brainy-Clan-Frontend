import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/ui/components/Icon';
import { useTheme } from '@/ui/ThemeProvider';

function Heart({ lost }: { lost: boolean }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const wasLost = useRef(lost);

  useEffect(() => {
    const justLost = lost && !wasLost.current;
    wasLost.current = lost;
    if (!justLost || theme.reducedMotion) return;
    scale.set(
      withSequence(
        withSpring(1.45, { damping: 4, stiffness: 300 }),
        withSpring(1, theme.motion.spring),
      ),
    );
    shake.set(
      withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [lost, scale, shake, theme]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { translateX: shake.get() }],
  }));

  const size = theme.key === 'playful' ? 30 : theme.key === 'classic' ? 30 : 24;
  return (
    <Animated.View style={style}>
      {theme.emojiIcons ? (
        <RNText style={{ fontSize: size, opacity: lost ? 0.25 : 1 }}>{lost ? '🖤' : '❤️'}</RNText>
      ) : (
        <Icon
          name={lost ? 'heart-outline' : 'heart'}
          size={size}
          color={lost ? theme.colors.textSubtle : theme.colors.heart}
        />
      )}
    </Animated.View>
  );
}

interface HeartsProps {
  /** Blunder cap: mistakes allowed. */
  total: number;
  /** Mistakes made. */
  lost: number;
}

/** Lives left in a session (blunder cap), animating the heart that was just lost. */
export function Hearts({ total, lost }: HeartsProps) {
  const { t } = useTranslation();
  const left = Math.max(0, total - lost);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('play.livesLeft', { count: left, total })}>
      {Array.from({ length: total }, (_, i) => (
        <Heart key={i} lost={i >= total - lost} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
});
