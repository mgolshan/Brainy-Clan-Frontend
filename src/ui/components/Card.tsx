import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/ui/components/PressableScale';
import { useTheme } from '@/ui/ThemeProvider';
import type { Theme } from '@/ui/themes';

export interface CardProps {
  children?: ReactNode;
  onPress?: () => void;
  /**
   * - `default`: the theme's surface
   * - `hero`: filled with the accent gradient (text should use tone="onPrimary")
   * - `tinted`: soft fill in `tint` (or primary)
   */
  variant?: 'default' | 'hero' | 'tinted';
  /** Accent color (category color, selection). */
  tint?: string;
  /** Highlight as selected (thicker accent border). */
  selected?: boolean;
  padding?: keyof Theme['spacing'] | 0;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

/** Hex "#RRGGBB" + alpha (0–1) → rgba() string. Non-hex colors are returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function surfaceStyle(theme: Theme, opts: { tint?: string; selected?: boolean } = {}) {
  const c = theme.colors;
  const accent = opts.tint ?? c.primary;
  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: theme.radius.lg,
  };
  switch (theme.surface) {
    case 'chunky':
      return {
        ...base,
        borderWidth: theme.borderWidth,
        borderBottomWidth: theme.borderWidth + 4,
        borderColor: opts.selected ? accent : opts.tint ? withAlpha(opts.tint, 0.55) : c.border,
      };
    case 'glass':
      return {
        ...base,
        backgroundColor: theme.scheme === 'dark' ? 'rgba(255,255,255,0.045)' : c.surface,
        borderWidth: 1,
        borderColor: opts.selected
          ? accent
          : theme.scheme === 'dark'
            ? 'rgba(255,255,255,0.09)'
            : c.border,
      };
    case 'soft':
      return {
        ...base,
        borderWidth: opts.selected ? 2 : StyleSheet.hairlineWidth,
        borderColor: opts.selected ? accent : c.border,
        shadowColor: c.shadow,
        shadowOpacity: theme.scheme === 'dark' ? 0.4 : 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      };
    case 'outlined':
      return {
        ...base,
        borderWidth: opts.selected ? 3 : theme.borderWidth,
        borderColor: opts.selected ? accent : c.borderStrong,
      };
  }
}

/** Themed container: candy (playful), glass (sleek), soft shadow (modern), outlined (classic). */
export function Card({
  children,
  onPress,
  variant = 'default',
  tint,
  selected,
  padding = 'md',
  style,
  accessibilityLabel,
  accessibilityHint,
  disabled,
}: CardProps) {
  const theme = useTheme();
  const pad = padding === 0 ? 0 : theme.spacing[padding];

  const container: StyleProp<ViewStyle> = [
    surfaceStyle(theme, { tint, selected }),
    variant === 'tinted' && {
      backgroundColor: withAlpha(
        tint ?? theme.colors.primary,
        theme.scheme === 'dark' ? 0.18 : 0.12,
      ),
    },
    variant === 'hero' && { borderWidth: 0, overflow: 'hidden' },
    { padding: pad },
    style,
  ];

  const content = (
    <>
      {variant === 'hero' ? (
        <LinearGradient
          colors={theme.colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {theme.surface === 'glass' && variant === 'default' && theme.scheme === 'dark' ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.lg }]}
        />
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        haptic
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ selected: !!selected, disabled: !!disabled }}
        style={container}>
        {content}
      </PressableScale>
    );
  }
  return (
    <View style={container} accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}
