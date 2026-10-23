import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
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
  useCycle,
  useLoop,
  useSvgId,
  type SceneProps,
} from '@/ui/scenes/shared';

interface Building {
  x: number;
  w: number;
  h: number;
  roof: 'flat' | 'step' | 'antenna' | 'tank' | 'peak';
}

/** A row of buildings across the width (deterministic per seed). */
function skyline(W: number, u: number, seed: number, minH: number, maxH: number): Building[] {
  const rand = seeded(seed);
  const roofs: Building['roof'][] = ['flat', 'step', 'antenna', 'tank', 'flat', 'peak'];
  const out: Building[] = [];
  let x = -10 * u;
  while (x < W + 10 * u) {
    const w = (28 + rand() * 34) * u;
    out.push({
      x,
      w,
      h: minH + rand() * (maxH - minH),
      roof: roofs[Math.floor(rand() * roofs.length)],
    });
    x += w + rand() * 3 * u;
  }
  return out;
}

function buildingPath(b: Building, base: number, u: number): string {
  const top = base - b.h;
  let d = `M${b.x} ${base} V${top} H${b.x + b.w} V${base} Z`;
  if (b.roof === 'step')
    d += ` M${b.x + b.w * 0.2} ${top} V${top - 10 * u} H${b.x + b.w * 0.8} V${top} Z`;
  if (b.roof === 'antenna')
    d += ` M${b.x + b.w * 0.6} ${top} V${top - 22 * u} H${b.x + b.w * 0.6 + 2 * u} V${top} Z`;
  if (b.roof === 'tank')
    d += ` M${b.x + b.w * 0.25} ${top} V${top - 6 * u} H${b.x + b.w * 0.3} V${top - 16 * u} Q ${b.x + b.w * 0.45} ${
      top - 22 * u
    } ${b.x + b.w * 0.6} ${top - 16 * u} V${top - 6 * u} H${b.x + b.w * 0.65} V${top} Z`;
  if (b.roof === 'peak')
    d += ` M${b.x} ${top} L${b.x + b.w / 2} ${top - 14 * u} L${b.x + b.w} ${top} Z`;
  return d;
}

/** Lit windows on a building row: a few per building, some dark. */
function windows(rows: Building[], base: number, u: number, seed: number) {
  const rand = seeded(seed);
  const out: { x: number; y: number }[] = [];
  for (const b of rows) {
    const cols = Math.max(1, Math.floor(b.w / (11 * u)));
    const levels = Math.max(1, Math.floor((b.h - 12 * u) / (14 * u)));
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < levels; j++)
        if (rand() < 0.28)
          out.push({ x: b.x + 5 * u + i * 11 * u, y: base - b.h + 8 * u + j * 14 * u });
  }
  return out;
}

/** A soft cloud made of overlapping circles. */
function Cloud({ w, color }: { w: number; color: string }) {
  const h = w * 0.42;
  return (
    <Svg width={w} height={h}>
      <Path
        d={dotsPath([
          { x: w * 0.28, y: h * 0.66, r: h * 0.3 },
          { x: w * 0.5, y: h * 0.48, r: h * 0.42 },
          { x: w * 0.72, y: h * 0.64, r: h * 0.3 },
        ])}
        fill={color}
      />
      <Rect
        x={w * 0.22}
        y={h * 0.6}
        width={w * 0.56}
        height={h * 0.36}
        rx={h * 0.18}
        fill={color}
      />
    </Svg>
  );
}

/**
 * Lo-fi Dusk: a pastel sunset gradient with a soft low sun, slow clouds drifting (loop 1), a far
 * and a near city silhouette with lit windows and a cat on a rooftop, and gentle rain falling
 * (loop 2: a slow seamless vertical cycle of thin translucent streaks). Dark: late dusk, a few
 * stars, brighter windows.
 */
export const LofiScene = memo(function LofiScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const drift = useLoop(16000, animated);
  const fall = useCycle(2800, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;

  const farBase = H;
  const nearBase = H;
  const far = skyline(W, u, 7, 70 * u, 150 * u);
  const near = skyline(W, u, 19, 34 * u, 82 * u);
  const farLit = windows(far, farBase, u, 3);
  const nearLit = windows(near, nearBase, u, 9);

  // Rain: one period P of streaks, repeated and moved down by P → seamless.
  const P = 140 * u;
  const rand = seeded(41);
  const drops = Array.from({ length: Math.round((W / (360 * u)) * 14) }, () => ({
    x: rand() * (W + 30 * u),
    y: rand() * P,
    l: (10 + rand() * 10) * u,
  }));
  const copies = Math.ceil((H + P) / P) + 1;
  let rain = '';
  for (let k = 0; k < copies; k++)
    for (const d of drops) {
      const y = d.y + k * P;
      rain += `M${d.x.toFixed(1)} ${y.toFixed(1)} l${(-d.l * 0.25).toFixed(1)} ${d.l.toFixed(1)}`;
    }
  const rainStyle = useAnimatedStyle(() => ({ transform: [{ translateY: fall.get() * P }] }));

  const stars = dark
    ? Array.from({ length: 18 }, () => ({
        x: rand() * W,
        y: rand() * H * 0.3,
        r: (0.6 + rand() * 0.8) * u,
      }))
    : [];

  // The cat sits on the second near building from the right.
  const perch = near[Math.max(0, near.length - 3)];
  const catX = perch.x + perch.w * 0.5;
  const catY = nearBase - perch.h;
  const s = 1.1 * u;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.scene[3]} />
            <Stop offset="0.42" stopColor={c.scene[2]} />
            <Stop offset="0.7" stopColor={c.scene[1]} />
            <Stop offset="1" stopColor={c.scene[0]} />
          </LinearGradient>
          <RadialGradient id={id('sun')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={acc[3]} stopOpacity={dark ? 0.3 : 0.75} />
            <Stop offset="0.5" stopColor={acc[3]} stopOpacity={dark ? 0.12 : 0.3} />
            <Stop offset="1" stopColor={acc[3]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${id('sky')})`} />
        {stars.length ? <Path d={dotsPath(stars)} fill={c.text} opacity={0.6} /> : null}
        <Circle cx={W * 0.62} cy={H - 120 * u} r={150 * u} fill={`url(#${id('sun')})`} />
        <Circle
          cx={W * 0.62}
          cy={H - 120 * u}
          r={44 * u}
          fill={acc[3]}
          opacity={dark ? 0.35 : 0.8}
        />
        <Path d={far.map((b) => buildingPath(b, farBase, u)).join(' ')} fill={acc[0]} />
        <Path
          d={farLit.map((w) => `M${w.x} ${w.y} h${4 * u} v${5 * u} h${-4 * u} Z`).join(' ')}
          fill={acc[2]}
          opacity={dark ? 0.55 : 0.5}
        />
        <Path d={near.map((b) => buildingPath(b, nearBase, u)).join(' ')} fill={acc[1]} />
        <Path
          d={nearLit.map((w) => `M${w.x} ${w.y} h${5 * u} v${6 * u} h${-5 * u} Z`).join(' ')}
          fill={acc[2]}
          opacity={dark ? 0.9 : 0.75}
        />
        {/* The rooftop cat, looking at the sunset */}
        <Path
          d={`M${catX - 7 * s} ${catY} Q ${catX - 9 * s} ${catY - 12 * s} ${catX - 4 * s} ${catY - 16 * s} L${catX - 5 * s} ${
            catY - 22 * s
          } L${catX - 1 * s} ${catY - 19 * s} L${catX + 3 * s} ${catY - 22 * s} L${catX + 3 * s} ${catY - 16 * s} Q ${
            catX + 8 * s
          } ${catY - 12 * s} ${catX + 6 * s} ${catY} Z M${catX + 5 * s} ${catY - 1 * s} Q ${catX + 16 * s} ${catY + 2 * s} ${
            catX + 14 * s
          } ${catY - 8 * s}`}
          fill={acc[1]}
          stroke={acc[1]}
          strokeWidth={2.4 * s}
          strokeLinecap="round"
        />
      </Svg>

      <Drift loop={drift} dx={34 * u} style={{ left: -30 * u, top: H * 0.12 }}>
        <Cloud w={120 * u} color={acc[4]} />
      </Drift>
      <Drift loop={drift} dx={-26 * u} style={{ right: -40 * u, top: H * 0.3 }}>
        <Cloud w={92 * u} color={acc[4]} />
      </Drift>

      <Animated.View style={[styles.rain, { top: -P, height: H + P }, rainStyle]}>
        <Svg width={W} height={H + P}>
          <Path
            d={rain}
            stroke={acc[5]}
            strokeWidth={1.2 * u}
            strokeLinecap="round"
            opacity={dark ? 0.32 : 0.3}
          />
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  rain: { position: 'absolute', left: 0, right: 0 },
});
