import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Width of a container (0 until laid out), for grids and pads sized to the available space. */
export function useMeasuredWidth(): [number, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    setWidth((prev) => (prev === next ? prev : next));
  }, []);
  return [width, onLayout];
}
