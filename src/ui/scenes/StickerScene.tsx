import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import {
  Drift,
  dotsPath,
  sceneUnit,
  sparklePath,
  useLoop,
  type SceneProps,
} from '@/ui/scenes/shared';

type Shape = 'star' | 'heart' | 'bolt' | 'smiley' | 'flower' | 'bubble' | 'arrow' | 'circle';

function starPath(r: number, inner = 0.48): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)} `;
  }
  return `${d}Z`;
}

/** The outline of a sticker shape centered on 0,0 with "radius" r. */
function shapePath(shape: Shape, r: number): string {
  switch (shape) {
    case 'star':
      return starPath(r);
    case 'heart':
      return `M0 ${r * 0.85} C ${-r * 1.3} ${r * 0.05} ${-r * 0.75} ${-r * 0.95} 0 ${-r * 0.38} C ${r * 0.75} ${
        -r * 0.95
      } ${r * 1.3} ${r * 0.05} 0 ${r * 0.85} Z`;
    case 'bolt':
      return `M${r * 0.2} ${-r} L${-r * 0.6} ${r * 0.1} L${-r * 0.02} ${r * 0.1} L${-r * 0.25} ${r} L${r * 0.62} ${
        -r * 0.18
      } L${r * 0.05} ${-r * 0.18} Z`;
    case 'bubble':
      return `M${-r} ${-r * 0.6} Q ${-r} ${-r * 0.85} ${-r * 0.7} ${-r * 0.85} L${r * 0.7} ${-r * 0.85} Q ${r} ${
        -r * 0.85
      } ${r} ${-r * 0.6} L${r} ${r * 0.25} Q ${r} ${r * 0.5} ${r * 0.7} ${r * 0.5} L${-r * 0.1} ${r * 0.5} L${
        -r * 0.5
      } ${r * 0.9} L${-r * 0.4} ${r * 0.5} L${-r * 0.7} ${r * 0.5} Q ${-r} ${r * 0.5} ${-r} ${r * 0.25} Z`;
    case 'arrow':
      return `M${-r} ${-r * 0.28} L${r * 0.15} ${-r * 0.28} L${r * 0.15} ${-r * 0.7} L${r} 0 L${r * 0.15} ${
        r * 0.7
      } L${r * 0.15} ${r * 0.28} L${-r} ${r * 0.28} Z`;
    case 'flower': {
      let d = '';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const x = Math.cos(a) * r * 0.55;
        const y = Math.sin(a) * r * 0.55;
        const pr = r * 0.45;
        d += `M${(x - pr).toFixed(1)} ${y.toFixed(1)}a${pr} ${pr} 0 1 0 ${2 * pr} 0a${pr} ${pr} 0 1 0 ${-2 * pr} 0`;
      }
      return d;
    }
    case 'smiley':
    case 'circle':
      return `M${-r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  }
}

/**
 * One die-cut sticker: a soft drop shadow, a white die-cut outline, the colored shape and its
 * small print (face, center, shine). Rendered into its own small Svg.
 */
function Sticker({
  shape,
  r,
  color,
  ink,
  cut,
  shadow,
  deg,
  inner,
}: {
  shape: Shape;
  r: number;
  color: string;
  ink: string;
  cut: string;
  shadow: string;
  deg: number;
  inner?: string;
}) {
  const size = r * 2.9;
  const d = shapePath(shape, r);
  let print: ReactNode = null;
  if (shape === 'smiley') {
    print = (
      <>
        <Circle cx={-r * 0.32} cy={-r * 0.2} r={r * 0.11} fill={ink} />
        <Circle cx={r * 0.32} cy={-r * 0.2} r={r * 0.11} fill={ink} />
        <Path
          d={`M${-r * 0.48} ${r * 0.18} Q 0 ${r * 0.72} ${r * 0.48} ${r * 0.18}`}
          stroke={ink}
          strokeWidth={r * 0.12}
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  } else if (shape === 'flower') {
    print = <Circle r={r * 0.36} fill={inner ?? cut} />;
  } else if (shape === 'circle') {
    print = <Path d={starPath(r * 0.55)} fill={inner ?? cut} />;
  } else if (shape === 'bubble') {
    print = (
      <Path
        d={`M${-r * 0.5} ${-r * 0.3} H${r * 0.5} M${-r * 0.5} ${r * 0.05} H${r * 0.2}`}
        stroke={inner ?? cut}
        strokeWidth={r * 0.14}
        strokeLinecap="round"
      />
    );
  }
  return (
    <Svg width={size} height={size}>
      <G transform={`translate(${size / 2} ${size / 2}) rotate(${deg})`}>
        <G transform={`translate(${r * 0.08} ${r * 0.12})`}>
          <Path
            d={d}
            fill={shadow}
            stroke={shadow}
            strokeWidth={r * 0.34}
            strokeLinejoin="round"
            opacity={0.18}
          />
        </G>
        <Path d={d} fill={cut} stroke={cut} strokeWidth={r * 0.3} strokeLinejoin="round" />
        <Path d={d} fill={color} />
        {print}
        <Path
          d={`M${-r * 0.5} ${-r * 0.45} q ${r * 0.15} ${-r * 0.18} ${r * 0.38} ${-r * 0.2}`}
          stroke={cut}
          strokeWidth={r * 0.1}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
        />
      </G>
    </Svg>
  );
}

/** A strip of masking tape (translucent, torn ends). */
function Tape({ w, h, color, deg }: { w: number; h: number; color: string; deg: number }) {
  const z = h / 4;
  return (
    <Svg width={w * 1.2} height={w * 1.2}>
      <G transform={`translate(${w * 0.6} ${w * 0.6}) rotate(${deg})`}>
        <Path
          d={`M${-w / 2} ${-h / 2} L${w / 2} ${-h / 2} l${-z} ${z} l${z} ${z} l${-z} ${z} l${z} ${z} L${-w / 2} ${
            h / 2
          } l${z} ${-z} l${-z} ${-z} l${z} ${-z} Z`}
          fill={color}
          opacity={0.7}
        />
      </G>
    </Svg>
  );
}

interface Placed {
  shape: Shape;
  /** Position as fractions of the screen (edges only), plus offsets in u. */
  fx: number;
  fy: number;
  ox: number;
  oy: number;
  r: number;
  color: number;
  deg: number;
  inner?: number;
  wobble?: boolean;
}

/** Sticker-bomb layout: clusters in the corners, a few on the side edges (never mid-screen). */
const LAYOUT: Placed[] = [
  { shape: 'star', fx: 0, fy: 0, ox: -6, oy: -4, r: 26, color: 2, deg: -14, wobble: true },
  { shape: 'circle', fx: 0, fy: 0, ox: 34, oy: -18, r: 20, color: 1, deg: 0, inner: 2 },
  { shape: 'heart', fx: 1, fy: 0, ox: -44, oy: -10, r: 22, color: 0, deg: 12, wobble: true },
  { shape: 'bolt', fx: 1, fy: 0, ox: -6, oy: 22, r: 22, color: 2, deg: 16 },
  { shape: 'smiley', fx: 0, fy: 0.42, ox: -26, oy: 0, r: 24, color: 3, deg: -8 },
  { shape: 'flower', fx: 1, fy: 0.3, ox: 4, oy: 0, r: 22, color: 5, deg: 0, inner: 2 },
  { shape: 'arrow', fx: 1, fy: 0.62, ox: 6, oy: 0, r: 22, color: 4, deg: 160 },
  { shape: 'bubble', fx: 0, fy: 0.72, ox: -18, oy: 0, r: 24, color: 1, deg: 8 },
  { shape: 'star', fx: 0, fy: 1, ox: 36, oy: -26, r: 20, color: 0, deg: 18 },
  { shape: 'heart', fx: 0, fy: 1, ox: -2, oy: -44, r: 22, color: 5, deg: -16, wobble: true },
  { shape: 'smiley', fx: 1, fy: 1, ox: -34, oy: -34, r: 26, color: 2, deg: 10 },
  { shape: 'bolt', fx: 1, fy: 1, ox: -84, oy: -20, r: 18, color: 1, deg: -20 },
];

/**
 * Sticker Street: a paper/concrete wall with a few soft paint patches, sticker-bombed at the
 * corners and side edges (stars, hearts, bolts, smileys, flowers, speech bubbles, arrows), tape
 * strips and marker doodles. Restrained motion: three stickers wobble as if peeling (loop 1) and
 * the doodle sparkles blink (loop 2).
 */
export const StickerScene = memo(function StickerScene({
  c,
  scheme,
  width: W,
  height: H,
  animated,
}: SceneProps) {
  const u = sceneUnit(W, H);
  const wobble = useLoop(2600, animated);
  const blink = useLoop(1700, animated);
  const dark = scheme === 'dark';
  const acc = c.sceneAccent;
  const cut = dark ? c.borderStrong : c.surface;
  const ink = dark ? c.background : c.text;
  const tape = dark ? c.textSubtle : c.border;

  const place = (p: Placed) => {
    const size = p.r * u * 2.9;
    // Pull every sticker 8u in from its edge so more of it shows.
    const inset = (p.fx === 0 ? 8 : -8) * u;
    return {
      left: p.fx * W + p.ox * u + inset - size / 2,
      top: p.fy * H + p.oy * u - size / 2,
    };
  };

  const still = LAYOUT.filter((p) => !p.wobble);
  const moving = LAYOUT.filter((p) => p.wobble);
  const sticker = (p: Placed) => (
    <Sticker
      shape={p.shape}
      r={p.r * u}
      color={acc[p.color]}
      ink={ink}
      cut={cut}
      shadow={c.shadow}
      deg={p.deg}
      inner={p.inner !== undefined ? acc[p.inner] : undefined}
    />
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {/* Paper posters pasted on the wall (large layers, contrast-checked). */}
        <G transform={`rotate(-5 ${W * 0.1} ${H * 0.3})`}>
          <Rect x={-30 * u} y={H * 0.16} width={W * 0.5} height={H * 0.24} fill={c.scene[0]} />
          <Path
            d={[0.22, 0.26, 0.3, 0.34].map((f) => `M${-20 * u} ${H * f} H${W * 0.42}`).join(' ')}
            stroke={c.border}
            strokeWidth={1.2 * u}
            opacity={0.7}
          />
        </G>
        <G transform={`rotate(4 ${W * 0.85} ${H * 0.65})`}>
          <Rect x={W * 0.56} y={H * 0.52} width={W * 0.56} height={H * 0.26} fill={c.scene[1]} />
          <Path
            d={dotsPath(
              Array.from({ length: 24 }, (_, i) => ({
                x: W * 0.6 + (i % 6) * 14 * u,
                y: H * 0.56 + Math.floor(i / 6) * 14 * u,
                r: 1.6 * u,
              })),
            )}
            fill={c.border}
          />
        </G>
        {/* Marker doodles near the edges */}
        <G stroke={c.text} strokeWidth={2 * u} fill="none" strokeLinecap="round" opacity={0.28}>
          <Path
            d={`M${10 * u} ${H * 0.58} q ${8 * u} ${-10 * u} ${16 * u} 0 t ${16 * u} 0 t ${16 * u} 0`}
          />
          <Path
            d={`M${W - 16 * u} ${H * 0.16} a ${7 * u} ${7 * u} 0 1 1 ${-1 * u} ${-6 * u} a ${4 * u} ${
              4 * u
            } 0 1 0 ${1 * u} ${3 * u}`}
          />
          <Path
            d={`M${W * 0.5 - 30 * u} ${H - 14 * u} l ${12 * u} ${-8 * u} l ${12 * u} ${8 * u} l ${12 * u} ${-8 * u} l ${
              12 * u
            } ${8 * u}`}
          />
          <Path
            d={`M${W - 22 * u} ${H * 0.82} l ${10 * u} ${10 * u} m 0 ${-10 * u} l ${-10 * u} ${10 * u}`}
          />
        </G>
      </Svg>

      {still.map((p, i) => (
        <View key={i} style={[styles.abs, place(p)]}>
          {sticker(p)}
        </View>
      ))}
      {moving.map((p, i) => (
        <Drift key={`m${i}`} loop={wobble} rotate={i % 2 ? -5 : 5} style={place(p)}>
          {sticker(p)}
        </Drift>
      ))}

      {/* Tape strips holding a few stickers down */}
      <View style={[styles.abs, { left: 6 * u, top: 4 * u }]}>
        <Tape w={40 * u} h={13 * u} color={tape} deg={-38} />
      </View>
      <View style={[styles.abs, { left: W - 70 * u, top: H * 0.3 - 20 * u }]}>
        <Tape w={36 * u} h={12 * u} color={tape} deg={28} />
      </View>
      <View style={[styles.abs, { left: -8 * u, top: H * 0.72 - 30 * u }]}>
        <Tape w={36 * u} h={12 * u} color={tape} deg={-20} />
      </View>

      {/* Doodle sparkles that blink */}
      <Drift loop={blink} fade={0.8} style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          {[
            [W - 18 * u, H * 0.47, 6],
            [16 * u, H * 0.3, 5],
            [W * 0.5 + 44 * u, H - 30 * u, 5],
          ].map(([x, y, r], i) => (
            <G key={i} transform={`translate(${x} ${y})`}>
              <Path d={sparklePath(r * u)} fill={acc[(i * 2) % acc.length]} />
            </G>
          ))}
        </Svg>
      </Drift>
    </View>
  );
});

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
