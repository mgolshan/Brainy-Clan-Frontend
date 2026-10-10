import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { useTheme } from '@/ui/ThemeProvider';

interface AppearProps {
  children: ReactNode;
  /** Stagger index: each step delays the entrance a little. */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Entrance animation in the theme's flavour: bouncy zoom (playful), rise (sleek/modern),
 * plain fade (classic), nothing with reduced motion.
 */
export function Appear({ children, index = 0, style }: AppearProps) {
  const theme = useTheme();
  const delay = Math.min(index, 8) * 60;
  const { enter, spring, duration } = theme.motion;

  const entering =
    enter === 'bounce'
      ? ZoomIn.delay(delay).springify().damping(spring.damping).stiffness(spring.stiffness)
      : enter === 'rise'
        ? FadeInDown.delay(delay).duration(duration + 60)
        : enter === 'fade'
          ? FadeIn.delay(delay).duration(duration)
          : undefined;

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
