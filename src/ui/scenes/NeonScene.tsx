import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { sceneUnit, useCycle, useSvgId, type SceneProps } from '@/ui/scenes/shared';

const ROWS = 9;

/**
 * Neon Arcade: a synthwave horizon (striped sun + glow), a perspective grid whose rows roll
 * toward you (one linear loop), faint scanlines and a few arcade pixels in the corners. Lines are
 * thin and translucent, so text over them keeps its contrast.
 */
export const NeonScene = memo(function NeonScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const roll = useCycle(2600, animated);
  const dark = scheme === 'dark';
  const horizon = Math.round(H * 0.66);
  const gridH = H - horizon;
  const rowGap = gridH / ROWS;
  const lineOpacity = dark ? 0.4 : 0.32;

  const rows = useAnimatedStyle(() => ({ transform: [{ translateY: roll.get() * rowGap }] }));

  const verticals = [];
  for (let k = -10; k <= 10; k++) {
    verticals.push(
      <Line
        key={k}
        x1={W / 2 + k * 14 * u}
        y1={0}
        x2={W / 2 + k * 70 * u}
        y2={gridH}
        stroke={c.sceneAccent[1]}
        strokeWidth={1}
      />,
    );
  }
  const sunR = 92 * u;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('sun')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.sceneAccent[0]} stopOpacity={1} />
            <Stop offset="1" stopColor={c.sceneAccent[3]} stopOpacity={1} />
          </LinearGradient>
          <RadialGradient id={id('haze')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.sceneAccent[0]} stopOpacity={dark ? 0.32 : 0.18} />
            <Stop offset="1" stopColor={c.sceneAccent[0]} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={id('hazeB')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.sceneAccent[1]} stopOpacity={dark ? 0.22 : 0.14} />
            <Stop offset="1" stopColor={c.sceneAccent[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={W / 2} cy={horizon} r={W * 0.8} fill={`url(#${id('haze')})`} />
        <Circle cx={0} cy={H * 0.18} r={220 * u} fill={`url(#${id('hazeB')})`} />
        {/* Striped synthwave sun sitting on the horizon (dimmed: text may cross it). */}
        <G opacity={dark ? 0.4 : 0.3}>
          <Circle cx={W / 2} cy={horizon - sunR * 0.35} r={sunR} fill={`url(#${id('sun')})`} />
          {[0.1, 0.32, 0.5, 0.65].map((f, i) => (
            <Rect
              key={f}
              x={W / 2 - sunR}
              y={horizon - sunR * 0.35 + sunR * f}
              width={sunR * 2}
              height={(3 + i * 2) * u}
              fill={c.background}
            />
          ))}
          <Rect
            x={0}
            y={horizon - sunR * 0.35 + sunR * 0.8}
            width={W}
            height={H}
            fill={c.background}
          />
        </G>
        <Line
          x1={0}
          y1={horizon}
          x2={W}
          y2={horizon}
          stroke={c.sceneAccent[0]}
          strokeWidth={2}
          opacity={0.8}
        />
        {/* Arcade pixels in the corners */}
        {[
          [8, 10, 0],
          [20, 10, 1],
          [8, 22, 2],
        ].map(([x, y, i]) => (
          <Rect
            key={`l${i}`}
            x={x * u}
            y={y * u}
            width={8 * u}
            height={8 * u}
            fill={c.sceneAccent[i + 1]}
            opacity={0.8}
          />
        ))}
        {[
          [16, 10, 2],
          [28, 10, 0],
          [16, 22, 1],
        ].map(([x, y, i]) => (
          <Rect
            key={`r${i}`}
            x={W - x * u - 8 * u}
            y={y * u}
            width={8 * u}
            height={8 * u}
            fill={c.sceneAccent[i]}
            opacity={0.8}
          />
        ))}
      </Svg>

      <View style={[styles.grid, { top: horizon, height: gridH, opacity: lineOpacity }]}>
        <Svg width={W} height={gridH} style={StyleSheet.absoluteFill}>
          {verticals}
        </Svg>
        <Animated.View style={[styles.rows, { top: -rowGap, height: gridH + rowGap }, rows]}>
          <Svg width={W} height={gridH + rowGap}>
            {Array.from({ length: ROWS + 2 }, (_, i) => (
              <Line
                key={i}
                x1={0}
                y1={i * rowGap}
                x2={W}
                y2={i * rowGap}
                stroke={c.sceneAccent[0]}
                strokeWidth={1.2}
              />
            ))}
          </Svg>
        </Animated.View>
        {/* Rows fade into the horizon */}
        <Svg width={W} height={gridH * 0.45} style={styles.fade}>
          <Defs>
            <LinearGradient id={id('fade')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.background} stopOpacity={1} />
              <Stop offset="1" stopColor={c.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={W} height={gridH * 0.45} fill={`url(#${id('fade')})`} />
        </Svg>
      </View>

      {dark ? (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id={id('scan')} width={4} height={4} patternUnits="userSpaceOnUse">
              <Rect width={4} height={1} fill={c.text} opacity={0.035} />
            </Pattern>
          </Defs>
          <Rect width={W} height={H} fill={`url(#${id('scan')})`} />
        </Svg>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  rows: { position: 'absolute', left: 0, right: 0 },
  fade: { position: 'absolute', left: 0, top: 0 },
});
