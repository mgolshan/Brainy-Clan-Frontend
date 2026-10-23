import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
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
  useLoop,
  useSvgId,
  type SceneProps,
} from '@/ui/scenes/shared';

/** A gliding bird: two soft wing arcs, centered on 0,0. */
function birdPath(x: number, y: number, s: number): string {
  return `M${x - 9 * s} ${y - 2 * s} Q ${x - 4 * s} ${y - 6 * s} ${x} ${y} Q ${x + 4 * s} ${y - 6 * s} ${x + 9 * s} ${
    y - 2 * s
  }`;
}

/** A round tree (trunk + two-tone canopy), base at (x, y). */
function Tree({
  x,
  y,
  s,
  leaf,
  shade,
  trunk,
}: {
  x: number;
  y: number;
  s: number;
  leaf: string;
  shade: string;
  trunk: string;
}) {
  return (
    <G>
      <Rect x={x - 2.5 * s} y={y - 18 * s} width={5 * s} height={18 * s} rx={2 * s} fill={trunk} />
      <Circle cx={x} cy={y - 28 * s} r={16 * s} fill={shade} />
      <Circle cx={x - 4 * s} cy={y - 31 * s} r={12 * s} fill={leaf} />
    </G>
  );
}

function Cloud({ w, color }: { w: number; color: string }) {
  const h = w * 0.4;
  return (
    <Svg width={w} height={h}>
      <Path
        d={dotsPath([
          { x: w * 0.3, y: h * 0.68, r: h * 0.28 },
          { x: w * 0.52, y: h * 0.5, r: h * 0.4 },
          { x: w * 0.74, y: h * 0.68, r: h * 0.26 },
        ])}
        fill={color}
      />
      <Rect
        x={w * 0.26}
        y={h * 0.62}
        width={w * 0.52}
        height={h * 0.34}
        rx={h * 0.17}
        fill={color}
      />
    </Svg>
  );
}

/**
 * Calm Nature: an open sky with a low soft sun (a moon at night), two slow clouds (loop 1), a few
 * birds gliding by (loop 2), and three layers of rolling hills with round trees along the
 * bottom. Long, slow loops; nothing crosses the reading area. Plenty of open space, so very
 * large text stays calm.
 */
export const NatureScene = memo(function NatureScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const clouds = useLoop(18000, animated);
  const glide = useLoop(9000, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;

  const h1 = H - 150 * u;
  const h2 = H - 104 * u;
  const h3 = H - 58 * u;
  // Low sun (moon at night) over the hills, right side.
  const sx = W - 54 * u;
  const sy = h1 - 56 * u;

  const rand = seeded(9);
  const stars = dark
    ? Array.from({ length: 16 }, () => ({
        x: rand() * W,
        y: rand() * H * 0.28,
        r: (0.6 + rand() * 0.7) * u,
      }))
    : [];
  const trees = [
    { x: W * 0.08, y: h2 + 10 * u, s: 1.05 * u },
    { x: W * 0.17, y: h2 + 14 * u, s: 0.8 * u },
    { x: W * 0.84, y: h1 + 12 * u, s: 0.75 * u },
    { x: W * 0.92, y: h1 + 16 * u, s: 0.95 * u },
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.scene[3]} stopOpacity={1} />
            <Stop offset="0.7" stopColor={c.scene[3]} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id={id('sun')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={acc[3]} stopOpacity={dark ? 0.28 : 0.7} />
            <Stop offset="0.5" stopColor={acc[3]} stopOpacity={dark ? 0.08 : 0.22} />
            <Stop offset="1" stopColor={acc[3]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill={`url(#${id('sky')})`} />
        {stars.length ? <Path d={dotsPath(stars)} fill={c.text} opacity={0.5} /> : null}
        <Circle cx={sx} cy={sy} r={110 * u} fill={`url(#${id('sun')})`} />
        {dark ? (
          // Crescent moon
          <Path
            d={`M${sx} ${sy - 20 * u} A ${20 * u} ${20 * u} 0 1 0 ${sx} ${sy + 20 * u} A ${26 * u} ${26 * u} 0 0 1 ${sx} ${sy - 20 * u} Z`}
            fill={acc[3]}
            opacity={0.9}
          />
        ) : (
          <Circle cx={sx} cy={sy} r={20 * u} fill={acc[3]} opacity={0.95} />
        )}
        {/* Rolling hills, far to near */}
        <Path
          d={`M0 ${H} V${h1 + 20 * u} Q ${W * 0.3} ${h1 - 30 * u} ${W * 0.62} ${h1 + 6 * u} T ${W} ${h1 - 4 * u} V${H} Z`}
          fill={c.scene[0]}
        />
        <Path
          d={`M0 ${H} V${h2} Q ${W * 0.38} ${h2 + 34 * u} ${W * 0.72} ${h2 + 4 * u} T ${W * 1.3} ${h2 + 8 * u} V${H} Z`}
          fill={c.scene[1]}
        />
        {trees.map((t, i) => (
          <Tree key={i} {...t} leaf={acc[1]} shade={acc[2]} trunk={dark ? acc[2] : acc[4]} />
        ))}
        <Path
          d={`M0 ${H} V${h3 + 10 * u} Q ${W * 0.24} ${h3 - 20 * u} ${W * 0.5} ${h3 + 4 * u} T ${W} ${h3 - 6 * u} V${H} Z`}
          fill={c.scene[2]}
        />
        {/* A few meadow flowers on the near hill (light) */}
        <Path
          d={dotsPath(
            Array.from({ length: 9 }, (_, i) => ({
              x: (i + 0.5) * (W / 9) + (i % 2 ? 6 : -6) * u,
              y: h3 + 22 * u + (i % 3) * 8 * u,
              r: 2 * u,
            })),
          )}
          fill={dark ? acc[3] : acc[5]}
          opacity={dark ? 0.35 : 0.9}
        />
      </Svg>

      <Drift loop={clouds} dx={30 * u} style={{ left: -24 * u, top: h1 - 170 * u }}>
        <Cloud w={110 * u} color={acc[5]} />
      </Drift>
      <Drift loop={clouds} dx={-24 * u} style={{ right: -10 * u, top: h1 - 110 * u }}>
        <Cloud w={70 * u} color={acc[5]} />
      </Drift>

      <Drift loop={glide} dx={26 * u} dy={-8 * u} style={{ left: W * 0.42, top: h1 - 92 * u }}>
        <Svg width={90 * u} height={50 * u}>
          <Path
            d={[
              birdPath(20 * u, 20 * u, u),
              birdPath(46 * u, 30 * u, 0.8 * u),
              birdPath(64 * u, 14 * u, 0.65 * u),
            ].join(' ')}
            stroke={acc[4]}
            strokeWidth={2.2 * u}
            strokeLinecap="round"
            fill="none"
            opacity={dark ? 0.8 : 0.75}
          />
        </Svg>
      </Drift>
    </View>
  );
});
