/**
 * Responsive layout tokens and pure helpers (iPhone, iPad portrait/landscape, desktop web).
 * Content sits in a centered column: ~640 for reading screens (forms, lists, settings), ~900 for
 * grids and boards. Touch targets and type scale never change with the screen size; only the
 * column width, grid columns and board sizes do. Decisions are made from the window size
 * (`useWindowDimensions`), never from the device type.
 */

export interface ThemeLayout {
  /** Max content width of reading screens (forms, lists, settings, text). */
  readingWidth: number;
  /** Max content width of grid and board screens (category tiles, Sudoku, word search). */
  wideWidth: number;
}

export const LAYOUT: ThemeLayout = { readingWidth: 640, wideWidth: 900 };

/** `reading` (default) and `wide` are centered columns; `full` uses the whole width. */
export type ContentWidth = 'reading' | 'wide' | 'full';

/** Max width of the content column for a variant (`undefined` = no limit). */
export function maxContentWidth(
  variant: ContentWidth,
  layout: ThemeLayout = LAYOUT,
): number | undefined {
  if (variant === 'wide') return layout.wideWidth;
  if (variant === 'full') return undefined;
  return layout.readingWidth;
}

/**
 * Width actually available for content in a window: the column width (capped by the variant)
 * minus the horizontal padding on both sides.
 */
export function contentWidth(
  windowWidth: number,
  variant: ContentWidth,
  horizontalPadding: number,
  layout: ThemeLayout = LAYOUT,
): number {
  const max = maxContentWidth(variant, layout);
  const column = max === undefined ? windowWidth : Math.min(windowWidth, max);
  return Math.max(0, column - horizontalPadding * 2);
}

/**
 * How many equal tiles fit in a row: as many as keep each tile at least `minTile` wide
 * (with `gap` between them), between 1 and `maxColumns`.
 */
export function gridColumns(
  available: number,
  minTile: number,
  gap: number,
  maxColumns = 4,
): number {
  if (available <= 0 || minTile <= 0) return 1;
  const fit = Math.floor((available + gap) / (minTile + gap));
  return Math.max(1, Math.min(maxColumns, fit));
}

/**
 * Cell size of a square board (`count` cells per side) so it also fits the **height** in
 * landscape: when the window is wider than tall, the board may take at most the window height
 * minus `reservedHeight` (header, pad, buttons). Portrait keeps the width-based `cell` (the page
 * scrolls if needed). Never below `minCell`, never above the width-based `cell`.
 */
export function fitCellToHeight({
  cell,
  count,
  windowWidth,
  windowHeight,
  reservedHeight,
  minCell,
}: {
  cell: number;
  count: number;
  windowWidth: number;
  windowHeight: number;
  reservedHeight: number;
  minCell: number;
}): number {
  if (cell <= 0 || count <= 0 || windowWidth <= windowHeight) return cell;
  const byHeight = Math.floor((windowHeight - reservedHeight) / count);
  return Math.max(Math.min(minCell, cell), Math.min(cell, byHeight));
}
