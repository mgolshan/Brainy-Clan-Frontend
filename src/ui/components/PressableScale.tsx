import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/ui/ThemeProvider';

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Light haptic tick on press (native only). */
  haptic?: boolean;
}

/**
 * Pressable that springs down to the theme's `pressScale` (bouncy in playful, subtle in
 * sleek/modern, none in classic or with reduced motion — opacity feedback instead).
 */
export function PressableScale({
  style,
  children,
  haptic,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const usesScale = theme.motion.pressScale < 1;

  // Only animate what this theme uses, so a caller's own `opacity` style keeps working.
  const animated = useAnimatedStyle(() =>
    usesScale ? { transform: [{ scale: scale.get() }] } : { opacity: pressed.get() ? 0.75 : 1 },
  );

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (usesScale) scale.set(withSpring(theme.motion.pressScale, theme.motion.spring));
        pressed.set(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (usesScale) scale.set(withSpring(1, theme.motion.spring));
        pressed.set(0);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.(e);
      }}>
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
