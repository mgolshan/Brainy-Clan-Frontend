import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, SvgXml } from 'react-native-svg';

import { CLAN_SVGS } from '@/ui/avatars/clanSvgs.generated';
import {
  Drift,
  dotsPath,
  leafPath,
  sceneUnit,
  seeded,
  useLoop,
  type SceneProps,
} from '@/ui/scenes/shared';

/** A leaf with a midrib, placed at (x, y), rotated `deg` (0 = tip up). */
function Leaf({
  x,
  y,
  len,
  w,
  deg,
  fill,
  rib,
}: {
  x: number;
  y: number;
  len: number;
  w: number;
  deg: number;
  fill: string;
  rib: string;
}) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${deg})`}>
      <Path d={leafPath(len, w)} fill={fill} />
      <Path d={`M0 0 L0 ${-len * 0.92}`} stroke={rib} strokeWidth={Math.max(1, w * 0.05)} />
    </G>
  );
}

/** A hanging vine (top edge → down) with alternating leaves. */
function Vine({
  h,
  u,
  stem,
  leaf,
  rib,
}: {
  h: number;
  u: number;
  stem: string;
  leaf: string;
  rib: string;
}) {
  // Narrow: the vine stays inside the screen padding, so it never sits under text.
  const w = 24 * u;
  const leaves: ReactNode[] = [];
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const y = (h * i) / (n + 1);
    const inner = i % 2 === 0;
    leaves.push(
      <Leaf
        key={i}
        x={w / 2 + (inner ? 2 : -2) * u}
        y={y}
        len={(inner ? 15 : 20) * u}
        w={(inner ? 9 : 12) * u}
        deg={inner ? 155 : -125}
        fill={leaf}
        rib={rib}
      />,
    );
  }
  return (
    <Svg width={w} height={h + 20 * u}>
      <Path
        d={`M${w / 2} 0 C ${w / 2 + 4 * u} ${h * 0.25} ${w / 2 - 4 * u} ${h * 0.5} ${w / 2} ${h * 0.7} S ${
          w / 2 + 3 * u
        } ${h * 0.92} ${w / 2} ${h}`}
        stroke={stem}
        strokeWidth={3.5 * u}
        fill="none"
        strokeLinecap="round"
      />
      {leaves}
      <Circle cx={w / 2} cy={h + 4 * u} r={5 * u} fill={leaf} />
    </Svg>
  );
}

/** Corner canopy: big overlapping leaves fanning out of a top corner. */
function Canopy({ u, c, flip }: { u: number; c: SceneProps['c']; flip: boolean }) {
  const size = 190 * u;
  const big = c.scene[2] ?? c.backgroundAlt;
  const mid = c.scene[1] ?? c.backgroundAlt;
  const deep = c.sceneAccent[0];
  const deeper = c.sceneAccent[1];
  return (
    <Svg width={size} height={size} style={flip ? styles.flip : undefined}>
      <Leaf x={0} y={0} len={170 * u} w={92 * u} deg={128} fill={mid} rib={big} />
      <Leaf x={0} y={0} len={150 * u} w={80 * u} deg={100} fill={big} rib={mid} />
      <Leaf x={0} y={0} len={120 * u} w={70 * u} deg={156} fill={big} rib={mid} />
      {/* Deep greens only hug the corner edges (status bar / screen padding), never under text. */}
      <Leaf x={-6 * u} y={-6 * u} len={58 * u} w={30 * u} deg={98} fill={deep} rib={mid} />
      <Leaf x={-6 * u} y={-6 * u} len={50 * u} w={24 * u} deg={170} fill={deeper} rib={deep} />
      <G transform={`translate(${118 * u} ${12 * u})`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <Circle
            key={a}
            cx={Math.cos((a * Math.PI) / 180) * 5 * u}
            cy={Math.sin((a * Math.PI) / 180) * 5 * u}
            r={4.2 * u}
            fill={c.sceneAccent[5]}
          />
        ))}
        <Circle r={3 * u} fill={c.sceneAccent[4]} />
      </G>
    </Svg>
  );
}

/**
 * Jungle Adventure: leafy canopies in the top corners, two vines swaying from the top edge,
 * rolling hills, and Clan animals (monkey, tiger) peeking out of the bushes at the bottom.
 * Night: fireflies. Two loops at most (vine sway, peek bob).
 */
export const JungleScene = memo(function JungleScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const sway = useLoop(4200, animated);
  const peek = useLoop(3000, animated);
  const vineH = Math.min(H * 0.36, 300 * u);
  const animal = 84 * u;
  // Vine leaves: a light leaf green by day, a deep one at night (keeps text contrast).
  const vineLeaf = scheme === 'dark' ? c.sceneAccent[0] : c.sceneAccent[2];

  const rand = seeded(11);
  const fireflies =
    scheme === 'dark'
      ? Array.from({ length: 16 }, () => ({
          x: rand() < 0.5 ? rand() * W * 0.18 : W - rand() * W * 0.18,
          y: H * 0.2 + rand() * H * 0.6,
          r: (1.2 + rand() * 1.6) * u,
        }))
      : [];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {/* Rolling hills */}
        <Path
          d={`M0 ${H} L0 ${H - 120 * u} Q ${W * 0.28} ${H - 160 * u} ${W * 0.55} ${H - 118 * u} T ${W} ${
            H - 130 * u
          } L ${W} ${H} Z`}
          fill={c.scene[0]}
        />
        <Path
          d={`M0 ${H} L0 ${H - 70 * u} Q ${W * 0.4} ${H - 112 * u} ${W * 0.72} ${H - 74 * u} T ${W * 1.2} ${
            H - 80 * u
          } L ${W} ${H} Z`}
          fill={c.scene[1]}
        />
        {fireflies.length ? (
          <Path d={dotsPath(fireflies)} fill={c.sceneAccent[4]} opacity={0.75} />
        ) : null}
      </Svg>

      <View style={[styles.corner, { left: 0, top: 0 }]}>
        <Canopy u={u} c={c} flip={false} />
      </View>
      <View style={[styles.corner, { right: 0, top: 0 }]}>
        <Canopy u={u} c={c} flip />
      </View>

      <Drift loop={sway} rotate={2.5} style={[styles.vine, { left: 0, top: 0 }]}>
        <Vine h={vineH} u={u} stem={c.sceneAccent[3]} leaf={vineLeaf} rib={c.scene[1]} />
      </Drift>
      <Drift loop={sway} rotate={-2} style={[styles.vine, { right: 0, top: 0 }]}>
        <Vine h={vineH * 0.78} u={u} stem={c.sceneAccent[3]} leaf={vineLeaf} rib={c.scene[1]} />
      </Drift>

      {/* Clan friends peeking out of the bushes */}
      <Drift loop={peek} dy={7 * u} style={{ right: 26 * u, top: H - animal * 1.12 }}>
        <SvgXml xml={CLAN_SVGS.monkey} width={animal} height={animal} />
      </Drift>
      <Drift loop={peek} dy={6 * u} style={{ left: 18 * u, top: H - animal * 1.0 }}>
        <SvgXml xml={CLAN_SVGS.tiger} width={animal * 0.86} height={animal * 0.86} />
      </Drift>
      <Svg width={W} height={60 * u} style={[styles.bushes, { top: H - 42 * u }]}>
        {[0, 1].map((side) => {
          const cx = side ? W - 26 * u - animal / 2 : 18 * u + animal * 0.43;
          return (
            <G key={side}>
              <Circle cx={cx - 34 * u} cy={40 * u} r={30 * u} fill={c.sceneAccent[1]} />
              <Circle cx={cx + 34 * u} cy={42 * u} r={28 * u} fill={c.sceneAccent[1]} />
              <Circle cx={cx} cy={34 * u} r={34 * u} fill={c.sceneAccent[0]} />
              <Circle cx={cx - 14 * u} cy={20 * u} r={4 * u} fill={c.sceneAccent[5]} />
              <Circle cx={cx + 18 * u} cy={24 * u} r={3.5 * u} fill={c.sceneAccent[4]} />
            </G>
          );
        })}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  corner: { position: 'absolute' },
  flip: { transform: [{ scaleX: -1 }] },
  vine: { transformOrigin: '50% 0%' },
  bushes: { position: 'absolute', left: 0 },
});
