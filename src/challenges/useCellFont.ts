import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';

import { useTheme } from '@/ui';

/** Same cap as `Text`'s `maxFontSizeMultiplier` for the OS font scale. */
const MAX_OS_SCALE = 1.4;

/**
 * Font size for a letter or digit inside a fixed-size box (grid cell, tile, key). Follows the
 * member text scale and the OS font size, but never grows past `cap` × the box, so a 9×9 grid
 * still fits a 360 dp screen. Render the text with `maxFontSizeMultiplier={1}` (the OS scale is
 * already included here).
 */
export function useCellFont(): (box: number, ratio: number, cap?: number) => number {
  const { textScale } = useTheme();
  const { fontScale } = useWindowDimensions();
  const scale = textScale * Math.min(MAX_OS_SCALE, Math.max(1, fontScale || 1));
  return useCallback(
    (box: number, ratio: number, cap = 0.72) =>
      Math.max(1, Math.round(Math.min(box * ratio * scale, box * cap))),
    [scale],
  );
}
