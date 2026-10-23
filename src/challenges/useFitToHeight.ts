import { useWindowDimensions } from 'react-native';

import { fitCellToHeight, useTheme } from '@/ui';

/** Smallest board cell the landscape fit may shrink to (still readable and tappable with care). */
const MIN_CELL = 36;

/**
 * Board cell size that also fits the window **height** in landscape (iPad sideways, wide desktop
 * windows): the board plus the play header, title, pad and buttons stay on one screen. Portrait
 * and phones keep the width-based size. `rows` is the number of cell rows of the board.
 */
export function useFitToHeight(cell: number, rows: number): number {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  return fitCellToHeight({
    cell,
    count: rows,
    windowWidth: width,
    windowHeight: height,
    // Play header, card padding, title, pad, Notes/Erase, hint and the Check button: about 550 pt
    // with the default touch target (measured on web at 1366×1024, Sudoku 6×6, playful).
    reservedHeight: theme.touchTarget * 6 + 260,
    minCell: MIN_CELL,
  });
}
