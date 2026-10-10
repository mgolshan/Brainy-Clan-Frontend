import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon, type IconName } from '@/ui/components/Icon';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';
import type { Theme } from '@/ui/themes';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the container width (default true). */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface VariantColors {
  bg: string;
  fg: string;
  edge: string;
  border: string;
  gradient?: readonly [string, string, ...string[]];
}

function variantColors(theme: Theme, variant: ButtonVariant): VariantColors {
  const c = theme.colors;
  switch (variant) {
    case 'primary':
      return {
        bg: c.primary,
        fg: c.onPrimary,
        edge: c.primaryPressed,
        border: c.primaryPressed,
        gradient: theme.surface === 'glass' ? c.gradient : undefined,
      };
    case 'secondary':
      return {
        bg: c.secondary,
        fg: c.onSecondary,
        edge: c.secondaryPressed,
        border: c.secondaryPressed,
      };
    case 'danger':
      return { bg: c.danger, fg: c.onDanger, edge: c.shadow, border: c.danger };
    case 'success':
      return { bg: c.success, fg: c.onSuccess, edge: c.shadow, border: c.success };
    case 'outline':
      return { bg: c.surface, fg: c.text, edge: c.borderStrong, border: c.borderStrong };
    case 'ghost':
      return { bg: 'transparent', fg: c.primary, edge: 'transparent', border: 'transparent' };
  }
}

const EDGE = 5;

/**
 * Themed button.
 * - playful: chunky candy button with a 3D bottom edge that squishes on press
 * - sleek: violet→cyan gradient (primary), hairline borders, quick press
 * - modern: solid, soft shadow, gentle press
 * - classic: solid, clear border, large label, no scale animation
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth = true,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const colors = variantColors(theme, variant);
  const inactive = disabled || loading;
  const chunky = theme.surface === 'chunky' && variant !== 'ghost';

  const height =
    size === 'lg'
      ? theme.touchTarget + 8
      : size === 'sm'
        ? Math.max(38, Math.round(theme.touchTarget * 0.72))
        : theme.touchTarget;
  const textVariant = size === 'sm' ? 'label' : 'bodyLarge';

  const press = useSharedValue(0);
  const scale = useSharedValue(1);
  const usesScale = theme.motion.pressScale < 1;

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chunky ? press.get() * (EDGE - 1) : 0 }, { scale: scale.get() }],
    opacity: !usesScale && !chunky ? 1 - press.get() * 0.2 : 1,
  }));

  const radius =
    theme.key === 'playful' || (size === 'sm' && theme.key !== 'classic')
      ? theme.radius.pill
      : theme.radius.md;

  const label = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <>
          {icon ? (
            <Icon name={icon} color={colors.fg} size={theme.type[textVariant].size + 4} />
          ) : null}
          <Text
            variant={textVariant}
            weight="bold"
            color={colors.fg}
            numberOfLines={1}
            style={theme.key === 'sleek' ? styles.sleekLabel : undefined}>
            {title}
          </Text>
          {iconRight ? (
            <Icon name={iconRight} color={colors.fg} size={theme.type[textVariant].size + 4} />
          ) : null}
        </>
      )}
    </View>
  );

  const faceBase: ViewStyle = {
    height,
    borderRadius: radius,
    paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.gradient ? undefined : colors.bg,
    borderWidth:
      variant === 'outline'
        ? theme.borderWidth
        : theme.surface === 'outlined' && variant !== 'ghost'
          ? 2
          : 0,
    borderColor: colors.border,
  };

  const shadow: ViewStyle | undefined =
    theme.surface === 'soft' &&
    (variant === 'primary' || variant === 'danger' || variant === 'success')
      ? {
          shadowColor: colors.bg,
          shadowOpacity: 0.28,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }
      : theme.surface === 'glass' && variant === 'primary'
        ? {
            shadowColor: theme.colors.primary,
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }
        : undefined;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS !== 'web' && theme.key !== 'classic') void Haptics.selectionAsync();
        onPress?.();
      }}
      onPressIn={() => {
        if (chunky) press.set(withTiming(1, { duration: 70 }));
        else press.set(1);
        if (usesScale && !chunky)
          scale.set(withSpring(theme.motion.pressScale, theme.motion.spring));
      }}
      onPressOut={() => {
        if (chunky) press.set(withSpring(0, theme.motion.spring));
        else press.set(0);
        if (usesScale && !chunky) scale.set(withSpring(1, theme.motion.spring));
      }}
      style={[fullWidth ? styles.full : styles.inline, { opacity: disabled ? 0.45 : 1 }, style]}>
      <View
        style={[
          chunky && {
            backgroundColor: colors.edge,
            borderRadius: radius,
            paddingBottom: EDGE,
          },
          shadow,
          { borderRadius: radius },
        ]}>
        <Animated.View style={[faceBase, faceStyle]}>
          {colors.gradient ? (
            <LinearGradient
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {chunky && variant !== 'outline' ? (
            // Candy highlight along the top of the face.
            <View
              pointerEvents="none"
              style={[styles.shine, { borderRadius: radius, top: 3, left: 10, right: 10 }]}
            />
          ) : null}
          {label}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  inline: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shine: { position: 'absolute', height: '38%', backgroundColor: 'rgba(255,255,255,0.18)' },
  sleekLabel: { letterSpacing: 0.2 },
});
