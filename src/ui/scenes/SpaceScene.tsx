import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

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

/** A planet with bands and an optional tilted ring. */
function Planet({
  r,
  body,
  band,
  ring,
  highlight,
}: {
  r: number;
  body: string;
  band: string;
  ring?: string;
  highlight: string;
}) {
  const size = r * 3.2;
  const c = size / 2;
  return (
    <Svg width={size} height={size}>
      {ring ? (
        <Ellipse
          cx={c}
          cy={c}
          rx={r * 1.55}
          ry={r * 0.42}
          stroke={ring}
          strokeWidth={r * 0.12}
          fill="none"
          transform={`rotate(-18 ${c} ${c})`}
          opacity={0.9}
        />
      ) : null}
      <Circle cx={c} cy={c} r={r} fill={body} />
      <Path
        d={`M${c - r * 0.95} ${c - r * 0.25} Q ${c} ${c - r * 0.4} ${c + r * 0.95} ${c - r * 0.2}`}
        stroke={band}
        strokeWidth={r * 0.16}
        fill="none"
        strokeLinecap="round"
        opacity={0.7}
      />
      <Path
        d={`M${c - r * 0.85} ${c + r * 0.35} Q ${c} ${c + r * 0.2} ${c + r * 0.88} ${c + r * 0.4}`}
        stroke={band}
        strokeWidth={r * 0.1}
        fill="none"
        strokeLinecap="round"
        opacity={0.55}
      />
      <Circle cx={c - r * 0.35} cy={c - r * 0.4} r={r * 0.22} fill={highlight} opacity={0.2} />
      {ring ? (
        // Front half of the ring passes over the planet.
        <Path
          d={`M${c - r * 1.55} ${c} A ${r * 1.55} ${r * 0.42} 0 0 0 ${c + r * 1.55} ${c}`}
          stroke={ring}
          strokeWidth={r * 0.12}
          fill="none"
          transform={`rotate(-18 ${c} ${c})`}
        />
      ) : null}
    </Svg>
  );
}

/**
 * Space Explorers: a nebula glow, a static star field (one path), a layer of sparkle stars that
 * twinkle (loop 1), a ringed planet and a small moon drifting gently (loop 2). The light variant
 * is a pastel dawn sky with the same planets.
 */
export const SpaceScene = memo(function SpaceScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const twinkle = useLoop(1800, animated);
  const drift = useLoop(7000, animated);
  const dark = scheme === 'dark';

  const rand = seeded(5);
  const stars = Array.from({ length: Math.round(70 * Math.max(1, (W * H) / 360000)) }, () => ({
    x: rand() * W,
    y: rand() * H,
    r: (0.6 + rand() * 1.1) * Math.max(0.7, u),
  }));
  const sparkles = Array.from({ length: 12 }, (_, i) => {
    // Keep sparkles near the left / right edges and the top band.
    const edge = i % 3;
    return {
      x: edge === 0 ? rand() * 28 * u : edge === 1 ? W - rand() * 28 * u : rand() * W,
      y: edge === 2 ? rand() * 24 * u : rand() * H,
      r: (3 + rand() * 4) * u,
    };
  });
  const starColor = dark ? c.text : c.sceneAccent[5];
  const highlight = dark ? c.text : c.surface;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id('nebulaA')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.scene[2]} stopOpacity={1} />
            <Stop offset="1" stopColor={c.scene[2]} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={id('nebulaB')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.scene[3]} stopOpacity={1} />
            <Stop offset="1" stopColor={c.scene[3]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={W * 0.95} cy={H * 0.12} r={260 * u} fill={`url(#${id('nebulaA')})`} />
        <Circle cx={W * 0.05} cy={H * 0.78} r={300 * u} fill={`url(#${id('nebulaB')})`} />
        <Circle
          cx={W * 0.5}
          cy={H * 0.5}
          r={200 * u}
          fill={`url(#${id('nebulaA')})`}
          opacity={0.6}
        />
        <Path d={dotsPath(stars)} fill={starColor} opacity={dark ? 0.75 : 0.45} />
      </Svg>

      <Drift loop={twinkle} fade={0.75} style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          {sparkles.map((s, i) => (
            <G key={i} transform={`translate(${s.x} ${s.y})`}>
              <Path d={sparklePath(s.r)} fill={i % 4 === 0 ? c.sceneAccent[3] : starColor} />
            </G>
          ))}
        </Svg>
      </Drift>

      <Drift loop={drift} dy={8 * u} dx={-4 * u} style={{ right: -46 * u, top: H - 210 * u }}>
        <Planet
          r={52 * u}
          body={c.sceneAccent[0]}
          band={c.sceneAccent[3]}
          ring={c.sceneAccent[1]}
          highlight={highlight}
        />
      </Drift>
      <Drift loop={drift} dy={-6 * u} style={{ left: -10 * u, top: 6 * u }}>
        <Planet r={13 * u} body={c.sceneAccent[2]} band={c.sceneAccent[1]} highlight={highlight} />
      </Drift>
      <Drift loop={drift} dx={5 * u} style={{ left: -44 * u, top: H * 0.55 }}>
        <Planet r={24 * u} body={c.sceneAccent[4]} band={c.sceneAccent[1]} highlight={highlight} />
      </Drift>
    </View>
  );
});
