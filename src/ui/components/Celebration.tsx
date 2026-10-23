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
import { SvgXml } from 'react-native-svg';

import { clanSvg } from '@/ui/avatars';
import { CLAN_SVGS } from '@/ui/avatars/clanSvgs.generated';
import { withAlpha } from '@/ui/components/Card';
import { Icon } from '@/ui/components/Icon';
import { useTheme } from '@/ui/ThemeProvider';

interface PieceSpec {
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  spin: number;
  drift: number;
  round: boolean;
}

function ConfettiPiece({ spec, height }: { spec: PieceSpec; height: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withDelay(
        spec.delay,
        withTiming(1, { duration: spec.duration, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [progress, spec]);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p < 0.85 ? 1 : (1 - p) / 0.15,
      transform: [
        { translateY: -40 + p * (height + 80) },
        { translateX: Math.sin(p * Math.PI * 3) * spec.drift },
        { rotate: `${p * spec.spin}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: spec.x,
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

/** Deterministic pseudo-random pieces so re-renders don't reshuffle. */
function makePieces(count: number, width: number, colors: readonly string[]): PieceSpec[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    delay: rand() * 500,
    duration: 1800 + rand() * 1400,
    size: 7 + rand() * 7,
    color: colors[Math.floor(rand() * colors.length)],
    spin: (rand() > 0.5 ? 1 : -1) * (360 + rand() * 540),
    drift: 10 + rand() * 30,
    round: rand() > 0.7,
  }));
}

/** Falling confetti overlay (absolute, ignores touches). Renders nothing with reduced motion. */
export function Confetti({ count = 46 }: { count?: number }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () => makePieces(count, width, theme.colors.confetti),
    [count, width, theme.colors.confetti],
  );

  if (theme.reducedMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} spec={p} height={height} />
      ))}
    </View>
  );
}

/**
 * The theme's success moment (completed session):
 * - playful: the member's Clan character (or Ollie) bouncing with a trophy + confetti
 * - sleek: pulsing gradient glow ring
 * - modern: springy check
 * - classic: calm check that fades in
 */
export function Celebration({
  size = 132,
  avatar,
}: {
  size?: number;
  /** The member's avatar key, shown in the playful theme (Ollie when missing/unknown). */
  avatar?: string | null;
}) {
  const theme = useTheme();
  const scale = useSharedValue(theme.reducedMotion ? 1 : 0.3);
  const pulse = useSharedValue(0);
  const opacity = useSharedValue(theme.reducedMotion ? 1 : 0);

  useEffect(() => {
    if (theme.reducedMotion) return;
    opacity.set(withTiming(1, { duration: theme.motion.duration }));
    if (theme.celebration === 'confetti') {
      scale.set(
        withSequence(
          withSpring(1.15, { damping: 5, stiffness: 180 }),
          withSpring(1, { damping: 8 }),
        ),
      );
    } else if (theme.celebration === 'calm') {
      scale.set(withTiming(1, { duration: 400 }));
    } else {
      scale.set(withSpring(1, theme.motion.spring));
    }
    if (theme.celebration === 'glow') {
      pulse.set(
        withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true),
      );
    }
  }, [theme, scale, pulse, opacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.get() * 0.12 }],
    opacity: 0.55 - pulse.get() * 0.25,
  }));

  const c = theme.colors;
  return (
    <View style={[styles.celebration, { width: size * 1.5, height: size * 1.5 }]}>
      {theme.celebration === 'glow' ? (
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
        {theme.celebration === 'confetti' ? (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: withAlpha(c.accent, 0.3),
              },
            ]}>
            <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
              <SvgXml xml={clanSvg(avatar) ?? CLAN_SVGS.owl} width={size} height={size} />
            </View>
            <View
              style={[
                styles.trophy,
                {
                  width: size * 0.4,
                  height: size * 0.4,
                  borderRadius: size * 0.2,
                  backgroundColor: c.surface,
                },
              ]}>
              <RNText style={{ fontSize: size * 0.24 }}>🏆</RNText>
            </View>
          </View>
        ) : theme.celebration === 'glow' ? (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: c.background,
                borderWidth: 2,
                borderColor: withAlpha(c.gradient[0], 0.6),
              },
            ]}>
            <Icon name="trophy" size={size * 0.45} color={c.text} />
          </View>
        ) : (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: c.successSoft,
                borderWidth: theme.celebration === 'calm' ? 3 : 0,
                borderColor: c.success,
              },
            ]}>
            <Icon name="checkmark" size={size * 0.55} color={c.success} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
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
