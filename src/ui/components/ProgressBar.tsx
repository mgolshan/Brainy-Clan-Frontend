import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { withAlpha } from '@/ui/components/Card';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';
import type { Theme } from '@/ui/themes';

interface ProgressBarProps {
  /** 0–1. */
  value: number;
  /** Optional label shown above the bar (left) with `valueLabel` on the right. */
  label?: string;
  valueLabel?: string;
  /** Fill color; defaults to the world's fill (gradient, vine green, rocket trail…). */
  color?: string;
  accessibilityLabel?: string;
}

interface TrackProps {
  theme: Theme;
  width: number;
  progress: SharedValue<number>;
  color?: string;
}

function useFillWidth(progress: SharedValue<number>, width: number, inset = 0) {
  return useAnimatedStyle(() => ({
    width: Math.max(0, progress.get() * (width - inset)) + (progress.get() > 0.001 ? inset : 0),
  }));
}

/** Classic bar: chunky with a shine (candy), gradient (glass), slim (modern/classic). */
function BarTrack({ theme, width, progress, color }: TrackProps) {
  const fill = useFillWidth(progress, width);
  const chunky = theme.surface === 'chunky';
  const height = chunky
    ? 18
    : theme.surface === 'outlined'
      ? 14
      : theme.surface === 'glass'
        ? 8
        : 10;
  const useGradient = !color && (chunky || theme.surface === 'glass');
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: theme.surface === 'outlined' ? 1.5 : chunky ? 2 : 0,
        borderColor: theme.surface === 'outlined' ? theme.colors.borderStrong : theme.colors.border,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          styles.fill,
          {
            borderRadius: height / 2,
            backgroundColor: useGradient ? undefined : (color ?? theme.colors.primary),
          },
          fill,
        ]}>
        {useGradient ? (
          <LinearGradient
            colors={theme.colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {chunky ? (
          <View
            style={[
              styles.shine,
              {
                borderRadius: height / 2,
                backgroundColor: withAlpha(
                  theme.scheme === 'dark' ? theme.colors.text : theme.colors.surface,
                  0.45,
                ),
              },
            ]}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const VINE_H = 30;

/** Jungle: a vine that grows along a wooden rail, sprouting leaves, with a flower at the tip. */
function VineTrack({ theme, width, progress, color }: TrackProps) {
  const c = theme.colors;
  const fill = useFillWidth(progress, width);
  const tip = useAnimatedStyle(() => ({
    opacity: progress.get() > 0.001 ? 1 : 0,
    transform: [{ translateX: Math.max(0, progress.get() * width - 11) }],
  }));
  const stem = color ?? c.primary;
  const mid = VINE_H / 2;
  const leaves = [];
  for (let x = 16, i = 0; x < width - 8; x += 24, i++) {
    const up = i % 2 === 0;
    leaves.push(
      <G key={x} transform={`translate(${x} ${mid}) rotate(${up ? -55 : -125})`}>
        <Path
          d="M0 0 C 5 -3 5 -10 0 -13 C -5 -10 -5 -3 0 0 Z"
          fill={up ? c.sceneAccent[2] : c.sceneAccent[0]}
        />
      </G>,
    );
  }
  return (
    <View style={{ height: VINE_H }}>
      <View
        style={[styles.rail, { top: mid - 3, backgroundColor: withAlpha(c.borderStrong, 0.35) }]}
      />
      <Animated.View style={[styles.reveal, fill]}>
        {width > 0 ? (
          <Svg width={width} height={VINE_H}>
            <Path
              d={`M0 ${mid} ${Array.from(
                { length: Math.ceil(width / 24) + 1 },
                (_, i) =>
                  `Q ${i * 24 + 6} ${mid + (i % 2 ? 4 : -4)} ${i * 24 + 12} ${mid} T ${i * 24 + 24} ${mid}`,
              ).join(' ')}`}
              stroke={stem}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
            {leaves}
          </Svg>
        ) : null}
      </Animated.View>
      <Animated.View style={[styles.tip, tip]}>
        <Svg width={22} height={VINE_H}>
          {[0, 72, 144, 216, 288].map((a) => (
            <Circle
              key={a}
              cx={11 + Math.cos((a * Math.PI) / 180) * 5}
              cy={mid + Math.sin((a * Math.PI) / 180) * 5}
              r={4.4}
              fill={c.sceneAccent[5]}
            />
          ))}
          <Circle cx={11} cy={mid} r={3.4} fill={c.accent} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const ROCKET = 34;
const ROCKET_H = 34;

function Rocket({ theme }: { theme: Theme }) {
  const c = theme.colors;
  const body = theme.scheme === 'dark' ? c.text : c.surface;
  return (
    <Svg width={ROCKET} height={ROCKET_H} viewBox="0 0 34 34">
      <Path d="M3 17 L-4 12 Q -1 17 -4 22 Z" fill={c.accent} transform="translate(6 0)" />
      <Path d="M4 17 L0 14.5 Q 1.5 17 0 19.5 Z" fill={c.primary} transform="translate(6 0)" />
      <Path d="M12 9 L7 4 L10 12 Z" fill={c.primary} />
      <Path d="M12 25 L7 30 L10 22 Z" fill={c.primary} />
      <Ellipse
        cx={18}
        cy={17}
        rx={13}
        ry={7.5}
        fill={body}
        stroke={c.borderStrong}
        strokeWidth={1.5}
      />
      <Path d="M27 11.5 Q 33 17 27 22.5 Q 30 17 27 11.5 Z" fill={c.primary} />
      <Circle cx={20} cy={17} r={3.4} fill={c.glow} stroke={c.borderStrong} strokeWidth={1.2} />
    </Svg>
  );
}

/** Space: a rocket flies along a starry track toward a planet, leaving a glowing trail. */
function RocketTrack({ theme, width, progress, color }: TrackProps) {
  const c = theme.colors;
  const travel = Math.max(0, width - ROCKET);
  const trail = useAnimatedStyle(() => ({
    width: progress.get() * travel + ROCKET / 2,
    opacity: progress.get() > 0.001 ? 1 : 0,
  }));
  const ship = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * travel }],
  }));
  const trackH = 12;
  const top = (ROCKET_H - trackH) / 2;
  const dots = [];
  for (let x = 14; x < width - 18; x += 18) dots.push(x);
  return (
    <View style={{ height: ROCKET_H }}>
      <View
        style={[
          styles.rail,
          {
            top,
            height: trackH,
            borderRadius: trackH / 2,
            backgroundColor: c.surfaceAlt,
            borderWidth: 1.5,
            borderColor: c.border,
          },
        ]}>
        {width > 0 ? (
          <Svg width={width} height={trackH} style={StyleSheet.absoluteFill}>
            {dots.map((x) => (
              <Circle key={x} cx={x} cy={trackH / 2 - 1.5} r={1.2} fill={c.textSubtle} />
            ))}
          </Svg>
        ) : null}
      </View>
      <Svg width={22} height={22} style={[styles.goal, { top: (ROCKET_H - 22) / 2 }]}>
        <Circle cx={11} cy={11} r={9} fill={c.sceneAccent[1]} />
        <Ellipse
          cx={11}
          cy={11}
          rx={11}
          ry={3}
          fill="none"
          stroke={c.sceneAccent[3]}
          strokeWidth={1.6}
          transform="rotate(-20 11 11)"
        />
      </Svg>
      <Animated.View
        style={[styles.trail, { top, height: trackH, borderRadius: trackH / 2 }, trail]}>
        <LinearGradient
          colors={
            color ? [withAlpha(color, 0.2), color] : [withAlpha(c.gradient[0], 0.15), ...c.gradient]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.ship, ship]}>
        <Rocket theme={theme} />
      </Animated.View>
    </View>
  );
}

/** Neon: a glowing, segmented arcade meter. */
function NeonTrack({ theme, width, progress, color }: TrackProps) {
  const c = theme.colors;
  const fill = useFillWidth(progress, width);
  const h = 14;
  const glowColor = color ?? c.glow;
  const gaps = [];
  for (let x = 10; x < width; x += 10) gaps.push(x);
  return (
    <View
      style={{
        height: h,
        borderRadius: 4,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: withAlpha(glowColor, 0.45),
      }}>
      <Animated.View
        style={[
          styles.fill,
          {
            borderRadius: 3,
            backgroundColor: color,
            shadowColor: glowColor,
            shadowOpacity: 0.9,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          },
          fill,
        ]}>
        {color ? null : (
          <LinearGradient
            colors={c.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 3 }]}
          />
        )}
      </Animated.View>
      {width > 0 ? (
        <Svg width={width} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          {gaps.map((x) => (
            <Rect key={x} x={x - 1} y={0} width={2} height={h} fill={c.surfaceAlt} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const TRACKS = { bar: BarTrack, vine: VineTrack, rocket: RocketTrack, neon: NeonTrack } as const;

/**
 * Animated progress in the world's style: bar (candy / glass / calm), a growing vine (jungle), a
 * flying rocket (space) or a segmented neon meter (neon).
 */
export function ProgressBar({
  value,
  label,
  valueLabel,
  color,
  accessibilityLabel,
}: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(theme.reducedMotion ? clamped : 0);

  useEffect(() => {
    if (theme.reducedMotion) progress.set(clamped);
    else if (theme.motion.enter === 'bounce')
      progress.set(
        withSpring(clamped, { ...theme.motion.spring, damping: theme.motion.spring.damping + 6 }),
      );
    else progress.set(withTiming(clamped, { duration: theme.motion.duration + 200 }));
  }, [clamped, progress, theme]);

  const Track = TRACKS[theme.progress];

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      {label || valueLabel ? (
        <View style={styles.labels}>
          {label ? (
            <Text variant="label" tone="muted">
              {label}
            </Text>
          ) : (
            <View />
          )}
          {valueLabel ? (
            <Text variant="label" weight="bold">
              {valueLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        <Track theme={theme} width={width} progress={progress} color={color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, alignSelf: 'stretch' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  fill: { height: '100%', overflow: 'hidden' },
  shine: { position: 'absolute', top: 3, left: 6, right: 6, height: 4 },
  rail: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, overflow: 'hidden' },
  reveal: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  tip: { position: 'absolute', left: 0, top: 0 },
  trail: { position: 'absolute', left: 0, overflow: 'hidden' },
  ship: { position: 'absolute', left: 0, top: 0 },
  goal: { position: 'absolute', right: 0 },
});
