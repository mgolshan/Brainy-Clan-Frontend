import { memo, useState, type ComponentType } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { CandyScene } from '@/ui/scenes/CandyScene';
import { GlassScene } from '@/ui/scenes/GlassScene';
import { JungleScene } from '@/ui/scenes/JungleScene';
import { NeonScene } from '@/ui/scenes/NeonScene';
import type { SceneProps } from '@/ui/scenes/shared';
import { SpaceScene } from '@/ui/scenes/SpaceScene';
import { useTheme } from '@/ui/ThemeProvider';
import type { SceneKey } from '@/ui/themes';

const SCENES: Record<Exclude<SceneKey, 'none'>, ComponentType<SceneProps>> = {
  candy: CandyScene,
  jungle: JungleScene,
  space: SpaceScene,
  neon: NeonScene,
  glass: GlassScene,
};

export interface SceneViewProps {
  width: number;
  height: number;
  /** Ambient animation (always off with reduced motion). Default true. */
  animated?: boolean;
}

/**
 * The active world's background scene at a fixed size (world picker thumbnails, dev gallery).
 * Decorative: hidden from screen readers, ignores touches.
 */
export function SceneView({ width, height, animated = true }: SceneViewProps) {
  const theme = useTheme();
  if (theme.scene === 'none' || width <= 0 || height <= 0) return null;
  const Scene = SCENES[theme.scene];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip]}>
      <Scene
        c={theme.colors}
        scheme={theme.scheme}
        width={width}
        height={height}
        animated={animated && !theme.reducedMotion}
      />
    </View>
  );
}

/**
 * Full-screen scene behind `Screen` content: measures its container once (the screen minus the
 * tab bar), then draws the world. Memoized: screen state changes never re-render it.
 */
export const SceneBackground = memo(function SceneBackground({
  animated = true,
}: {
  animated?: boolean;
}) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  if (theme.scene === 'none') return null;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const w = Math.round(width);
    const h = Math.round(height);
    if (w !== size.width || h !== size.height) setSize({ width: w, height: h });
  };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <SceneView width={size.width} height={size.height} animated={animated} />
    </View>
  );
});

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
