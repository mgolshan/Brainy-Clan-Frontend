import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { Drift, sceneUnit, seeded, useLoop, type SceneProps } from '@/ui/scenes/shared';

function Lollipop({
  r,
  candy,
  swirl,
  stick,
}: {
  r: number;
  candy: string;
  swirl: string;
  stick: string;
}) {
  const size = r * 2 + 8;
  const c = size / 2;
  // Archimedean spiral.
  let d = `M${c} ${c}`;
  for (let t = 0; t <= Math.PI * 6; t += 0.35) {
    const rr = (r * 0.9 * t) / (Math.PI * 6);
    d += ` L${(c + Math.cos(t) * rr).toFixed(1)} ${(c + Math.sin(t) * rr).toFixed(1)}`;
  }
  return (
    <Svg width={size + r * 1.6} height={size + r * 1.6}>
      <Path
        d={`M${c} ${c} L${c + r * 1.5} ${c + r * 1.5}`}
        stroke={stick}
        strokeWidth={r * 0.22}
        strokeLinecap="round"
      />
      <Circle cx={c} cy={c} r={r} fill={candy} />
      <Path d={d} stroke={swirl} strokeWidth={r * 0.16} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function WrappedCandy({ r, body, wrap }: { r: number; body: string; wrap: string }) {
  const w = r * 5;
  const h = r * 2.4;
  const cx = w / 2;
  const cy = h / 2;
  return (
    <Svg width={w} height={h}>
      <Path
        d={`M${cx - r} ${cy} L${cx - r * 2.3} ${cy - r} L${cx - r * 2.3} ${cy + r} Z`}
        fill={wrap}
      />
      <Path
        d={`M${cx + r} ${cy} L${cx + r * 2.3} ${cy - r} L${cx + r * 2.3} ${cy + r} Z`}
        fill={wrap}
      />
      <Circle cx={cx} cy={cy} r={r} fill={body} />
      <Path
        d={`M${cx - r * 0.5} ${cy - r * 0.6} Q ${cx} ${cy} ${cx - r * 0.2} ${cy + r * 0.8}`}
        stroke={wrap}
        strokeWidth={r * 0.18}
        fill="none"
      />
    </Svg>
  );
}

/**
 * Candy Land: pastel candy-floss blobs, a swirl lollipop in the corner, wrapped sweets at the
 * edges, gumdrops along the bottom and floating sprinkles (one loop) plus a gently tilting
 * lollipop (second loop).
 */
export const CandyScene = memo(function CandyScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const float = useLoop(3600, animated);
  const tilt = useLoop(5200, animated);
  const acc = c.sceneAccent;

  const rand = seeded(23);
  const sprinkles = Array.from({ length: 30 }, (_, i) => {
    const band = i % 3;
    return {
      x: band === 0 ? rand() * 18 * u : band === 1 ? W - rand() * 18 * u : rand() * W,
      y: band === 2 ? 4 + rand() * 20 * u : 40 * u + rand() * (H - 120 * u),
      deg: rand() * 180,
      color: acc[i % acc.length],
    };
  });
  const gumdrops = Array.from({ length: Math.ceil(W / (46 * u)) + 1 }, (_, i) => ({
    x: i * 46 * u + (i % 2 ? 6 : -4) * u,
    r: (16 + (i % 3) * 4) * u,
    color: acc[(i * 2) % acc.length],
  }));
  const sugar = scheme === 'dark' ? c.text : c.surface;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Circle cx={W + 10 * u} cy={-20 * u} r={160 * u} fill={c.scene[0]} />
        <Circle cx={-40 * u} cy={H * 0.38} r={115 * u} fill={c.scene[1]} />
        <Circle cx={W + 40 * u} cy={H * 0.7} r={150 * u} fill={c.scene[2]} />
        <Circle cx={-20 * u} cy={H * 0.92} r={130 * u} fill={c.scene[3]} />
        {/* Gumdrops along the bottom edge, with sugar sparkles */}
        {gumdrops.map((g, i) => (
          <G key={i}>
            <Path
              d={`M${g.x - g.r} ${H} A ${g.r} ${g.r * 1.1} 0 0 1 ${g.x + g.r} ${H} Z`}
              fill={g.color}
            />
            <Circle cx={g.x - g.r * 0.3} cy={H - g.r * 0.65} r={1.6 * u} fill={sugar} />
            <Circle cx={g.x + g.r * 0.25} cy={H - g.r * 0.4} r={1.3 * u} fill={sugar} />
          </G>
        ))}
      </Svg>

      <Drift loop={float} dy={7 * u} style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          {sprinkles.map((s, i) => (
            <Rect
              key={i}
              x={s.x}
              y={s.y}
              width={11 * u}
              height={4 * u}
              rx={2 * u}
              fill={s.color}
              transform={`rotate(${s.deg} ${s.x} ${s.y})`}
            />
          ))}
        </Svg>
      </Drift>

      <Drift loop={tilt} rotate={8} style={[styles.lolly, { right: -6 * u, top: -4 * u }]}>
        <View style={styles.mirror}>
          <Lollipop r={24 * u} candy={acc[0]} swirl={sugar} stick={c.border} />
        </View>
      </Drift>
      <View style={{ position: 'absolute', left: -26 * u, top: H * 0.24 }}>
        <WrappedCandy r={10 * u} body={acc[1]} wrap={acc[4]} />
      </View>
      <View style={{ position: 'absolute', right: -24 * u, top: H * 0.5 }}>
        <WrappedCandy r={9 * u} body={acc[2]} wrap={acc[0]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  lolly: { transformOrigin: '30% 30%' },
  mirror: { transform: [{ rotate: '90deg' }] },
});
