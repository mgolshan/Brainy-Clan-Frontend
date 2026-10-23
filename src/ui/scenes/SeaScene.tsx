import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
  SvgXml,
} from 'react-native-svg';

import { CLAN_SVGS } from '@/ui/avatars/clanSvgs.generated';
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

/** A round, friendly fish facing right (mirror with `flip`). */
function Fish({
  size,
  body,
  fin,
  stripe,
  eye,
  flip,
}: {
  size: number;
  body: string;
  fin: string;
  stripe: string;
  eye: string;
  flip?: boolean;
}) {
  const w = size;
  const h = size * 0.66;
  return (
    <Svg width={w} height={h} style={flip ? styles.flip : undefined}>
      <Path
        d={`M${w * 0.03} ${h * 0.16} L${w * 0.32} ${h * 0.5} L${w * 0.03} ${h * 0.84} Q ${w * 0.13} ${
          h * 0.5
        } ${w * 0.03} ${h * 0.16} Z`}
        fill={fin}
      />
      <Path
        d={`M${w * 0.44} ${h * 0.2} Q ${w * 0.56} ${h * 0.0} ${w * 0.74} ${h * 0.2} Z`}
        fill={fin}
      />
      <Ellipse cx={w * 0.6} cy={h * 0.52} rx={w * 0.36} ry={h * 0.36} fill={body} />
      <Path
        d={`M${w * 0.52} ${h * 0.2} Q ${w * 0.45} ${h * 0.52} ${w * 0.52} ${h * 0.84}`}
        stroke={stripe}
        strokeWidth={w * 0.07}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={w * 0.8} cy={h * 0.44} r={w * 0.06} fill={eye} />
      <Circle cx={w * 0.815} cy={h * 0.42} r={w * 0.022} fill={stripe} />
      <Path
        d={`M${w * 0.9} ${h * 0.62} q ${-w * 0.04} ${h * 0.07} ${-w * 0.09} ${h * 0.02}`}
        stroke={eye}
        strokeWidth={w * 0.025}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Two seaweed strands rooted at the bottom of the box. */
function Seaweed({ h, u, color, tip }: { h: number; u: number; color: string; tip: string }) {
  const w = 46 * u;
  const strand = (x0: number, hh: number, dir: number) => {
    let d = `M${x0} ${h}`;
    const n = 5;
    for (let i = 1; i <= n; i++) {
      const y = h - (hh * i) / n;
      const cx = x0 + (i % 2 ? dir : -dir) * 11 * u;
      d += ` Q ${cx} ${y + hh / (2 * n)} ${x0} ${y}`;
    }
    return d;
  };
  return (
    <Svg width={w} height={h}>
      <Path
        d={strand(w * 0.32, h * 0.98, 1)}
        stroke={color}
        strokeWidth={9 * u}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={strand(w * 0.7, h * 0.72, -1)}
        stroke={tip}
        strokeWidth={7 * u}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Branching coral (round-capped strokes with bulb tips), base at the bottom center. */
function BranchCoral({ u, color }: { u: number; color: string }) {
  const s = u;
  const w = 90 * s;
  const h = 96 * s;
  const x = w / 2;
  const branches = [
    [x, h, x, h - 46 * s],
    [x, h - 30 * s, x - 22 * s, h - 58 * s],
    [x - 22 * s, h - 58 * s, x - 26 * s, h - 80 * s],
    [x - 22 * s, h - 58 * s, x - 40 * s, h - 66 * s],
    [x, h - 46 * s, x + 10 * s, h - 78 * s],
    [x, h - 22 * s, x + 26 * s, h - 50 * s],
    [x + 26 * s, h - 50 * s, x + 38 * s, h - 62 * s],
    [x + 26 * s, h - 50 * s, x + 28 * s, h - 72 * s],
  ];
  const tips = branches.slice(2).map(([, , x2, y2]) => ({ x: x2, y: y2, r: 6 * s }));
  return (
    <Svg width={w} height={h}>
      <Path
        d={branches.map(([a, b, c2, d]) => `M${a} ${b} L${c2} ${d}`).join(' ')}
        stroke={color}
        strokeWidth={10 * s}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d={dotsPath(tips)} fill={color} />
    </Svg>
  );
}

/** Fan coral: a half-round fan with a light lattice. */
function FanCoral({ u, color, lattice }: { u: number; color: string; lattice: string }) {
  const r = 44 * u;
  const w = r * 2 + 4;
  const h = r + 10 * u;
  const cx = w / 2;
  const cy = r + 2;
  const ribs = [-70, -40, -12, 16, 44, 72].map((a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return `M${cx} ${cy} L${cx + Math.cos(rad) * r * 0.92} ${cy + Math.sin(rad) * r * 0.92}`;
  });
  return (
    <Svg width={w} height={h}>
      <Path
        d={`M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Q ${cx} ${cy + 6 * u} ${cx - r} ${cy} Z`}
        fill={color}
      />
      <Path d={ribs.join(' ')} stroke={lattice} strokeWidth={1.6 * u} opacity={0.55} />
      <Path
        d={`M${cx - r * 0.62} ${cy} A ${r * 0.62} ${r * 0.62} 0 0 1 ${cx + r * 0.62} ${cy}`}
        stroke={lattice}
        strokeWidth={1.6 * u}
        fill="none"
        opacity={0.55}
      />
      <Path d={`M${cx} ${cy} L${cx} ${h}`} stroke={color} strokeWidth={6 * u} />
    </Svg>
  );
}

/** A starfish centered in its box. */
function Starfish({ r, color, dot }: { r: number; color: string; dot: string }) {
  const size = r * 2.2;
  const c = size / 2;
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(c + Math.cos(a) * rr).toFixed(1)} ${(c + Math.sin(a) * rr).toFixed(1)} `;
  }
  return (
    <Svg width={size} height={size}>
      <Path d={`${d}Z`} fill={color} stroke={color} strokeWidth={r * 0.25} strokeLinejoin="round" />
      <Circle cx={c} cy={c} r={r * 0.12} fill={dot} />
    </Svg>
  );
}

/**
 * Under the Sea: sun rays slanting down through the water, a sandy floor with coral, seaweed
 * swaying and fish hovering at the edges (loop 1), the Clan octopus peeking out from the rocks,
 * and bubbles rising up both edges (loop 2: a seamless vertical cycle). Night: glowing plankton.
 */
export const SeaScene = memo(function SeaScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const sway = useLoop(3800, animated);
  const rise = useCycle(7000, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;
  const floor = 64 * u;

  // Bubbles: one period of `P`, repeated, scrolled up by exactly P → seamless.
  const P = Math.max(240 * u, H * 0.5);
  const rand = seeded(31);
  const period = Array.from({ length: 7 }, (_, i) => ({
    x: i % 2 === 0 ? 6 * u + rand() * 18 * u : W - 6 * u - rand() * 18 * u,
    y: rand() * P,
    r: (2.5 + rand() * 4.5) * u,
  }));
  const copies = Math.ceil((H + P) / P) + 1;
  const bubbles = Array.from({ length: copies }, (_, k) =>
    period.map((b) => ({ ...b, y: b.y + k * P })),
  ).flat();
  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -rise.get() * P }],
  }));

  const plankton = dark
    ? Array.from({ length: 22 }, () => ({
        x: rand() < 0.5 ? rand() * W * 0.16 : W - rand() * W * 0.16,
        y: H * 0.12 + rand() * H * 0.7,
        r: (0.9 + rand() * 1.4) * u,
      }))
    : [];

  const rays = [0.12, 0.34, 0.62, 0.86].map((f, i) => {
    const x = W * f;
    const top = (18 + i * 6) * u;
    const bottom = (70 + i * 14) * u;
    return `M${x - top / 2} 0 L${x + top / 2} 0 L${x + bottom / 2 - 90 * u} ${H * 0.78} L${
      x - bottom / 2 - 90 * u
    } ${H * 0.78} Z`;
  });

  const animal = 86 * u;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('water')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.background} stopOpacity={1} />
            <Stop offset="1" stopColor={c.scene[1]} stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id={id('ray')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={acc[4]} stopOpacity={dark ? 0.08 : 0.55} />
            <Stop offset="1" stopColor={acc[4]} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={`M0 0 H${W} V${H} H0 Z`} fill={`url(#${id('water')})`} />
        <Path d={rays.join(' ')} fill={`url(#${id('ray')})`} />
        {/* Wavy light at the surface */}
        <Path
          d={`M0 0 H${W} V${10 * u} ${Array.from(
            { length: Math.ceil(W / (40 * u)) + 1 },
            (_, i) => `Q ${W - i * 40 * u - 20 * u} ${18 * u} ${W - (i + 1) * 40 * u} ${10 * u}`,
          ).join(' ')} V0 Z`}
          fill={c.scene[3]}
        />
        {plankton.length ? <Path d={dotsPath(plankton)} fill={acc[4]} opacity={0.6} /> : null}
        {/* Sandy floor */}
        <Path
          d={`M0 ${H} V${H - floor} Q ${W * 0.25} ${H - floor - 18 * u} ${W * 0.5} ${H - floor + 4 * u} T ${W} ${
            H - floor - 6 * u
          } V${H} Z`}
          fill={c.scene[2]}
        />
        <Path
          d={dotsPath(
            Array.from({ length: 14 }, (_, i) => ({
              x: (i + 0.5) * (W / 14),
              y: H - floor * 0.4 + (i % 3) * 6 * u,
              r: 1.4 * u,
            })),
          )}
          fill={acc[5]}
          opacity={dark ? 0.5 : 0.35}
        />
      </Svg>

      {/* Bubbles rising up both edges */}
      <Animated.View style={[styles.bubbles, { height: H + P }, bubbleStyle]}>
        <Svg width={W} height={H + P}>
          <Path
            d={dotsPath(bubbles)}
            fill={acc[4]}
            fillOpacity={dark ? 0.12 : 0.35}
            stroke={acc[4]}
            strokeWidth={1.3 * u}
            strokeOpacity={dark ? 0.55 : 0.95}
          />
          <Path
            d={dotsPath(
              bubbles.map((b) => ({ x: b.x - b.r * 0.35, y: b.y - b.r * 0.35, r: b.r * 0.25 })),
            )}
            fill={acc[4]}
            opacity={dark ? 0.6 : 1}
          />
        </Svg>
      </Animated.View>

      {/* Fish hovering at the edges */}
      <Drift loop={sway} dx={12 * u} dy={-4 * u} style={{ left: -22 * u, top: H * 0.17 }}>
        <Fish size={46 * u} body={acc[3]} fin={acc[1]} stripe={acc[4]} eye={c.shadow} />
      </Drift>
      <Drift loop={sway} dx={-10 * u} dy={5 * u} style={{ right: -10 * u, top: H * 0.43 }}>
        <Fish size={38 * u} body={acc[0]} fin={acc[3]} stripe={acc[4]} eye={c.shadow} flip />
      </Drift>
      <Drift loop={sway} dx={-8 * u} dy={-3 * u} style={{ right: 10 * u, top: H * 0.5 }}>
        <Fish size={24 * u} body={acc[5]} fin={acc[3]} stripe={acc[4]} eye={c.shadow} flip />
      </Drift>

      {/* Seaweed swaying from the floor */}
      <Drift loop={sway} rotate={5} style={[styles.weed, { left: 2 * u, top: H - 170 * u }]}>
        <Seaweed h={170 * u} u={u} color={acc[2]} tip={dark ? acc[5] : c.scene[3]} />
      </Drift>
      <Drift loop={sway} rotate={-4} style={[styles.weed, { right: 64 * u, top: H - 120 * u }]}>
        <Seaweed h={120 * u} u={u} color={acc[2]} tip={acc[5]} />
      </Drift>

      {/* The Clan octopus peeking out from behind the rocks */}
      <Drift loop={sway} dy={6 * u} style={{ right: 4 * u, top: H - animal * 1.02 }}>
        <SvgXml xml={CLAN_SVGS.octopus} width={animal} height={animal} />
      </Drift>

      <View style={{ position: 'absolute', left: 34 * u, top: H - 96 * u }}>
        <BranchCoral u={u} color={acc[0]} />
      </View>
      <View style={{ position: 'absolute', left: W * 0.36, top: H - 58 * u }}>
        <Starfish r={10 * u} color={acc[3]} dot={acc[1]} />
      </View>
      <Svg width={W} height={70 * u} style={[styles.front, { top: H - 50 * u }]}>
        <G>
          <Ellipse
            cx={W - 70 * u}
            cy={48 * u}
            rx={46 * u}
            ry={28 * u}
            fill={dark ? acc[5] : c.scene[0]}
          />
          <Ellipse cx={W - 18 * u} cy={44 * u} rx={34 * u} ry={26 * u} fill={acc[5]} />
          <Ellipse cx={W - 92 * u} cy={42 * u} rx={5 * u} ry={3 * u} fill={acc[4]} opacity={0.5} />
        </G>
      </Svg>
      <View style={{ position: 'absolute', right: W * 0.3, top: H - 54 * u }}>
        <FanCoral u={u * 0.8} color={acc[1]} lattice={acc[4]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  flip: { transform: [{ scaleX: -1 }] },
  weed: { transformOrigin: '50% 100%' },
  bubbles: { position: 'absolute', left: 0, right: 0, top: 0 },
  front: { position: 'absolute', left: 0 },
});
