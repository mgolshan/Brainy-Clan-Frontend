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
  sceneUnit,
  seeded,
  sparklePath,
  useLoop,
  useSvgId,
  type SceneProps,
} from '@/ui/scenes/shared';

/** Castle drawing box (viewBox units); flags are drawn separately so they can wave. */
const CW = 200;
const CH = 170;
/** Flag pole tops in the castle box: left tower, keep, right tower. */
const POLES = [
  [40, 4],
  [100, -8],
  [160, 4],
] as const;

/** A pastel storybook castle: two towers, a keep with a pointed roof, battlements and a door. */
function Castle({
  w,
  wall,
  shade,
  roof,
  window: win,
  door,
  pole,
}: {
  w: number;
  wall: string;
  shade: string;
  roof: string;
  window: string;
  door: string;
  pole: string;
}) {
  const merlons = (x0: number, x1: number, y: number) => {
    let d = '';
    for (let x = x0; x < x1 - 2; x += 10) d += `M${x} ${y} h6 v-7 h-6 Z`;
    return d;
  };
  return (
    <Svg width={w} height={(w * CH) / CW} viewBox={`0 ${-14} ${CW} ${CH + 14}`}>
      {/* flag poles */}
      <Path
        d={POLES.map(([x, y]) => `M${x} ${y} V${y + 20}`).join(' ')}
        stroke={pole}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* keep */}
      <Rect x={74} y={46} width={52} height={70} fill={wall} />
      <Path d="M68 50 L100 6 L132 50 Z" fill={roof} />
      <Path d="M100 6 L132 50 L112 50 Z" fill={shade} opacity={0.35} />
      {/* main wall with battlements */}
      <Rect x={44} y={96} width={112} height={74} fill={wall} />
      <Path d={merlons(46, 156, 96)} fill={wall} />
      {/* towers */}
      <Rect x={22} y={60} width={36} height={110} fill={wall} />
      <Rect x={142} y={60} width={36} height={110} fill={wall} />
      <Path d="M16 63 L40 20 L64 63 Z" fill={roof} />
      <Path d="M136 63 L160 20 L184 63 Z" fill={roof} />
      <Path d="M40 20 L64 63 L52 63 Z M160 20 L184 63 L172 63 Z" fill={shade} opacity={0.35} />
      {/* soft shading on the right side of every block */}
      <Path
        d="M48 60 h10 v110 h-10 Z M168 60 h10 v110 h-10 Z M116 46 h10 v50 h-10 Z"
        fill={shade}
        opacity={0.45}
      />
      {/* bricks */}
      <Path
        d="M28 84 h10 M44 104 h8 M30 128 h12 M150 90 h10 M160 116 h12 M148 140 h10 M64 120 h12 M128 134 h12 M80 150 h10 M82 64 h10"
        stroke={shade}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* windows */}
      <Path
        d="M34 98 v-8 a6 6 0 0 1 12 0 v8 Z M154 98 v-8 a6 6 0 0 1 12 0 v8 Z M94 80 v-10 a6 6 0 0 1 12 0 v10 Z M64 130 v-6 a5 5 0 0 1 10 0 v6 Z M126 130 v-6 a5 5 0 0 1 10 0 v6 Z"
        fill={win}
      />
      {/* door */}
      <Path d="M86 170 V146 a14 14 0 0 1 28 0 V170 Z" fill={door} />
      <Circle cx={108} cy={160} r={1.6} fill={wall} />
    </Svg>
  );
}

/** A small pennant (pole on its left edge). */
function Pennant({ w, color, stripe }: { w: number; color: string; stripe: string }) {
  return (
    <Svg width={w} height={w * 0.6} viewBox="0 0 30 18">
      <Path d="M0 0 C 10 2 20 -1 30 5 C 20 8 10 6 0 13 Z" fill={color} />
      <Path d="M0 5 C 8 6 14 4 21 6" stroke={stripe} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

/** A friendly little dragon peeking over a hill (looks left), with tiny wings and a smile. */
function Dragon({
  size,
  body,
  belly,
  wing,
  horn,
  eye,
  cheek,
}: {
  size: number;
  body: string;
  belly: string;
  wing: string;
  horn: string;
  eye: string;
  cheek: string;
}) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
      {/* wing */}
      <Path d="M62 62 C 76 40 94 38 98 46 C 90 48 92 56 84 58 C 86 64 78 68 70 72 Z" fill={wing} />
      {/* body + neck */}
      <Path d="M38 110 C 36 86 40 70 50 58 L 70 62 C 76 78 78 96 80 110 Z" fill={body} />
      <Path d="M48 110 C 47 92 50 78 56 68 L 64 70 C 66 84 66 98 66 110 Z" fill={belly} />
      <Path d="M54 80 h10 M52 90 h12 M51 100 h14" stroke={body} strokeWidth={1.6} opacity={0.5} />
      {/* head */}
      <Ellipse cx={46} cy={46} rx={26} ry={21} fill={body} />
      <Ellipse cx={26} cy={52} rx={15} ry={11} fill={body} />
      {/* horns + spikes */}
      <Path d="M44 27 L40 12 L52 25 Z M60 30 L64 16 L68 32 Z" fill={horn} />
      <Path d="M72 46 l8 -4 l-2 9 Z M74 58 l8 -2 l-4 8 Z" fill={horn} />
      {/* eye */}
      <Ellipse cx={42} cy={41} rx={6.5} ry={7.5} fill={eye} />
      <Circle cx={44} cy={38.5} r={2.4} fill={belly} />
      {/* nostrils + smile + cheek */}
      <Circle cx={15} cy={49} r={1.5} fill={eye} />
      <Circle cx={20} cy={47} r={1.3} fill={eye} />
      <Path
        d="M16 58 Q 26 65 36 58"
        stroke={eye}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={38} cy={53} rx={5} ry={3.2} fill={cheek} opacity={0.75} />
    </Svg>
  );
}

/**
 * Fairy-Tale Castle: a warm sunset sky (light) or a starry twilight (dark) with a glow, puffy
 * clouds, a pastel castle on a green hill whose pennants wave (loop 1, which also twinkles the
 * magic sparkles), rolling hills, and a friendly little dragon peeking over the front hill on the
 * right (loop 2). At night the castle windows glow.
 */
export const CastleScene = memo(function CastleScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const wave = useLoop(2600, animated);
  const peek = useLoop(3400, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;

  const hill = 96 * u;
  const castleW = Math.min(W * 0.5, 210 * u);
  const k = castleW / CW;
  const castleH = castleW * ((CH + 14) / CW);
  const castleLeft = W * 0.04;
  const castleTop = H - hill - castleH + 40 * u;
  const dragonSize = 92 * u;

  const rand = seeded(23);
  const stars = dark
    ? Array.from({ length: Math.round(60 * Math.max(1, (W * H) / 360000)) }, () => ({
        x: rand() * W,
        y: rand() * H * 0.6,
        r: (0.5 + rand() * 0.9) * Math.max(0.7, u),
      }))
    : [];
  const sparkles = Array.from({ length: 7 }, (_, i) => ({
    x: i % 2 ? W - (10 + rand() * 26) * u : (10 + rand() * 26) * u,
    y: (90 + rand() * (H / u - 300)) * u,
    r: (3 + rand() * 3) * u,
  }));
  const flowers = Array.from({ length: 12 }, (_, i) => ({
    x: (i + 0.4) * (W / 12) + rand() * 10 * u,
    y: H - 14 * u - rand() * 26 * u,
    r: (1.8 + rand() * 1.4) * u,
  }));

  const cloud = (x: number, y: number, s: number) =>
    `M${x} ${y} a${14 * s} ${11 * s} 0 0 1 ${22 * s} ${-8 * s} a${16 * s} ${14 * s} 0 0 1 ${30 * s} ${2 * s} a${12 * s} ${10 * s} 0 0 1 ${14 * s} ${14 * s} Z`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.scene[3]} stopOpacity={1} />
            <Stop offset="1" stopColor={c.scene[3]} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id={id('glow')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={acc[5]} stopOpacity={dark ? 0.32 : 0.75} />
            <Stop offset="0.5" stopColor={acc[5]} stopOpacity={dark ? 0.1 : 0.3} />
            <Stop offset="1" stopColor={acc[5]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H * 0.62} fill={`url(#${id('sky')})`} />
        <Circle cx={W - 10 * u} cy={14 * u} r={90 * u} fill={`url(#${id('glow')})`} />
        {dark ? (
          <>
            <Path d={dotsPath(stars)} fill={acc[5]} opacity={0.55} />
            <Path
              d={`M${W - 34 * u} ${4 * u} a${20 * u} ${20 * u} 0 1 0 ${16 * u} ${36 * u} a${16 * u} ${16 * u} 0 1 1 ${-16 * u} ${-36 * u} Z`}
              fill={acc[5]}
            />
          </>
        ) : (
          <Circle cx={W - 10 * u} cy={14 * u} r={26 * u} fill={acc[5]} />
        )}
        <Path
          d={`${cloud(-12 * u, 130 * u, u)} ${cloud(W - 60 * u, 190 * u, 0.8 * u)}`}
          fill={dark ? c.border : c.surface}
          opacity={dark ? 0.35 : 0.9}
        />
        {/* A soft storybook rainbow behind the castle */}
        {[acc[0], acc[2], acc[3], acc[1]].map((color, i) => {
          const r = castleW * 0.78 - i * 7 * u;
          const cx = castleLeft + castleW * 0.55;
          const cy = H - hill + 10 * u;
          return (
            <Path
              key={color + i}
              d={`M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              stroke={color}
              strokeWidth={7 * u}
              fill="none"
              opacity={dark ? 0.22 : 0.35}
            />
          );
        })}
      </Svg>

      {/* The castle on its hill */}
      <Svg width={W} height={hill + 60 * u} style={[styles.layer, { top: H - hill - 50 * u }]}>
        <Path
          d={`M0 ${hill + 60 * u} V${40 * u} Q ${W * 0.25} ${6 * u} ${W * 0.55} ${36 * u} T ${W * 1.15} ${30 * u} V${hill + 60 * u} Z`}
          fill={c.scene[1]}
        />
      </Svg>
      <View style={[styles.layer, { left: castleLeft, top: castleTop }]}>
        <Castle
          w={castleW}
          wall={c.scene[0]}
          shade={acc[4]}
          roof={acc[0]}
          window={dark ? acc[5] : c.borderStrong}
          door={c.borderStrong}
          pole={c.borderStrong}
        />
      </View>
      {POLES.map(([px, py], i) => (
        <Drift
          key={i}
          loop={wave}
          rotate={i % 2 ? -7 : 7}
          style={[
            styles.flag,
            {
              left: castleLeft + px * k,
              top: castleTop + (py + 14) * k,
            },
          ]}>
          <Pennant w={30 * k} color={i === 1 ? acc[2] : acc[1]} stripe={c.surface} />
        </Drift>
      ))}

      {/* The friendly dragon peeking over the front hill */}
      <Drift
        loop={peek}
        dy={9 * u}
        dx={-2 * u}
        style={{ right: 6 * u, top: H - hill - dragonSize * 0.35 }}>
        <Dragon
          size={dragonSize}
          body={acc[3]}
          belly={dark ? c.text : c.surface}
          wing={acc[1]}
          horn={acc[2]}
          eye={dark ? c.background : c.text}
          cheek={acc[0]}
        />
      </Drift>
      {/* Front hill with flowers */}
      <Svg width={W} height={hill} style={[styles.layer, { top: H - hill + 10 * u }]}>
        <Path
          d={`M0 ${hill} V${44 * u} Q ${W * 0.4} ${14 * u} ${W * 0.78} ${36 * u} T ${W * 1.4} ${28 * u} V${hill} Z`}
          fill={c.scene[2]}
        />
        <Path
          d={dotsPath(flowers.map((f) => ({ ...f, y: f.y - (H - hill + 10 * u) })))}
          fill={acc[0]}
          opacity={dark ? 0.55 : 0.8}
        />
      </Svg>

      {/* Magic sparkles twinkling along the edges */}
      <Drift loop={wave} fade={0.75} style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          {sparkles.map((s, i) => (
            <G key={i} transform={`translate(${s.x} ${s.y})`}>
              <Path d={sparklePath(s.r)} fill={i % 3 === 0 ? acc[0] : acc[2]} />
            </G>
          ))}
        </Svg>
      </Drift>
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0 },
  flag: { transformOrigin: '0% 30%' },
});
