import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text as RNText, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from '@/ui/components/Card';
import { ClanReaction } from '@/ui/components/ClanReaction';
import { Icon } from '@/ui/components/Icon';
import { useTheme } from '@/ui/ThemeProvider';
import type { CelebrationStyle, Theme } from '@/ui/themes';

type Kind = Exclude<CelebrationStyle, 'calm'>;

interface PieceSpec {
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  spin: number;
  drift: number;
  round: boolean;
  /** stars: flight angle (radians). */
  angle: number;
}

/** Deterministic pseudo-random pieces so re-renders don't reshuffle. */
function makePieces(count: number, width: number, colors: readonly string[]): PieceSpec[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: rand() * width,
    delay: rand() * 500,
    duration: 1800 + rand() * 1400,
    size: 7 + rand() * 7,
    color: colors[Math.floor(rand() * colors.length)],
    spin: (rand() > 0.5 ? 1 : -1) * (360 + rand() * 540),
    drift: 10 + rand() * 30,
    round: rand() > 0.7,
    angle: (i / count) * Math.PI * 2 + rand() * 0.4,
  }));
}

function Piece({
  spec,
  kind,
  width,
  height,
  theme,
}: {
  spec: PieceSpec;
  kind: Kind;
  width: number;
  height: number;
  theme: Theme;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    const duration = kind === 'stars' ? spec.duration * 0.7 : spec.duration;
    progress.set(
      withDelay(
        kind === 'stars' ? spec.delay * 0.4 : spec.delay,
        withTiming(1, {
          duration,
          easing: kind === 'bubbles' ? Easing.inOut(Easing.sin) : Easing.out(Easing.quad),
        }),
      ),
    );
  }, [progress, spec, kind]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    if (kind === 'stars') {
      // Burst out of the center (where the character is), then fade.
      const dist = p * Math.max(width, height) * 0.55;
      return {
        opacity: p < 0.7 ? 1 : (1 - p) / 0.3,
        transform: [
          { translateX: width / 2 + Math.cos(spec.angle) * dist },
          { translateY: height * 0.32 + Math.sin(spec.angle) * dist },
          { rotate: `${p * spec.spin * 0.5}deg` },
          { scale: 0.6 + p * 0.8 },
        ],
      };
    }
    if (kind === 'bubbles') {
      return {
        opacity: p < 0.8 ? 0.9 : ((1 - p) / 0.2) * 0.9,
        transform: [
          { translateX: spec.x + Math.sin(p * Math.PI * 4) * spec.drift * 0.6 },
          { translateY: height + 40 - p * (height + 120) },
          { scale: 0.8 + p * 0.5 },
        ],
      };
    }
    return {
      opacity: p < 0.85 ? 1 : (1 - p) / 0.15,
      transform: [
        { translateX: spec.x + Math.sin(p * Math.PI * 3) * spec.drift },
        { translateY: -40 + p * (height + 80) },
        { rotate: `${p * spec.spin}deg` },
      ],
    };
  });

  const c = theme.colors;
  if (kind === 'stars') {
    return (
      <Animated.View style={[styles.piece, style]}>
        <Icon name={spec.round ? 'sparkles' : 'star'} size={spec.size + 8} color={spec.color} />
      </Animated.View>
    );
  }
  if (kind === 'bubbles') {
    const d = spec.size * 2.6;
    return (
      <Animated.View
        style={[
          styles.piece,
          {
            width: d,
            height: d,
            borderRadius: d / 2,
            borderWidth: 1.5,
            borderColor: withAlpha(spec.color, 0.8),
            backgroundColor: withAlpha(spec.color, 0.16),
          },
          style,
        ]}>
        <View
          style={[
            styles.bubbleShine,
            { backgroundColor: withAlpha(c.surface, theme.scheme === 'dark' ? 0.35 : 0.8) },
          ]}
        />
      </Animated.View>
    );
  }
  const sprinkle = kind === 'sprinkles';
  return (
    <Animated.View
      style={[
        styles.piece,
        sprinkle
          ? { width: 5, height: spec.size + 6, borderRadius: 3, backgroundColor: spec.color }
          : {
              width: spec.size,
              height: spec.round ? spec.size : spec.size * 1.6,
              borderRadius: spec.round ? spec.size / 2 : 2,
              backgroundColor: spec.color,
            },
        style,
      ]}
    />
  );
}

/**
 * The world's success effect overlay (absolute, ignores touches): confetti (jungle), sprinkles
 * (candy), a star burst (space, neon) or rising bubbles (glass). Nothing for calm worlds or with
 * reduced motion. Render it once per success (remount with a new `key` to replay).
 */
export function Confetti({ count }: { count?: number }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const kind = theme.celebration;
  const n =
    count ?? (kind === 'sprinkles' ? 60 : kind === 'stars' ? 30 : kind === 'bubbles' ? 18 : 46);
  const pieces = useMemo(
    () => makePieces(n, width, theme.colors.confetti),
    [n, width, theme.colors.confetti],
  );

  if (theme.reducedMotion || kind === 'calm') return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Piece key={i} spec={p} kind={kind} width={width} height={height} theme={theme} />
      ))}
    </View>
  );
}

/**
 * The success moment (completed session, goal reached):
 * - kid worlds: the member's Clan character cheering in a candy / leafy / starry badge + trophy
 * - teen worlds: the character cheering inside a pulsing gradient ring
 * - calm worlds (modern, classic): a check mark that springs (modern) or fades in (classic)
 */
export function Celebration({
  size = 132,
  avatar,
}: {
  size?: number;
  /** The member's avatar key (Ollie when missing/unknown). */
  avatar?: string | null;
}) {
  const theme = useTheme();
  const scale = useSharedValue(theme.reducedMotion ? 1 : 0.3);
  const pulse = useSharedValue(0);
  const opacity = useSharedValue(theme.reducedMotion ? 1 : 0);
  const calm = theme.celebration === 'calm';
  const ring = theme.vibe === 'teen';

  useEffect(() => {
    if (theme.reducedMotion) return;
    opacity.set(withTiming(1, { duration: theme.motion.duration }));
    if (calm && theme.motion.enter === 'fade') {
      scale.set(withTiming(1, { duration: 400 }));
    } else if (theme.vibe === 'kid') {
      scale.set(
        withSequence(
          withSpring(1.12, { damping: 5, stiffness: 180 }),
          withSpring(1, { damping: 8 }),
        ),
      );
    } else {
      scale.set(withSpring(1, theme.motion.spring));
    }
    if (ring) {
      pulse.set(
        withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true),
      );
    }
  }, [theme, calm, ring, scale, pulse, opacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.get() * 0.12 }],
    opacity: 0.55 - pulse.get() * 0.25,
  }));

  const c = theme.colors;
  const trophy = (
    <View
      style={[
        styles.trophy,
        {
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: size * 0.19,
          backgroundColor: c.surface,
          borderWidth: 2,
          borderColor: theme.vibe === 'kid' ? c.accent : withAlpha(c.glow, 0.7),
        },
      ]}>
      {theme.emojiIcons ? (
        <RNText style={{ fontSize: size * 0.2 }}>🏆</RNText>
      ) : (
        <Icon name="trophy" size={size * 0.2} color={c.text} />
      )}
    </View>
  );

  return (
    <View style={[styles.celebration, { width: size * 1.5, height: size * 1.5 }]}>
      {ring ? (
        <Animated.View
          style={[
            styles.glowRing,
            { width: size * 1.4, height: size * 1.4, borderRadius: size },
            glowStyle,
          ]}>
          <LinearGradient
            colors={c.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: size }]}
          />
        </Animated.View>
      ) : null}
      <Animated.View style={iconStyle}>
        {calm ? (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: c.successSoft,
                borderWidth: theme.motion.enter === 'fade' ? 3 : 0,
                borderColor: c.success,
              },
            ]}>
            <Icon name="checkmark" size={size * 0.55} color={c.success} />
          </View>
        ) : (
          <View
            style={[
              styles.circle,
              {
                width: size * 1.1,
                height: size * 1.1,
                borderRadius: size * 0.55,
                backgroundColor: ring ? c.background : withAlpha(c.accent, 0.28),
                borderWidth: ring ? 2 : 4,
                borderColor: ring ? withAlpha(c.gradient[0], 0.6) : c.surface,
              },
            ]}>
            <ClanReaction avatar={avatar} kind="cheer" size={size * 0.8} />
            {trophy}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0 },
  bubbleShine: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    width: '26%',
    height: '26%',
    borderRadius: 99,
  },
  celebration: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  glowRing: { position: 'absolute', overflow: 'hidden' },
  circle: { alignItems: 'center', justifyContent: 'center' },
  trophy: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
