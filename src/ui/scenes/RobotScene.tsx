import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

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

/** A gear outline with `teeth` teeth and a hole, centered in a `size` box. */
function gearPath(size: number, teeth: number): string {
  const c = size / 2;
  const ro = size / 2;
  const ri = ro * 0.78;
  const step = (Math.PI * 2) / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [ri, a - step * 0.3],
      [ro, a - step * 0.18],
      [ro, a + step * 0.18],
      [ri, a + step * 0.3],
    ];
    for (const [r, t] of pts) {
      d += `${d ? 'L' : 'M'}${(c + Math.cos(t) * r).toFixed(1)} ${(c + Math.sin(t) * r).toFixed(1)} `;
    }
  }
  const h = ro * 0.3;
  return `${d}Z M${c - h} ${c} a${h} ${h} 0 1 0 ${2 * h} 0 a${h} ${h} 0 1 0 ${-2 * h} 0 Z`;
}

function Gear({ size, teeth, color }: { size: number; teeth: number; color: string }) {
  return (
    <Svg width={size} height={size}>
      <Path d={gearPath(size, teeth)} fill={color} fillRule="evenodd" />
    </Svg>
  );
}

/** A friendly round robot head peeking up: visor with happy eyes, ear bolts, antenna. */
function Robot({
  size,
  body,
  trim,
  visor,
  eye,
  cheek,
}: {
  size: number;
  body: string;
  trim: string;
  visor: string;
  eye: string;
  cheek: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 22 V8" stroke={trim} strokeWidth={3} strokeLinecap="round" />
      <Rect x={6} y={44} width={10} height={20} rx={4} fill={trim} />
      <Rect x={84} y={44} width={10} height={20} rx={4} fill={trim} />
      <Rect
        x={14}
        y={20}
        width={72}
        height={80}
        rx={24}
        fill={body}
        stroke={trim}
        strokeWidth={3}
      />
      <Rect x={24} y={34} width={52} height={32} rx={14} fill={visor} />
      <Path
        d="M34 54 Q 39 46 44 54 M56 54 Q 61 46 66 54"
        stroke={eye}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={30} cy={74} r={4} fill={cheek} opacity={0.7} />
      <Circle cx={70} cy={74} r={4} fill={cheek} opacity={0.7} />
      <Path
        d="M42 76 Q 50 82 58 76"
        stroke={trim}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x={40} y={88} width={20} height={6} rx={3} fill={trim} opacity={0.5} />
    </Svg>
  );
}

/** A little hovering helper drone: a round body with a propeller, one big friendly eye. */
function Drone({
  size,
  body,
  trim,
  visor,
  eye,
  accent,
}: {
  size: number;
  body: string;
  trim: string;
  visor: string;
  eye: string;
  accent: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Path d="M30 14 V6 M16 6 H44" stroke={trim} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={30} cy={6} r={3} fill={accent} />
      <Path d="M8 34 L2 40 M52 34 L58 40" stroke={trim} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={30} cy={33} r={20} fill={body} stroke={trim} strokeWidth={2.5} />
      <Rect x={17} y={24} width={26} height={16} rx={8} fill={visor} />
      <Circle cx={30} cy={32} r={4.5} fill={eye} />
      <Circle cx={31.5} cy={30.5} r={1.4} fill={body} />
      <Path
        d="M24 46 Q 30 49 36 46"
        stroke={trim}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Robot Lab: a blueprint grid, teal circuit traces with solder pads along both edges, two meshed
 * gears turning in the top corner (a seamless cycle: one tooth per turn), a lab bench, and a
 * friendly robot peeking up on the right whose antenna light blinks while it bobs, and a little
 * helper drone hovering on the left (loop 1, which also pulses the signals on the traces). Light = a bright clean lab; dark = after hours, glowing.
 */
export const RobotScene = memo(function RobotScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const id = useSvgId();
  const pulse = useLoop(2200, animated);
  const spin = useCycle(2600, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;

  const bench = 70 * u;
  const cell = 26 * u;
  let grid = '';
  for (let x = cell; x < W; x += cell) grid += `M${x.toFixed(1)} 0 V${H} `;
  for (let y = cell; y < H; y += cell) grid += `M0 ${y.toFixed(1)} H${W} `;

  // Circuit traces: short runs with 45° bends from both edges, ending in pads.
  const rand = seeded(57);
  const traces: string[] = [];
  const pads: { x: number; y: number; r: number }[] = [];
  const signals: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const left = i % 2 === 0;
    const y0 = (110 + i * ((H / u - 300) / 6) + rand() * 30) * u;
    const run = (14 + rand() * 22) * u;
    const rise = (10 + rand() * 16) * u * (rand() > 0.5 ? 1 : -1);
    const run2 = (8 + rand() * 18) * u;
    const sx = left ? -2 : W + 2;
    const dir = left ? 1 : -1;
    const x1 = sx + dir * run;
    const x2 = x1 + dir * Math.abs(rise);
    const x3 = x2 + dir * run2;
    traces.push(`M${sx} ${y0} H${x1} L${x2} ${y0 + rise} H${x3}`);
    pads.push({ x: x3, y: y0 + rise, r: 3.6 * u });
    signals.push({ x: x1, y: y0, r: 2.4 * u });
  }

  const gearA = 86 * u;
  const gearB = 60 * u;
  const robotSize = 86 * u;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('haze')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.scene[3]} stopOpacity={1} />
            <Stop offset="1" stopColor={c.scene[3]} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={W} height={H * 0.5} fill={`url(#${id('haze')})`} />
        <Path d={grid} stroke={acc[2]} strokeWidth={0.6} opacity={dark ? 0.35 : 0.4} />
        <Path
          d={traces.join(' ')}
          stroke={acc[0]}
          strokeWidth={2.2 * u}
          strokeLinejoin="round"
          fill="none"
          opacity={dark ? 0.85 : 0.75}
        />
        <Path d={dotsPath(pads)} fill={c.background} stroke={acc[0]} strokeWidth={1.8 * u} />
        {/* bench */}
        <Rect x={0} y={H - bench} width={W} height={bench} fill={c.scene[1]} />
        <Rect x={0} y={H - bench} width={W} height={5 * u} fill={acc[2]} opacity={0.7} />
        <Path
          d={`M${W * 0.1} ${H - bench + 22 * u} h${34 * u} M${W * 0.1} ${H - bench + 32 * u} h${22 * u}`}
          stroke={acc[1]}
          strokeWidth={3 * u}
          strokeLinecap="round"
          opacity={0.7}
        />
      </Svg>

      {/* Signals blinking at the trace bends */}
      <Drift loop={pulse} fade={0.85} style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          <Path d={dotsPath(signals)} fill={acc[1]} />
        </Svg>
      </Drift>

      {/* Two meshed gears turning in the top-right corner */}
      <Drift loop={spin} rotate={360 / 10} style={{ right: -gearA * 0.36, top: 56 * u }}>
        <Gear size={gearA} teeth={10} color={acc[2]} />
      </Drift>
      <Drift
        loop={spin}
        rotate={-360 / 8}
        style={{
          right: gearA * 0.14 - gearB * 0.5,
          top: 56 * u + gearA * 0.5 + 0.45 * (gearA + gearB) - gearB * 0.5,
        }}>
        <Gear size={gearB} teeth={8} color={acc[1]} />
      </Drift>
      <Drift loop={spin} rotate={-360 / 8} style={{ left: -26 * u, top: H * 0.52 }}>
        <Gear size={52 * u} teeth={8} color={acc[3]} />
      </Drift>

      {/* A helper drone hovering on the left */}
      <Drift loop={pulse} dy={10 * u} style={{ left: 8 * u, top: H * 0.62 }}>
        <Drone
          size={50 * u}
          body={acc[4]}
          trim={acc[3]}
          visor={dark ? c.background : c.borderStrong}
          eye={acc[5]}
          accent={acc[1]}
        />
      </Drift>

      {/* The friendly robot peeking up behind the bench (right) */}
      <Drift
        loop={pulse}
        dy={-6 * u}
        style={{ right: 12 * u, top: H - bench * 0.5 - robotSize * 0.72 }}>
        <Robot
          size={robotSize}
          body={acc[4]}
          trim={acc[3]}
          visor={dark ? c.background : c.borderStrong}
          eye={acc[5]}
          cheek={acc[1]}
        />
        <Drift loop={pulse} fade={0.8} style={{ left: robotSize * 0.43, top: 0 }}>
          <Svg width={robotSize * 0.14} height={robotSize * 0.14}>
            <G>
              <Circle
                cx={robotSize * 0.07}
                cy={robotSize * 0.07}
                r={robotSize * 0.06}
                fill={acc[1]}
              />
            </G>
          </Svg>
        </Drift>
      </Drift>
      <Svg width={W} height={bench * 0.5} style={[styles.front, { top: H - bench * 0.5 }]}>
        <Rect width={W} height={bench * 0.5} fill={c.scene[2]} />
        <Rect width={W} height={2 * u} fill={acc[2]} opacity={0.6} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  front: { position: 'absolute', left: 0 },
});
