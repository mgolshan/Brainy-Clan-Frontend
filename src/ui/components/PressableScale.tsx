import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
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
/** Style keys that size/place the element in its parent; they belong on the outer Pressable. */
const OUTER_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'zIndex',
] as const;

function splitStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const inner: Record<string, unknown> = { ...StyleSheet.flatten(style) };
  const outer: Record<string, unknown> = {};
  for (const key of OUTER_KEYS) {
    if (key in inner) {
      outer[key] = inner[key];
      delete inner[key];
    }
  }
  // The inner view fills the outer one when the caller sized it with flex.
  if ('flex' in outer || 'flexGrow' in outer) inner.flexGrow = 1;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

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

  const { outer, inner } = splitStyle(style);

  return (
    <Pressable
      {...rest}
      style={outer}
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
      <Animated.View style={[inner, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
