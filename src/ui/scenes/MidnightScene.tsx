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
  sparklePath,
  useLoop,
  useSvgId,
  type SceneProps,
} from '@/ui/scenes/shared';

/**
 * Midnight: a deep navy sky with a soft glow, a fine field of subtle stars (one path), a few gold
 * sparkle stars that twinkle slowly (loop 1), a crescent moon with a halo that breathes (loop 2),
 * a delicate constellation in fine gold lines, and a distant hill line at the bottom. Light:
 * ivory paper with navy ink stars and a gold moon.
 */
export const MidnightScene = memo(function MidnightScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const twinkle = useLoop(3400, animated);
  const breathe = useLoop(7000, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;

  const rand = seeded(13);
  const count = Math.round(90 * Math.max(1, (W * H) / 360000));
  const stars = Array.from({ length: count }, () => ({
    x: rand() * W,
    y: rand() * H * 0.9,
    r: (0.45 + rand() * 0.8) * Math.max(0.7, u),
  }));
  const sparkles = Array.from({ length: 8 }, (_, i) => ({
    x: i % 2 ? W - (8 + rand() * 22) * u : (8 + rand() * 22) * u,
    y: (60 + rand() * (H / u - 200)) * u,
    r: (2.6 + rand() * 2.6) * u,
  }));

  // Crescent moon (top right): outer arc, inner arc offset.
  // A low moon rising over the hills (bottom right: the top is busy with headers).
  const hill = H - 46 * u;
  const mx = W - 70 * u;
  const my = hill - 74 * u;
  const mr = 24 * u;
  const moon = `M${mx} ${my - mr} A ${mr} ${mr} 0 1 0 ${mx} ${my + mr} A ${mr * 1.3} ${mr * 1.3} 0 0 1 ${mx} ${my - mr} Z`;

  // A small constellation (low on the left, above the hills).
  const pts = [
    [24, 96],
    [56, 78],
    [86, 100],
    [116, 84],
    [104, 122],
  ].map(([x, y]) => [x * u, hill - 150 * u + y * u]);
  const lines = `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]} L${pts[2][0]} ${pts[2][1]} L${pts[3][0]} ${pts[3][1]} M${pts[2][0]} ${pts[2][1]} L${pts[4][0]} ${pts[4][1]}`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('haze')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.scene[0]} stopOpacity={0} />
            <Stop offset="1" stopColor={c.scene[0]} stopOpacity={1} />
          </LinearGradient>
          <RadialGradient id={id('sky')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.scene[1]} stopOpacity={1} />
            <Stop offset="1" stopColor={c.scene[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={W * 0.8} cy={H * 0.75} r={Math.max(W, H) * 0.6} fill={`url(#${id('sky')})`} />
        <Rect y={H * 0.45} width={W} height={H * 0.55} fill={`url(#${id('haze')})`} />
        <Path d={dotsPath(stars)} fill={acc[2]} opacity={dark ? 0.55 : 0.45} />
        <Path
          d={lines}
          stroke={acc[1]}
          strokeWidth={0.9 * u}
          opacity={dark ? 0.45 : 0.55}
          fill="none"
        />
        <Path
          d={dotsPath(pts.map(([x, y]) => ({ x, y, r: 1.8 * u })))}
          fill={acc[1]}
          opacity={0.9}
        />
        {/* A distant, quiet hill line */}
        <Path
          d={`M0 ${H} V${hill} Q ${W * 0.22} ${hill - 22 * u} ${W * 0.48} ${hill - 4 * u} T ${W} ${hill - 14 * u} V${H} Z`}
          fill={acc[3]}
        />
        <Path
          d={`M0 ${hill} Q ${W * 0.22} ${hill - 22 * u} ${W * 0.48} ${hill - 4 * u} T ${W} ${hill - 14 * u}`}
          stroke={acc[1]}
          strokeWidth={0.8 * u}
          opacity={0.4}
          fill="none"
        />
      </Svg>

      <Drift loop={breathe} fade={0.45} style={{ left: mx - 90 * u, top: my - 90 * u }}>
        <Svg width={180 * u} height={180 * u}>
          <Defs>
            <RadialGradient id={id('halo')} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={acc[0]} stopOpacity={dark ? 0.3 : 0.35} />
              <Stop offset="0.45" stopColor={acc[0]} stopOpacity={dark ? 0.08 : 0.12} />
              <Stop offset="1" stopColor={acc[0]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={90 * u} cy={90 * u} r={90 * u} fill={`url(#${id('halo')})`} />
        </Svg>
      </Drift>
      <Svg width={W} height={H} style={styles.moon}>
        <Path d={moon} fill={acc[0]} />
      </Svg>

      <Drift loop={twinkle} fade={0.7} style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          {sparkles.map((s, i) => (
            <G key={i} transform={`translate(${s.x} ${s.y})`}>
              <Path d={sparklePath(s.r)} fill={i % 3 === 0 ? acc[2] : acc[1]} />
            </G>
          ))}
        </Svg>
      </Drift>
    </View>
  );
});

const styles = StyleSheet.create({
  moon: { position: 'absolute', left: 0, top: 0 },
});
