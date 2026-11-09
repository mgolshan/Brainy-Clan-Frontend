import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import {
  Drift,
  dotsPath,
  sceneUnit,
  seeded,
  useCycle,
  useLoop,
  useSvgId,
  type SceneProps,
} from '@/ui/scenes/shared';

/** A round penguin standing and waving one flipper, with a scarf (faces the viewer). */
function Penguin({
  size,
  ink,
  belly,
  beak,
  scarf,
  cheek,
  edge,
}: {
  size: number;
  ink: string;
  belly: string;
  beak: string;
  scarf: string;
  cheek: string;
  edge: string;
}) {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 60 72">
      <Ellipse cx={22} cy={69} rx={7} ry={3} fill={beak} />
      <Ellipse cx={38} cy={69} rx={7} ry={3} fill={beak} />
      <Path d="M8 40 C 2 34 2 26 6 22 C 10 30 12 34 14 38 Z" fill={ink} />
      <Path d="M52 44 C 58 48 60 54 56 58 C 52 52 48 50 46 48 Z" fill={ink} />
      <Ellipse cx={30} cy={44} rx={20} ry={24} fill={ink} stroke={edge} strokeWidth={1.2} />
      <Ellipse cx={30} cy={48} rx={14} ry={18} fill={belly} />
      <Circle cx={30} cy={22} r={16} fill={ink} stroke={edge} strokeWidth={1.2} />
      <Path d="M18 24 C 18 14 42 14 42 24 C 42 32 36 34 30 34 C 24 34 18 32 18 24 Z" fill={belly} />
      <Circle cx={24} cy={23} r={2.6} fill={ink} />
      <Circle cx={36} cy={23} r={2.6} fill={ink} />
      <Circle cx={24.8} cy={22} r={0.9} fill={belly} />
      <Circle cx={36.8} cy={22} r={0.9} fill={belly} />
      <Path d="M26.5 27 L33.5 27 L30 31.5 Z" fill={beak} />
      <Ellipse cx={20.5} cy={29} rx={3} ry={2} fill={cheek} opacity={0.7} />
      <Ellipse cx={39.5} cy={29} rx={3} ry={2} fill={cheek} opacity={0.7} />
      <Path d="M15 36 Q 30 42 45 36 L45 40 Q 30 46 15 40 Z" fill={scarf} />
      <Path d="M38 40 L42 52 L36 52 L34 41 Z" fill={scarf} />
    </Svg>
  );
}

/** A polar bear cub peeking up (head and paws), looking left. */
function Bear({
  size,
  fur,
  shade,
  ink,
  cheek,
}: {
  size: number;
  fur: string;
  shade: string;
  ink: string;
  cheek: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={26} cy={22} r={11} fill={fur} stroke={shade} strokeWidth={2} />
      <Circle cx={26} cy={22} r={5} fill={shade} />
      <Circle cx={74} cy={22} r={11} fill={fur} stroke={shade} strokeWidth={2} />
      <Circle cx={74} cy={22} r={5} fill={shade} />
      <Path
        d="M8 100 C 8 70 16 26 50 26 C 84 26 92 70 92 100 Z"
        fill={fur}
        stroke={shade}
        strokeWidth={2}
      />
      <Ellipse cx={46} cy={66} rx={17} ry={12} fill={shade} opacity={0.45} />
      <Ellipse cx={46} cy={58} rx={6} ry={4.5} fill={ink} />
      <Path
        d="M38 70 Q 46 76 54 70"
        stroke={ink}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={34} cy={46} r={4} fill={ink} />
      <Circle cx={60} cy={46} r={4} fill={ink} />
      <Circle cx={35.3} cy={44.6} r={1.3} fill={fur} />
      <Circle cx={61.3} cy={44.6} r={1.3} fill={fur} />
      <Ellipse cx={26} cy={60} rx={6} ry={4} fill={cheek} opacity={0.6} />
      <Ellipse cx={68} cy={60} rx={6} ry={4} fill={cheek} opacity={0.6} />
      {/* paws resting on the snow */}
      <Ellipse cx={22} cy={94} rx={13} ry={8} fill={fur} stroke={shade} strokeWidth={2} />
      <Ellipse cx={74} cy={94} rx={13} ry={8} fill={fur} stroke={shade} strokeWidth={2} />
    </Svg>
  );
}

/**
 * Polar Lights: an icy sky with aurora ribbons that drift and shimmer (loop 1, which also lets the
 * penguin rock and the bear cub bob), snowy mountains, drifts with an igloo, a penguin in a scarf
 * on the left and a polar bear cub peeking in on the right, and snow falling along both edges (a
 * seamless cycle). Light = a bright polar morning with a pastel aurora; dark = the polar night.
 */
export const ArcticScene = memo(function ArcticScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const shimmer = useLoop(5200, animated);
  const fall = useCycle(9000, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;

  const ground = 88 * u;
  const rand = seeded(41);
  const stars = dark
    ? Array.from({ length: Math.round(70 * Math.max(1, (W * H) / 360000)) }, () => ({
        x: rand() * W,
        y: rand() * H * 0.55,
        r: (0.45 + rand() * 0.8) * Math.max(0.7, u),
      }))
    : [];

  // Snow: one period of `P`, repeated, scrolled down by exactly P → seamless.
  const P = Math.max(260 * u, H * 0.5);
  const flakes = Array.from({ length: 12 }, (_, i) => ({
    x: i % 2 === 0 ? 6 * u + rand() * 40 * u : W - 6 * u - rand() * 40 * u,
    y: rand() * P,
    r: (1.4 + rand() * 2.2) * u,
  }));
  const copies = Math.ceil(H / P) + 2;
  const snow = Array.from({ length: copies }, (_, k) =>
    flakes.map((f) => ({ ...f, y: f.y + (k - 1) * P })),
  ).flat();
  const falling = useAnimatedStyle(() => ({
    transform: [{ translateY: fall.get() * P }],
  }));

  // Aurora ribbons across the upper sky.
  const ribbon = (y: number, amp: number, thick: number) =>
    `M${-40 * u} ${y} C ${W * 0.2} ${y - amp} ${W * 0.45} ${y + amp} ${W * 0.7} ${y - amp * 0.4} S ${W + 40 * u} ${y - amp * 0.8} ${W + 40 * u} ${y - amp * 0.8} L${W + 40 * u} ${y - amp * 0.8 + thick} C ${W * 0.8} ${y + thick * 0.6} ${W * 0.45} ${y + amp + thick} ${W * 0.2} ${y - amp + thick * 1.2} S ${-40 * u} ${y + thick} ${-40 * u} ${y + thick} Z`;

  const mountains = `M0 ${H - ground - 70 * u} L${W * 0.16} ${H - ground - 130 * u} L${W * 0.3} ${H - ground - 80 * u} L${W * 0.48} ${H - ground - 150 * u} L${W * 0.68} ${H - ground - 76 * u} L${W * 0.84} ${H - ground - 120 * u} L${W} ${H - ground - 64 * u} V${H} H0 Z`;
  const caps = `M${W * 0.16} ${H - ground - 130 * u} l${-12 * u} ${22 * u} l${7 * u} ${-3 * u} l${5 * u} ${6 * u} l${6 * u} ${-7 * u} l${6 * u} ${4 * u} Z M${W * 0.48} ${H - ground - 150 * u} l${-16 * u} ${28 * u} l${8 * u} ${-4 * u} l${8 * u} ${7 * u} l${7 * u} ${-8 * u} l${9 * u} ${5 * u} Z M${W * 0.84} ${H - ground - 120 * u} l${-11 * u} ${20 * u} l${6 * u} ${-3 * u} l${5 * u} ${5 * u} l${5 * u} ${-6 * u} l${6 * u} ${4 * u} Z`;

  const iglooR = 34 * u;
  const iglooX = W * 0.3;
  const iglooY = H - ground + 30 * u;
  const penguinSize = 54 * u;
  const bearSize = 88 * u;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.scene[3]} stopOpacity={1} />
            <Stop offset="1" stopColor={c.scene[3]} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={W} height={H * 0.7} fill={`url(#${id('sky')})`} />
        {stars.length ? <Path d={dotsPath(stars)} fill={acc[3]} opacity={0.6} /> : null}
      </Svg>

      <Drift loop={shimmer} dx={18 * u} fade={0.35} style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id={id('aurA')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={acc[0]} stopOpacity={0} />
              <Stop offset="0.6" stopColor={acc[0]} stopOpacity={dark ? 0.55 : 0.5} />
              <Stop offset="1" stopColor={acc[0]} stopOpacity={0.05} />
            </LinearGradient>
            <LinearGradient id={id('aurB')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={acc[1]} stopOpacity={0} />
              <Stop offset="0.6" stopColor={acc[1]} stopOpacity={dark ? 0.45 : 0.4} />
              <Stop offset="1" stopColor={acc[1]} stopOpacity={0.05} />
            </LinearGradient>
          </Defs>
          <Path d={ribbon(H * 0.12, 26 * u, 46 * u)} fill={`url(#${id('aurB')})`} />
          <Path d={ribbon(H * 0.2, 34 * u, 54 * u)} fill={`url(#${id('aurA')})`} />
        </Svg>
      </Drift>

      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={mountains} fill={c.scene[0]} />
        <Path d={caps} fill={dark ? acc[2] : c.surface} />
        <Path
          d={`M0 ${H} V${H - ground} Q ${W * 0.3} ${H - ground - 26 * u} ${W * 0.62} ${H - ground - 4 * u} T ${W * 1.2} ${H - ground - 12 * u} V${H} Z`}
          fill={c.scene[1]}
          stroke={acc[2]}
          strokeWidth={1.2 * u}
        />
        {/* igloo */}
        <Path
          d={`M${iglooX - iglooR} ${iglooY} A ${iglooR} ${iglooR} 0 0 1 ${iglooX + iglooR} ${iglooY} Z`}
          fill={acc[3]}
          stroke={acc[2]}
          strokeWidth={1.5 * u}
        />
        <Path
          d={`M${iglooX - iglooR * 0.94} ${iglooY - iglooR * 0.34} H${iglooX + iglooR * 0.94} M${iglooX - iglooR * 0.7} ${iglooY - iglooR * 0.7} H${iglooX + iglooR * 0.7} M${iglooX - iglooR * 0.45} ${iglooY - iglooR * 0.34} V${iglooY - iglooR * 0.7} M${iglooX + iglooR * 0.5} ${iglooY - iglooR * 0.34} V${iglooY - iglooR * 0.7} M${iglooX} ${iglooY - iglooR * 0.7} V${iglooY - iglooR}`}
          stroke={acc[2]}
          strokeWidth={1.4 * u}
        />
        <Path
          d={`M${iglooX - 11 * u} ${iglooY} V${iglooY - 10 * u} A ${11 * u} ${11 * u} 0 0 1 ${iglooX + 11 * u} ${iglooY - 10 * u} V${iglooY} Z`}
          fill={dark ? c.background : c.borderStrong}
          opacity={dark ? 1 : 0.85}
        />
      </Svg>

      {/* Bear cub peeking over the front drift (right) */}
      <Drift
        loop={shimmer}
        dy={7 * u}
        style={{ right: 4 * u, top: H - ground * 0.62 - bearSize * 0.62 }}>
        <Bear
          size={bearSize}
          fur={acc[3]}
          shade={acc[2]}
          ink={dark ? c.background : c.text}
          cheek={acc[5]}
        />
      </Drift>

      <Svg width={W} height={ground} style={[styles.layer, { top: H - ground * 0.62 }]}>
        <Path
          d={`M0 ${ground} V${18 * u} Q ${W * 0.45} ${-4 * u} ${W * 0.82} ${16 * u} T ${W * 1.5} ${12 * u} V${ground} Z`}
          fill={c.scene[2]}
          stroke={acc[2]}
          strokeWidth={1.2 * u}
        />
      </Svg>

      {/* Penguin on the left */}
      <Drift
        loop={shimmer}
        rotate={-5}
        style={[styles.penguin, { left: 10 * u, top: H - ground * 0.62 - penguinSize * 1.05 }]}>
        <Penguin
          size={penguinSize}
          ink={acc[4]}
          belly={dark ? c.text : c.surface}
          beak={acc[5]}
          scarf={dark ? c.primary : c.secondary}
          cheek={acc[5]}
          edge={dark ? acc[2] : acc[4]}
        />
      </Drift>

      {/* Snow falling along both edges */}
      <Animated.View pointerEvents="none" style={[styles.layer, { top: 0 }, falling]}>
        <Svg width={W} height={H + P}>
          <Path d={dotsPath(snow)} fill={dark ? acc[3] : c.surface} opacity={dark ? 0.75 : 1} />
          {dark ? null : (
            <Path d={dotsPath(snow)} fill="none" stroke={acc[2]} strokeWidth={0.8} opacity={0.9} />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0 },
  penguin: { transformOrigin: '50% 100%' },
});
