import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Drift, sceneUnit, useLoop, useSvgId, type SceneProps } from '@/ui/scenes/shared';

function Blob({ id, color, size }: { id: string; color: string; size: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Glass: a soft gradient mesh (violet, cyan, pink light blobs) slowly drifting behind frosted
 * cards. Pre-rendered radial gradients, no real-time blur (cheap on Android); two slow loops.
 */
export const GlassScene = memo(function GlassScene({
  c,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const a = useLoop(11000, animated);
  const b = useLoop(14000, animated);
  const big = Math.max(W, H) * 0.95;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Drift loop={a} dx={40 * u} dy={30 * u} style={{ left: -big * 0.45, top: -big * 0.45 }}>
        <Blob id={id('a')} color={c.scene[0]} size={big} />
      </Drift>
      <Drift loop={b} dx={-36 * u} dy={50 * u} style={{ right: -big * 0.5, top: H * 0.18 }}>
        <Blob id={id('b')} color={c.scene[1]} size={big * 0.85} />
      </Drift>
      <Drift loop={a} dx={-30 * u} dy={-24 * u} style={{ left: -big * 0.2, top: H * 0.62 }}>
        <Blob id={id('c')} color={c.scene[2]} size={big * 0.75} />
      </Drift>
    </View>
  );
});
