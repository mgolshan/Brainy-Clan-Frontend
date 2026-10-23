import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { PressableScale } from '@/ui/components/PressableScale';
import { useTheme } from '@/ui/ThemeProvider';
import type { Theme } from '@/ui/themes';

export interface CardProps {
  children?: ReactNode;
  onPress?: () => void;
  /**
   * - `default`: the world's card (sticker, plank, porthole, glass, neon, flat)
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
  /** Hide the world's card ornaments (leaf, rivets), e.g. for tiny cards. */
  plain?: boolean;
}

/** Hex "#RRGGBB" + alpha (0–1) → rgba() string. Non-hex colors are returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Web only: real frosted glass (cheap there). Native uses pre-rendered translucent layers. */
const webFrost =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(18px) saturate(140%)' } as unknown as ViewStyle)
    : undefined;

/** The legacy per-surface look (`flat` cards and small controls). */
function flatSurface(theme: Theme, accent: string, tint?: string, selected?: boolean): ViewStyle {
  const c = theme.colors;
  const base: ViewStyle = { backgroundColor: c.surface, borderRadius: theme.radius.lg };
  switch (theme.surface) {
    case 'chunky':
      return {
        ...base,
        borderWidth: theme.borderWidth,
        borderBottomWidth: theme.borderWidth + 4,
        borderColor: selected ? accent : tint ? withAlpha(tint, 0.55) : c.border,
      };
    case 'glass':
      return {
        ...base,
        borderWidth: 1,
        borderColor: selected ? accent : c.border,
      };
    case 'soft':
      return {
        ...base,
        borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        borderColor: selected ? accent : c.border,
        shadowColor: c.shadow,
        shadowOpacity: theme.scheme === 'dark' ? 0.4 : 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      };
    case 'outlined':
      return {
        ...base,
        borderWidth: selected ? 3 : theme.borderWidth,
        borderColor: selected ? accent : c.borderStrong,
      };
  }
}

/** Container style of the world's card (`theme.card`). Also used by panels such as feedback. */
export function surfaceStyle(theme: Theme, opts: { tint?: string; selected?: boolean } = {}) {
  const c = theme.colors;
  const accent = opts.tint ?? c.primary;
  const dark = theme.scheme === 'dark';
  const ring = opts.selected ? accent : undefined;
  switch (theme.card) {
    case 'flat':
      return flatSurface(theme, accent, opts.tint, opts.selected);
    case 'glass':
      return {
        backgroundColor: withAlpha(c.surface, dark ? 0.72 : 0.7),
        borderRadius: theme.radius.lg,
        borderWidth: opts.selected ? 2 : 1,
        borderColor: ring ?? withAlpha(dark ? c.text : c.surface, dark ? 0.14 : 0.95),
        shadowColor: c.shadow,
        shadowOpacity: dark ? 0.5 : 0.1,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 0,
        ...webFrost,
      } satisfies ViewStyle;
    case 'sticker':
      return {
        backgroundColor: c.surface,
        borderRadius: theme.radius.xl,
        borderWidth: opts.selected ? 3 : 2.5,
        borderBottomWidth: 8,
        borderColor: ring ?? (opts.tint ? withAlpha(opts.tint, 0.6) : c.border),
        borderBottomColor: ring ?? (opts.tint ? withAlpha(opts.tint, 0.85) : c.borderStrong),
        shadowColor: c.shadow,
        shadowOpacity: dark ? 0.45 : 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      } satisfies ViewStyle;
    case 'chunky':
      return {
        backgroundColor: c.surface,
        borderRadius: theme.radius.lg,
        borderWidth: opts.selected ? 3 : 2,
        borderBottomWidth: 8,
        borderColor: ring ?? (opts.tint ? withAlpha(opts.tint, 0.7) : c.borderStrong),
        borderBottomColor: ring ?? c.shadow,
        shadowColor: c.shadow,
        shadowOpacity: dark ? 0.5 : 0.14,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      } satisfies ViewStyle;
    case 'porthole':
      return {
        backgroundColor: c.surface,
        borderRadius: theme.radius.xl,
        borderWidth: 3,
        borderColor: ring ?? (opts.tint ? withAlpha(opts.tint, 0.8) : c.borderStrong),
        shadowColor: c.glow,
        shadowOpacity: dark ? 0.35 : 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      } satisfies ViewStyle;
    case 'neon': {
      const line = ring ?? opts.tint ?? c.glow;
      return {
        backgroundColor: withAlpha(c.surface, dark ? 0.9 : 0.94),
        borderRadius: theme.radius.lg,
        borderWidth: opts.selected ? 2 : 1.5,
        borderColor: withAlpha(line, opts.selected ? 1 : dark ? 0.75 : 0.6),
        shadowColor: line,
        shadowOpacity: dark ? 0.55 : 0.28,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
      } satisfies ViewStyle;
    }
  }
}

/** Two small leaves on the top-right corner of jungle plank cards. */
function LeafCorner({ theme }: { theme: Theme }) {
  const a = theme.colors.sceneAccent;
  return (
    <View pointerEvents="none" style={styles.leafCorner}>
      <Svg width={38} height={30}>
        <G transform="translate(30 22) rotate(-60)">
          <Path d="M0 0 C 9 -5 9 -18 0 -24 C -9 -18 -9 -5 0 0 Z" fill={a[0]} />
        </G>
        <G transform="translate(30 22) rotate(-15)">
          <Path d="M0 0 C 7 -4 7 -14 0 -19 C -7 -14 -7 -4 0 0 Z" fill={a[2]} />
        </G>
      </Svg>
    </View>
  );
}

/** Inner rim + four rivets of space porthole cards. */
function PortholeRim({ theme }: { theme: Theme }) {
  const c = theme.colors;
  const rivet = { backgroundColor: c.borderStrong };
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.rim,
          {
            borderRadius: theme.radius.xl - 5,
            borderColor: withAlpha(c.glow, theme.scheme === 'dark' ? 0.35 : 0.3),
          },
        ]}
      />
      <View pointerEvents="none" style={[styles.rivet, rivet, { top: 9, left: 9 }]} />
      <View pointerEvents="none" style={[styles.rivet, rivet, { top: 9, right: 9 }]} />
      <View pointerEvents="none" style={[styles.rivet, rivet, { bottom: 9, left: 9 }]} />
      <View pointerEvents="none" style={[styles.rivet, rivet, { bottom: 9, right: 9 }]} />
    </>
  );
}

/** The world's card: sticker (Candy), plank (Jungle), porthole (Space), glass, neon, or flat. */
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
  plain,
}: CardProps) {
  const theme = useTheme();
  const c = theme.colors;
  const pad = padding === 0 ? 0 : theme.spacing[padding];
  const dark = theme.scheme === 'dark';

  const container: StyleProp<ViewStyle> = [
    surfaceStyle(theme, { tint, selected }),
    variant === 'tinted' && {
      backgroundColor: withAlpha(tint ?? c.primary, dark ? 0.18 : 0.12),
    },
    variant === 'hero' && { borderWidth: 0, borderBottomWidth: 0, overflow: 'hidden' },
    // The porthole rim needs a little more room inside.
    { padding: pad + (theme.card === 'porthole' && pad > 0 ? 4 : 0) },
    style,
  ];

  const ornaments = !plain && variant === 'default';
  const content = (
    <>
      {variant === 'hero' ? (
        <LinearGradient
          colors={c.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {theme.card === 'glass' && variant === 'default' ? (
        <LinearGradient
          pointerEvents="none"
          colors={[
            withAlpha(dark ? c.text : c.surface, dark ? 0.07 : 0.6),
            withAlpha(c.surface, 0),
          ]}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.lg }]}
        />
      ) : null}
      {theme.card === 'sticker' && variant === 'hero' ? (
        // Candy gloss along the top.
        <View
          pointerEvents="none"
          style={[
            styles.gloss,
            {
              backgroundColor: withAlpha(dark ? c.text : c.onPrimary, 0.22),
              borderRadius: theme.radius.pill,
            },
          ]}
        />
      ) : null}
      {ornaments && theme.card === 'porthole' ? <PortholeRim theme={theme} /> : null}
      {children}
      {ornaments && theme.card === 'chunky' ? <LeafCorner theme={theme} /> : null}
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

const styles = StyleSheet.create({
  leafCorner: { position: 'absolute', top: -12, right: -8 },
  rim: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1.5,
  },
  rivet: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  gloss: { position: 'absolute', top: 6, left: 18, width: '34%', height: 7 },
});
