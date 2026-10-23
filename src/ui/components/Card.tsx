import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

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
    case 'aqua':
      return {
        backgroundColor: c.surface,
        borderRadius: theme.radius.xl,
        borderWidth: opts.selected ? 3 : 2.5,
        borderBottomWidth: 6,
        borderColor: ring ?? withAlpha(opts.tint ?? c.glow, dark ? 0.55 : 0.6),
        borderBottomColor: ring ?? (opts.tint ? withAlpha(opts.tint, 0.85) : c.borderStrong),
        shadowColor: c.glow,
        shadowOpacity: dark ? 0.32 : 0.22,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      } satisfies ViewStyle;
    case 'stone':
      return {
        backgroundColor: c.surface,
        borderRadius: theme.radius.lg,
        borderWidth: opts.selected ? 3 : 2,
        borderBottomWidth: 8,
        borderColor: ring ?? (opts.tint ? withAlpha(opts.tint, 0.65) : c.border),
        borderBottomColor: ring ?? c.borderStrong,
        shadowColor: c.shadow,
        shadowOpacity: dark ? 0.5 : 0.14,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      } satisfies ViewStyle;
    case 'taped':
      // Ink outline + a hard offset edge (right and bottom) in the tint or ink: a die-cut sticker.
      return {
        backgroundColor: c.surface,
        borderRadius: theme.radius.md,
        borderWidth: opts.selected ? 3 : 2.5,
        borderRightWidth: 6,
        borderBottomWidth: 6,
        borderColor: ring ?? c.borderStrong,
        borderRightColor: ring ?? opts.tint ?? c.borderStrong,
        borderBottomColor: ring ?? opts.tint ?? c.borderStrong,
      } satisfies ViewStyle;
    case 'framed':
      return {
        backgroundColor: c.surface,
        borderRadius: theme.radius.md,
        borderWidth: opts.selected ? 2 : 1,
        borderColor: ring ?? withAlpha(opts.tint ?? c.glow, dark ? 0.55 : 0.65),
        shadowColor: c.shadow,
        shadowOpacity: dark ? 0.55 : 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      } satisfies ViewStyle;
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

/** Three bubbles drifting off the top-right corner of sea cards. */
function BubbleCorner({ theme }: { theme: Theme }) {
  const c = theme.colors;
  const line = withAlpha(c.glow, 0.9);
  const fill = withAlpha(c.glow, theme.scheme === 'dark' ? 0.18 : 0.14);
  const shine = withAlpha(c.surface, theme.scheme === 'dark' ? 0.4 : 1);
  return (
    <View pointerEvents="none" style={styles.bubbleCorner}>
      <Svg width={34} height={34}>
        <Circle cx={10} cy={24} r={7} fill={fill} stroke={line} strokeWidth={1.6} />
        <Circle cx={7.5} cy={21.5} r={1.8} fill={shine} />
        <Circle cx={23} cy={13} r={5} fill={fill} stroke={line} strokeWidth={1.4} />
        <Circle cx={29} cy={4} r={3} fill={fill} stroke={line} strokeWidth={1.2} />
      </Svg>
    </View>
  );
}

function leaflet(l: number): string {
  return `M0 0 C 2.4 -2 2.4 ${1 - l} 0 ${-l} C -2.4 ${1 - l} -2.4 -2 0 0 Z`;
}

/** A small fern frond over the top-left corner of dino stone cards. */
function FernCorner({ theme }: { theme: Theme }) {
  const a = theme.colors.sceneAccent;
  const leaflets = [];
  for (let i = 1; i <= 5; i++) {
    const y = -i * 5;
    const l = 10 - i;
    leaflets.push(
      <G key={`a${i}`} transform={`translate(0 ${y}) rotate(-58)`}>
        <Path d={leaflet(l)} fill={a[0]} />
      </G>,
      <G key={`b${i}`} transform={`translate(0 ${y}) rotate(58)`}>
        <Path d={leaflet(l)} fill={a[1]} />
      </G>,
    );
  }
  return (
    <View pointerEvents="none" style={styles.fernCorner}>
      <Svg width={40} height={40}>
        <G transform="translate(14 38) rotate(-38)">
          <Path d="M0 0 L0 -30" stroke={a[1]} strokeWidth={2} strokeLinecap="round" />
          {leaflets}
        </G>
      </Svg>
    </View>
  );
}

/** A strip of tape on the top-left corner and a marker doodle star on the top-right. */
function TapeAndDoodle({ theme }: { theme: Theme }) {
  const c = theme.colors;
  const dark = theme.scheme === 'dark';
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.tape,
          { backgroundColor: withAlpha(dark ? c.textSubtle : c.accent, dark ? 0.45 : 0.6) },
        ]}
      />
      <View pointerEvents="none" style={styles.doodle}>
        <Svg width={30} height={30}>
          <Path
            d="M15 3 L18 11.5 L27 12 L20 17.5 L22.5 26 L15 21 L7.5 26 L10 17.5 L3 12 L12 11.5 Z"
            fill={c.surface}
            stroke={c.primary}
            strokeWidth={2.2}
            strokeLinejoin="round"
            transform="rotate(12 15 15)"
          />
        </Svg>
      </View>
    </>
  );
}

/** Fine inner rule and a small diamond on the top edge of midnight cards. */
function FrameRule({ theme }: { theme: Theme }) {
  const c = theme.colors;
  const line = withAlpha(c.glow, theme.scheme === 'dark' ? 0.32 : 0.4);
  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.rule, { borderRadius: Math.max(2, theme.radius.md - 4), borderColor: line }]}
      />
      <View pointerEvents="none" style={styles.diamondWrap}>
        <View
          style={[
            styles.diamond,
            { backgroundColor: c.surface, borderColor: withAlpha(c.glow, 0.85) },
          ]}
        />
      </View>
    </>
  );
}

/**
 * The world's card: sticker (Candy), plank (Jungle), porthole (Space), aqua (Sea), stone (Dino),
 * taped (Sticker Street), framed (Midnight), glass (Glass, Lo-fi), neon, or flat.
 */
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
    variant === 'hero' && {
      borderWidth: 0,
      borderBottomWidth: 0,
      borderRightWidth: 0,
      overflow: 'hidden',
    },
    // The porthole rim and the midnight frame need a little more room inside.
    {
      padding: pad + ((theme.card === 'porthole' || theme.card === 'framed') && pad > 0 ? 4 : 0),
    },
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
      {ornaments && theme.card === 'framed' ? <FrameRule theme={theme} /> : null}
      {children}
      {ornaments && theme.card === 'chunky' ? <LeafCorner theme={theme} /> : null}
      {ornaments && theme.card === 'aqua' ? <BubbleCorner theme={theme} /> : null}
      {ornaments && theme.card === 'stone' ? <FernCorner theme={theme} /> : null}
      {ornaments && theme.card === 'taped' ? <TapeAndDoodle theme={theme} /> : null}
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
  bubbleCorner: { position: 'absolute', top: -14, right: -4 },
  fernCorner: { position: 'absolute', top: -18, left: 2 },
  tape: {
    position: 'absolute',
    top: -6,
    left: -12,
    width: 54,
    height: 18,
    transform: [{ rotate: '-28deg' }],
  },
  doodle: { position: 'absolute', top: -14, right: -12 },
  rule: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 0.75 },
  diamondWrap: { position: 'absolute', top: -5, left: 0, right: 0, alignItems: 'center' },
  diamond: { width: 9, height: 9, borderWidth: 1, transform: [{ rotate: '45deg' }] },
});
