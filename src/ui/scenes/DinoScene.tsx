import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import {
  Drift,
  dotsPath,
  leafPath,
  sceneUnit,
  seeded,
  useLoop,
  useSvgId,
  type SceneProps,
} from '@/ui/scenes/shared';

/** A fern frond: an arched stem with leaflets, base at the box's bottom-left. */
function Fern({
  len,
  u,
  color,
  bend,
}: {
  len: number;
  u: number;
  color: string;
  /** Degrees the frond leans (negative = left). */
  bend: number;
}) {
  const size = len * 1.15;
  const leaflets = [];
  const n = 9;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const y = -len * t;
    const x = Math.sin(t * 1.4) * len * 0.22;
    const l = (1 - t * 0.75) * 26 * u;
    leaflets.push(
      <G key={`l${i}`} transform={`translate(${x} ${y}) rotate(${-62 - t * 20})`}>
        <Path d={leafPath(l, l * 0.42)} fill={color} />
      </G>,
      <G key={`r${i}`} transform={`translate(${x} ${y}) rotate(${62 + t * 10})`}>
        <Path d={leafPath(l, l * 0.42)} fill={color} />
      </G>,
    );
  }
  return (
    <Svg width={size} height={size}>
      <G transform={`translate(${size * 0.5} ${size}) rotate(${bend})`}>
        <Path
          d={`M0 0 Q ${len * 0.05} ${-len * 0.5} ${Math.sin(1.4) * len * 0.22} ${-len}`}
          stroke={color}
          strokeWidth={3.5 * u}
          fill="none"
          strokeLinecap="round"
        />
        {leaflets}
      </G>
    </Svg>
  );
}

/** A cute long-neck dino peeking in from the right edge (head looks left). */
function Dino({
  size,
  body,
  belly,
  spot,
  eye,
  cheek,
}: {
  size: number;
  body: string;
  belly: string;
  spot: string;
  eye: string;
  cheek: string;
}) {
  const s = size / 100;
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
      {/* neck */}
      <Path d="M58 130 C 56 96 50 70 44 48 L 70 44 C 74 70 80 100 86 130 Z" fill={body} />
      <Path d="M62 130 C 60 104 56 82 52 62 L 60 60 C 64 82 68 106 72 130 Z" fill={belly} />
      {/* head */}
      <Ellipse cx={46} cy={38} rx={30} ry={22} fill={body} />
      <Ellipse cx={26} cy={44} rx={16} ry={12} fill={body} />
      {/* back plates */}
      <Path d="M70 28 l8 -6 l1 10 Z M76 44 l9 -3 l-3 9 Z M80 62 l9 -1 l-5 8 Z" fill={spot} />
      {/* spots */}
      <Circle cx={58} cy={26} r={4} fill={spot} opacity={0.8} />
      <Circle cx={66} cy={36} r={2.6} fill={spot} opacity={0.8} />
      <Circle cx={70} cy={84} r={3.4} fill={spot} opacity={0.6} />
      {/* eye */}
      <Ellipse cx={40} cy={32} rx={6.5} ry={7.5} fill={eye} />
      <Circle cx={42} cy={29.5} r={2.4} fill={belly} />
      {/* nostril + smile + cheek */}
      <Circle cx={15} cy={40} r={1.6} fill={eye} />
      <Path
        d="M14 50 Q 24 57 34 50"
        stroke={eye}
        strokeWidth={2.4 / Math.max(0.6, s)}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={36} cy={46} rx={5} ry={3.2} fill={cheek} opacity={0.75} />
    </Svg>
  );
}

/** The friendly volcano (with a sleepy smile) and the lava glow at its crater. */
function Volcano({
  w,
  h,
  body,
  rim,
  lava,
  face,
  cheek,
}: {
  w: number;
  h: number;
  body: string;
  rim: string;
  lava: string;
  face: string;
  cheek: string;
}) {
  return (
    <Svg width={w} height={h} viewBox="0 0 200 120">
      <Path
        d="M0 120 C 40 104 62 60 76 26 Q 100 34 124 26 C 138 60 160 104 200 120 Z"
        fill={body}
      />
      <Path
        d="M100 31 Q 112 32 124 26 C 138 60 160 104 200 120 L 122 120 C 116 88 108 58 100 31 Z"
        fill={rim}
        opacity={0.16}
      />
      <Ellipse cx={100} cy={27} rx={24} ry={6} fill={lava} />
      <Path d="M83 28 C 81 38 89 41 90 30 Z M108 29 C 107 42 115 43 115 29 Z" fill={lava} />
      <Path
        d="M80 64 q 6 5 12 0 M108 64 q 6 5 12 0 M93 76 q 7 6 14 0"
        stroke={face}
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={77} cy={74} rx={5} ry={3} fill={cheek} opacity={0.8} />
      <Ellipse cx={123} cy={74} rx={5} ry={3} fill={cheek} opacity={0.8} />
    </Svg>
  );
}

/**
 * Dino Valley: a warm sky with the sun, a friendly sleepy volcano puffing smoke (loop 1 also
 * sways the ferns), rolling green hills, ferns in the corners, and a cute long-neck dino peeking
 * in from the right (loop 2). Night: the volcano glows and fireflies drift by.
 */
export const DinoScene = memo(function DinoScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const sway = useLoop(4600, animated);
  const peek = useLoop(3200, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;

  const hill = 92 * u;
  const volW = Math.min(W * 0.62, 260 * u);
  const volH = volW * 0.6;
  const volLeft = W * 0.03;
  const volTop = H - hill - volH + 34 * u;
  const craterX = volLeft + volW * 0.5;
  const craterY = volTop + volH * (27 / 120);
  const dinoSize = 96 * u;

  const smoke = dark ? c.border : c.surface;
  const rand = seeded(17);
  const fireflies = dark
    ? Array.from({ length: 12 }, () => ({
        x: rand() < 0.5 ? rand() * W * 0.16 : W - rand() * W * 0.16,
        y: H * 0.2 + rand() * H * 0.5,
        r: (1.2 + rand() * 1.4) * u,
      }))
    : [];
  const pebbles = Array.from({ length: 10 }, (_, i) => ({
    x: (i + 0.3) * (W / 10) + rand() * 12 * u,
    y: H - 16 * u - rand() * 22 * u,
    r: (1.6 + rand() * 1.8) * u,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id('sun')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={acc[5]} stopOpacity={dark ? 0.35 : 0.9} />
            <Stop offset="0.45" stopColor={acc[5]} stopOpacity={dark ? 0.12 : 0.45} />
            <Stop offset="1" stopColor={acc[5]} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.scene[3]} stopOpacity={1} />
            <Stop offset="1" stopColor={c.scene[3]} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id={id('glow')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={acc[3]} stopOpacity={dark ? 0.35 : 0.18} />
            <Stop offset="1" stopColor={acc[3]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H * 0.6} fill={`url(#${id('sky')})`} />
        <Circle cx={W - 6 * u} cy={10 * u} r={80 * u} fill={`url(#${id('sun')})`} />
        <Circle cx={W - 6 * u} cy={10 * u} r={24 * u} fill={acc[5]} opacity={dark ? 0.5 : 1} />
        {/* glow behind the crater */}
        <Circle cx={craterX} cy={craterY} r={(dark ? 120 : 90) * u} fill={`url(#${id('glow')})`} />
        {fireflies.length ? <Path d={dotsPath(fireflies)} fill={acc[5]} opacity={0.8} /> : null}
      </Svg>

      {/* Smoke puffs drifting up from the crater */}
      <Drift
        loop={sway}
        dy={-12 * u}
        dx={6 * u}
        fade={0.5}
        style={{ left: craterX - 30 * u, top: craterY - 76 * u }}>
        <Svg width={70 * u} height={80 * u}>
          <Circle cx={30 * u} cy={62 * u} r={11 * u} fill={smoke} />
          <Circle cx={40 * u} cy={42 * u} r={9 * u} fill={smoke} opacity={0.85} />
          <Circle cx={33 * u} cy={23 * u} r={7 * u} fill={smoke} opacity={0.65} />
        </Svg>
      </Drift>

      <View style={{ position: 'absolute', left: volLeft, top: volTop }}>
        <Volcano
          w={volW}
          h={volH}
          body={c.scene[0]}
          rim={acc[2]}
          lava={acc[3]}
          face={acc[2]}
          cheek={acc[3]}
        />
      </View>

      <Svg width={W} height={hill + 40 * u} style={[styles.hills, { top: H - hill - 30 * u }]}>
        <Path
          d={`M0 ${hill + 40 * u} V${36 * u} Q ${W * 0.3} ${4 * u} ${W * 0.62} ${34 * u} T ${W * 1.2} ${
            26 * u
          } V${hill + 40 * u} Z`}
          fill={c.scene[1]}
        />
        <Path
          d={`M0 ${hill + 40 * u} V${74 * u} Q ${W * 0.45} ${44 * u} ${W * 0.8} ${70 * u} T ${W * 1.4} ${
            64 * u
          } V${hill + 40 * u} Z`}
          fill={c.scene[2]}
        />
        <Path
          d={dotsPath(pebbles.map((p) => ({ ...p, y: p.y - (H - hill - 30 * u) })))}
          fill={acc[2]}
          opacity={0.45}
        />
      </Svg>

      {/* Dino peeking in from the right */}
      <Drift
        loop={peek}
        dy={8 * u}
        dx={-3 * u}
        style={{ right: -14 * u, top: H - dinoSize * 1.3 - 4 * u }}>
        <Dino
          size={dinoSize}
          body={acc[4]}
          belly={dark ? c.text : c.surface}
          spot={acc[1]}
          eye={dark ? c.background : c.text}
          cheek={acc[3]}
        />
      </Drift>

      {/* Ferns in the corners */}
      <Drift loop={sway} rotate={3} style={[styles.fern, { left: -30 * u, top: H - 150 * u }]}>
        <Fern len={130 * u} u={u} color={acc[1]} bend={22} />
      </Drift>
      <Drift loop={sway} rotate={-2} style={[styles.fern, { left: -10 * u, top: H - 120 * u }]}>
        <Fern len={104 * u} u={u} color={acc[0]} bend={40} />
      </Drift>
      <Drift loop={sway} rotate={-3} style={[styles.fern, { right: 26 * u, top: H - 110 * u }]}>
        <Fern len={96 * u} u={u} color={acc[0]} bend={-30} />
      </Drift>
    </View>
  );
});

const styles = StyleSheet.create({
  hills: { position: 'absolute', left: 0 },
  fern: { transformOrigin: '50% 100%' },
});
