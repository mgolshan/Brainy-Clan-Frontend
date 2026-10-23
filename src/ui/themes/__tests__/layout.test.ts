import {
  LAYOUT,
  contentWidth,
  fitCellToHeight,
  gridColumns,
  maxContentWidth,
} from '@/ui/themes/layout';

describe('maxContentWidth', () => {
  it('uses the theme widths per variant', () => {
    expect(maxContentWidth('reading')).toBe(640);
    expect(maxContentWidth('wide')).toBe(900);
    expect(maxContentWidth('full')).toBeUndefined();
    expect(maxContentWidth('wide', { readingWidth: 500, wideWidth: 700 })).toBe(700);
    expect(LAYOUT).toEqual({ readingWidth: 640, wideWidth: 900 });
  });
});

describe('contentWidth', () => {
  it('is the window minus padding on phones', () => {
    expect(contentWidth(390, 'reading', 24)).toBe(342);
    expect(contentWidth(390, 'wide', 24)).toBe(342);
  });

  it('is capped by the column on iPad portrait and landscape', () => {
    expect(contentWidth(1024, 'reading', 24)).toBe(592);
    expect(contentWidth(1024, 'wide', 24)).toBe(852);
    expect(contentWidth(1366, 'wide', 24)).toBe(852);
    expect(contentWidth(1366, 'full', 24)).toBe(1318);
  });

  it('never goes negative', () => {
    expect(contentWidth(20, 'reading', 24)).toBe(0);
  });
});

describe('gridColumns', () => {
  it('gives 2 columns on phones and up to 4 on iPad', () => {
    expect(gridColumns(342, 150, 12)).toBe(2);
    expect(gridColumns(280, 150, 12)).toBe(1);
    expect(gridColumns(592, 150, 12)).toBe(3);
    expect(gridColumns(852, 150, 12)).toBe(4);
    expect(gridColumns(852, 150, 12, 3)).toBe(3);
  });

  it('falls back to one column for empty input', () => {
    expect(gridColumns(0, 150, 12)).toBe(1);
    expect(gridColumns(500, 0, 12)).toBe(1);
  });
});

describe('fitCellToHeight', () => {
  const base = { reservedHeight: 440, minCell: 28 };
  const fit = (cell: number, count: number, windowWidth: number, windowHeight: number) =>
    fitCellToHeight({ ...base, cell, count, windowWidth, windowHeight });

  it('keeps the width-based cell in portrait', () => {
    expect(fit(72, 9, 1024, 1366)).toBe(72);
    expect(fit(38, 9, 390, 844)).toBe(38);
  });

  it('shrinks the board to the height in landscape', () => {
    // iPad 13" landscape: (1024 - 440) / 9 = 64.
    expect(fit(72, 9, 1366, 1024)).toBe(64);
    // iPad 11" landscape: (834 - 440) / 9 = 43.
    expect(fit(72, 9, 1194, 834)).toBe(43);
  });

  it('never grows the cell and never goes below the minimum', () => {
    expect(fit(40, 4, 1366, 1024)).toBe(40);
    expect(fit(72, 9, 900, 500)).toBe(28);
    expect(fit(20, 9, 900, 500)).toBe(20);
  });

  it('passes 0 (not measured yet) through', () => {
    expect(fit(0, 9, 1366, 1024)).toBe(0);
  });
});
