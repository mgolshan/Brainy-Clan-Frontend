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

import { withAlpha } from '@/ui/components/Card';
import { Icon, type IconName } from '@/ui/components/Icon';
import { Text } from '@/ui/components/Text';
import { useUiSound } from '@/ui/sound';
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
  /**
   * Tap sound (kid worlds only, when sound effects are on). Defaults to true for large/medium
   * primary buttons — the main action of a screen — and false for everything else.
   */
  tapSound?: boolean;
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
  const glow = theme.button === 'glow';
  switch (variant) {
    case 'primary':
      return {
        bg: c.primary,
        fg: c.onPrimary,
        edge: c.primaryPressed,
        border: c.primaryPressed,
        gradient: glow ? c.gradient : undefined,
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
      return {
        bg: glow ? withAlpha(c.surface, 0.6) : c.surface,
        fg: c.text,
        edge: c.borderStrong,
        border: glow ? withAlpha(c.secondary, 0.7) : c.borderStrong,
      };
    case 'ghost':
      return { bg: 'transparent', fg: c.primary, edge: 'transparent', border: 'transparent' };
  }
}

const EDGE = 5;
/** Ink buttons: hard offset (down-right) the face presses into. */
const INK = 4;

/**
 * The world's button.
 * - `press3d` (Candy, Jungle, Space): chunky candy button with a 3D bottom edge that squishes
 * - `glow` (Glass, Neon): gradient face with a colored glow; a glowing ring flares on press
 * - `flat` (Modern, Classic): solid, soft shadow / clear border, gentle or no press animation
 * - `ink` (Sticker Street): ink outline with a hard offset edge down-right; the face presses into it
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
  tapSound,
}: ButtonProps) {
  const theme = useTheme();
  const play = useUiSound();
  const colors = variantColors(theme, variant);
  const inactive = disabled || loading;
  const press3d = theme.button === 'press3d' && variant !== 'ghost';
  const glow = theme.button === 'glow' && variant !== 'ghost';
  const ink = theme.button === 'ink' && variant !== 'ghost';
  const filled = variant !== 'ghost' && variant !== 'outline';
  const withTap = tapSound ?? (variant === 'primary' && size !== 'sm');

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
    transform: [
      { translateX: ink ? press.get() * INK : 0 },
      { translateY: press3d ? press.get() * (EDGE - 1) : ink ? press.get() * INK : 0 },
      { scale: scale.get() },
    ],
    opacity: !usesScale && !press3d && !ink ? 1 - press.get() * 0.2 : 1,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: press.get() * 0.9,
    transform: [{ scale: 1 + press.get() * 0.03 }],
  }));

  const radius =
    theme.vibe === 'kid' || (size === 'sm' && theme.key !== 'classic')
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
            numberOfLines={2}
            align="center"
            style={[styles.label, theme.vibe === 'teen' ? styles.teenLabel : undefined]}>
            {title}
          </Text>
          {iconRight ? (
            <Icon name={iconRight} color={colors.fg} size={theme.type[textVariant].size + 4} />
          ) : null}
        </>
      )}
    </View>
  );

  // minHeight: a long title (French, large text, classic on a narrow phone) wraps to a second
  // line and the button grows, instead of being cut off.
  const faceBase: ViewStyle = {
    minHeight: height,
    paddingVertical: 4,
    borderRadius: radius,
    paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.gradient ? undefined : colors.bg,
    borderWidth: ink
      ? theme.borderWidth
      : variant === 'outline'
        ? theme.borderWidth
        : theme.surface === 'outlined' && variant !== 'ghost'
          ? 2
          : 0,
    borderColor: ink ? theme.colors.borderStrong : colors.border,
  };

  const shadow: ViewStyle | undefined =
    theme.surface === 'soft' && filled
      ? {
          shadowColor: colors.bg,
          shadowOpacity: 0.28,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }
      : glow && filled
        ? {
            shadowColor: variant === 'primary' ? theme.colors.glow : colors.bg,
            shadowOpacity: theme.scheme === 'dark' ? 0.6 : 0.35,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: theme.card === 'neon' ? 0 : 6 },
            elevation: 6,
          }
        : press3d && filled
          ? {
              shadowColor: theme.colors.shadow,
              shadowOpacity: theme.scheme === 'dark' ? 0.4 : 0.18,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
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
        if (withTap && theme.vibe === 'kid') play('tap');
        else if (Platform.OS !== 'web' && theme.key !== 'classic') void Haptics.selectionAsync();
        onPress?.();
      }}
      onPressIn={() => {
        if (press3d || ink) press.set(withTiming(1, { duration: 70 }));
        else if (glow && !theme.reducedMotion) press.set(withTiming(1, { duration: 90 }));
        else press.set(1);
        if (usesScale && !press3d)
          scale.set(withSpring(theme.motion.pressScale, theme.motion.spring));
      }}
      onPressOut={() => {
        if (press3d || glow || ink) press.set(withSpring(0, theme.motion.spring));
        else press.set(0);
        if (usesScale && !press3d) scale.set(withSpring(1, theme.motion.spring));
      }}
      style={[fullWidth ? styles.full : styles.inline, { opacity: disabled ? 0.45 : 1 }, style]}>
      <View
        style={[
          press3d && {
            backgroundColor: colors.edge,
            borderRadius: radius,
            paddingBottom: EDGE,
          },
          ink && {
            backgroundColor: theme.colors.borderStrong,
            borderRadius: radius,
            paddingBottom: INK,
            paddingRight: INK,
          },
          shadow,
          { borderRadius: radius },
        ]}>
        {press3d && (variant === 'success' || variant === 'danger') ? (
          // Edge = the button's own color, darkened (reads as the same candy, not a new color).
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: colors.bg }]}>
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: radius, backgroundColor: theme.colors.overlay },
              ]}
            />
          </View>
        ) : null}
        {glow ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { borderRadius: radius, borderColor: theme.colors.glow },
              ringStyle,
            ]}
          />
        ) : null}
        <Animated.View style={[faceBase, faceStyle]}>
          {colors.gradient ? (
            <LinearGradient
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {press3d && variant !== 'outline' ? (
            // Candy highlight along the top of the face.
            <View
              pointerEvents="none"
              style={[
                styles.shine,
                {
                  borderRadius: radius,
                  backgroundColor: withAlpha(
                    theme.scheme === 'dark' ? theme.colors.text : theme.colors.surface,
                    0.24,
                  ),
                },
              ]}
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
  // maxWidth + a shrinking label: a long title wraps inside the button instead of overflowing
  // both edges on a narrow phone.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  label: { flexShrink: 1 },
  shine: { position: 'absolute', height: '38%', top: 3, left: 10, right: 10 },
  teenLabel: { letterSpacing: 0.2 },
  ring: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderWidth: 2 },
});
