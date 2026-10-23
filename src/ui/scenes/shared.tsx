import { useEffect, useId } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ColorScheme, ThemeColors } from '@/ui/themes';

/** What every scene gets. Primitive / stable props only, so `memo` skips re-renders. */
export interface SceneProps {
  /** The theme's color tokens for the active scheme (a stable object from the theme file). */
  c: ThemeColors;
  scheme: ColorScheme;
  width: number;
  height: number;
  /** false = static (reduced motion, play questions, picker thumbnails). */
  animated: boolean;
}

/**
 * Size unit so a scene drawn for a phone also reads as a thumbnail (picker) or on an iPad:
 * shapes are sized in `u` (≈ 1 on a phone).
 */
export function sceneUnit(width: number, height: number): number {
  return Math.max(0.3, Math.min(1.25, Math.min(width, height * 0.8) / 400));
}

/** Deterministic pseudo-random numbers (same scene on every render and every device). */
export function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * One cheap ambient loop: a shared value going 0 → 1 → 0 forever (sine easing). Stays 0 when not
 * animated. Each scene uses at most two.
 */
export function useLoop(duration: number, animated: boolean): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!animated) {
      v.set(0);
      return;
    }
    v.set(withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(v);
  }, [animated, duration, v]);
  return v;
}

/** Linear 0 → 1 loop that restarts (for scrolling grids). */
export function useCycle(duration: number, animated: boolean): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!animated) {
      v.set(0);
      return;
    }
    v.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(v);
  }, [animated, duration, v]);
  return v;
}

/** An absolutely positioned layer moved by a loop value (translate / rotate / opacity). */
export function Drift({
  loop,
  dx = 0,
  dy = 0,
  rotate = 0,
  fade = 0,
  style,
  children,
}: {
  loop: SharedValue<number>;
  dx?: number;
  dy?: number;
  /** Degrees at loop = 1 (around the style's transformOrigin). */
  rotate?: number;
  /** Opacity drop at loop = 1 (twinkle). */
  fade?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const animated = useAnimatedStyle(() => {
    const p = loop.get();
    return {
      opacity: 1 - p * fade,
      transform: [{ translateX: p * dx }, { translateY: p * dy }, { rotate: `${p * rotate}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, style, animated]}>
      {children}
    </Animated.View>
  );
}

/** A pointed leaf path (base at 0,0, tip at 0,-len), to be placed with a transform. */
export function leafPath(len: number, w: number): string {
  return `M0 0 C ${w * 0.62} ${-len * 0.22} ${w * 0.55} ${-len * 0.78} 0 ${-len} C ${-w * 0.55} ${
    -len * 0.78
  } ${-w * 0.62} ${-len * 0.22} 0 0 Z`;
}

/** Four-point sparkle star centered on 0,0. */
export function sparklePath(r: number): string {
  const k = r * 0.28;
  return `M0 ${-r} Q ${k} ${-k} ${r} 0 Q ${k} ${k} 0 ${r} Q ${-k} ${k} ${-r} 0 Q ${-k} ${-k} 0 ${-r} Z`;
}

/** Many small circles in one path (one native node instead of dozens). */
export function dotsPath(dots: { x: number; y: number; r: number }[]): string {
  return dots
    .map(
      ({ x, y, r }) =>
        `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`,
    )
    .join('');
}

/**
 * Unique SVG ids for this scene instance: gradients are referenced by id, and on web every SVG
 * shares one document (several scenes render side by side in the picker and the dev gallery).
 */
export function useSvgId(): (name: string) => string {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (name) => `${name}${base}`;
}
