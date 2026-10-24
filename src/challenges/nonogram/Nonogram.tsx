import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { NonogramPayload, NonogramResponse } from '@/api/types';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import {
  EMPTY,
  FILLED,
  MARKED,
  longestClue,
  normalizeClue,
  readNonogramGrid,
  readNonogramTitle,
  satisfiedLines,
  toResponseGrid,
  toggleCell,
} from '@/challenges/nonogram/logic';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useCellFont } from '@/challenges/useCellFont';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { useScreenReaderEnabled } from '@/challenges/useScreenReader';
import { Button, Celebration, Chip, Text, fitCellToHeight, useTheme, withAlpha } from '@/ui';

interface Draft {
  cells: number[];
}

/** Smallest cell: 10×10 stays tappable; narrower screens scroll the board sideways. */
const MIN_CELL = 28;
const OUTER = 2;

/** Web: no text selection or page scroll while dragging across the grid. */
const webNoSelect =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as unknown as ViewStyle)
    : null;

type Mode = 'fill' | 'mark';

/**
 * `nonogram`: fill cells so every row and column matches its clue (the run lengths, in order).
 * Tap to fill, long-press (or the ✕ mode) to mark a cell as empty — marks are local notes only.
 * Drag along a row or column to paint several cells. A clue fades once its line matches (a pure
 * local check; the server verifies the grid). Check submits `{ grid }`; after scoring the
 * solution picture and its name are shown. With a screen reader every cell is a button
 * ("Row 2, column 3, filled") and the clues are read as text.
 */
export function Nonogram({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<NonogramPayload, NonogramResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const payload = item.payload;
  const { rows, cols, row_clues: rowClues, col_clues: colClues } = payload;
  const count = rows * cols;

  const initial = useMemo<Draft>(() => ({ cells: new Array<number>(count).fill(EMPTY) }), [count]);
  const isDraft = useCallback(
    (v: unknown): v is Draft => {
      const d = v as Draft | null;
      return (
        typeof d === 'object' &&
        d !== null &&
        Array.isArray(d.cells) &&
        d.cells.length === count &&
        d.cells.every((x) => x === EMPTY || x === FILLED || x === MARKED)
      );
    },
    [count],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('nonogram', item.id),
    initial,
    isDraft,
  );
  const [mode, setMode] = useState<Mode>('fill');
  const [width, onLayout] = useMeasuredWidth();
  const win = useWindowDimensions();
  const screenReader = useScreenReaderEnabled();
  const cellFont = useCellFont();

  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const locked = !!disabled || !!pending || !!result;
  const submitted = useMemo(
    () =>
      result
        ? readNonogramGrid(result.submitted, rows, cols)
        : pending
          ? readNonogramGrid(pending, rows, cols)
          : null,
    [result, pending, rows, cols],
  );
  const solution = useMemo(
    () => (result ? readNonogramGrid(result.correctResponse, rows, cols) : null),
    [result, rows, cols],
  );
  const title = result ? readNonogramTitle(result.correctResponse) : null;
  // After scoring the solved picture is shown (the member's grid when the server sent none).
  const cells = solution ?? submitted ?? draft.cells;
  const mine = submitted ?? draft.cells;
  const lines = useMemo(() => satisfiedLines(cells, payload), [cells, payload]);
  const doneCount = lines.rows.filter(Boolean).length + lines.cols.filter(Boolean).length;
  const filledCount = mine.filter((v) => v === FILLED).length;

  // --- layout: clue font is fixed per theme/text size; cells fill the rest of the width.
  const clueFont = Math.max(11, cellFont(32, 0.44, 0.6));
  const clueGap = Math.round(clueFont * 0.45);
  const rowClueWidth = Math.ceil(longestClue(rowClues) * (clueFont * 0.62 + clueGap) + clueGap * 2);
  const colClueHeight = Math.ceil(longestClue(colClues) * clueFont * 1.2 + clueGap * 2);
  const byWidth = width
    ? Math.floor(Math.min((width - rowClueWidth - OUTER * 2) / cols, theme.touchTarget * 1.2))
    : 0;
  const cell = width
    ? Math.max(
        MIN_CELL,
        fitCellToHeight({
          cell: byWidth,
          count: rows,
          windowWidth: win.width,
          windowHeight: win.height,
          reservedHeight: theme.touchTarget * 5 + 220 + colClueHeight,
          minCell: MIN_CELL,
        }),
      )
    : 0;
  const boardWidth = rowClueWidth + cell * cols + OUTER * 2;
  const scrolls = width > 0 && boardWidth > width;

  // --- input
  const setCells = useCallback(
    (indices: number[], next: number) => {
      setDraft((d) => {
        if (indices.every((i) => d.cells[i] === next)) return d;
        const copy = [...d.cells];
        for (const i of indices) copy[i] = next;
        return { cells: copy };
      });
    },
    [setDraft],
  );
  const toggle = useCallback(
    (index: number, how: Mode) => {
      if (locked) return;
      setDraft((d) => {
        const copy = [...d.cells];
        copy[index] = toggleCell(copy[index], how);
        return { cells: copy };
      });
    },
    [locked, setDraft],
  );
  const pressCell = useCallback((index: number) => toggle(index, mode), [toggle, mode]);
  const longPressCell = useCallback((index: number) => toggle(index, 'mark'), [toggle]);

  const cellAt = (x: number, y: number): number => {
    const r = Math.min(rows - 1, Math.max(0, Math.floor(y / (cell || 1))));
    const col = Math.min(cols - 1, Math.max(0, Math.floor(x / (cell || 1))));
    return r * cols + col;
  };
  /** Painting along the row or column of the first cell (the drag's main direction). */
  const [paint, setPaint] = useState<{ start: number; target: number } | null>(null);
  const paintTo = (p: { start: number; target: number } | null, x: number, y: number) => {
    if (!p) return;
    const end = cellAt(x, y);
    const [r0, c0] = [Math.floor(p.start / cols), p.start % cols];
    const [r1, c1] = [Math.floor(end / cols), end % cols];
    const indices: number[] = [];
    if (Math.abs(c1 - c0) >= Math.abs(r1 - r0)) {
      for (let col = Math.min(c0, c1); col <= Math.max(c0, c1); col++)
        indices.push(r0 * cols + col);
    } else {
      for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) indices.push(r * cols + c0);
    }
    setCells(indices, p.target);
  };

  const enabled = !locked && cell > 0 && !screenReader;
  /**
   * The current stroke: its first cell and the state it paints. Until the state set in onStart
   * has re-rendered, it is derived from the event and the (same-render) draft, which agree.
   */
  const stroke = (e: { x: number; y: number; translationX: number; translationY: number }) => {
    if (paint) return paint;
    const start = cellAt(e.x - e.translationX, e.y - e.translationY);
    return { start, target: toggleCell(draft.cells[start], mode) };
  };
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .enabled(enabled)
    .minDistance(6)
    .shouldCancelWhenOutside(false)
    .onStart((e) => {
      const next = stroke(e);
      setPaint(next);
      paintTo(next, e.x, e.y);
    })
    .onUpdate((e) => paintTo(stroke(e), e.x, e.y))
    .onFinalize((e) => {
      paintTo(stroke(e), e.x, e.y);
      setPaint(null);
    });
  const longPressGesture = Gesture.LongPress()
    .runOnJS(true)
    .enabled(enabled)
    .minDuration(380)
    .onStart((e) => longPressCell(cellAt(e.x, e.y)));
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .enabled(enabled)
    .maxDistance(6)
    .onEnd((e, success) => {
      if (success) pressCell(cellAt(e.x, e.y));
    });
  const gesture = Gesture.Race(panGesture, Gesture.Exclusive(longPressGesture, tapGesture));

  const submit = () => {
    if (locked) return;
    onSubmit({ grid: toResponseGrid(draft.cells, rows, cols) });
  };

  // --- colors
  const ink = theme.key === 'classic' ? c.text : theme.vibe === 'kid' ? c.secondary : c.primary;
  const fillColor = result ? (result.isCorrect ? c.success : ink) : ink;
  const lineColor = c.border;
  const majorColor = theme.key === 'classic' ? c.text : c.borderStrong;
  const thin = StyleSheet.hairlineWidth > 0.5 ? 1 : StyleSheet.hairlineWidth * 2;

  const clueColor = (done: boolean) => (done && !result ? c.textSubtle : c.text);
  const clueText = (clue: readonly number[]) => {
    const runs = normalizeClue(clue);
    return runs.length ? runs : [0];
  };

  const status = result
    ? null
    : doneCount === rows + cols
      ? t('challenge.nonogram.allMatch')
      : t('challenge.nonogram.progress', { done: doneCount, total: rows + cols });

  const board =
    cell > 0 ? (
      <View style={{ width: boardWidth }}>
        {/* Column clues, bottom-aligned above each column. */}
        <View style={[styles.row, { paddingLeft: rowClueWidth + OUTER }]}>
          {colClues.map((clue, col) => {
            const done = lines.cols[col];
            return (
              <View
                key={col}
                accessible
                accessibilityLabel={t('challenge.nonogram.colClue', {
                  col: col + 1,
                  clue: clueText(clue).join(' '),
                  state: done ? t('challenge.nonogram.lineDone') : '',
                })}
                style={[
                  styles.colClue,
                  {
                    width: cell,
                    height: colClueHeight,
                    paddingBottom: clueGap,
                    backgroundColor: col % 2 ? withAlpha(c.surfaceAlt, 0.6) : undefined,
                    borderTopLeftRadius: theme.radius.sm,
                    borderTopRightRadius: theme.radius.sm,
                  },
                ]}>
                {clueText(clue).map((n, k) => (
                  <Text
                    key={k}
                    weight="bold"
                    color={clueColor(done)}
                    maxFontSizeMultiplier={1}
                    style={[
                      { fontSize: clueFont, lineHeight: Math.round(clueFont * 1.2) },
                      done && !result ? styles.doneClue : null,
                    ]}>
                    {n}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
        <View style={styles.row}>
          {/* Row clues, right-aligned left of each row. */}
          <View style={{ width: rowClueWidth, paddingTop: OUTER }}>
            {rowClues.map((clue, r) => {
              const done = lines.rows[r];
              return (
                <View
                  key={r}
                  accessible
                  accessibilityLabel={t('challenge.nonogram.rowClue', {
                    row: r + 1,
                    clue: clueText(clue).join(' '),
                    state: done ? t('challenge.nonogram.lineDone') : '',
                  })}
                  style={[
                    styles.rowClue,
                    {
                      height: cell,
                      gap: clueGap,
                      paddingRight: clueGap,
                      backgroundColor: r % 2 ? withAlpha(c.surfaceAlt, 0.6) : undefined,
                      borderTopLeftRadius: theme.radius.sm,
                      borderBottomLeftRadius: theme.radius.sm,
                    },
                  ]}>
                  {clueText(clue).map((n, k) => (
                    <Text
                      key={k}
                      weight="bold"
                      color={clueColor(done)}
                      maxFontSizeMultiplier={1}
                      style={[
                        { fontSize: clueFont, lineHeight: Math.round(clueFont * 1.2) },
                        done && !result ? styles.doneClue : null,
                      ]}>
                      {n}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
          <View
            style={{
              borderWidth: OUTER,
              borderColor: result ? (result.isCorrect ? c.success : c.danger) : majorColor,
              borderRadius: theme.radius.sm,
              backgroundColor: c.surface,
              overflow: 'hidden',
            }}>
            <GestureDetector gesture={gesture}>
              <View style={[webNoSelect, { width: cell * cols, height: cell * rows }]}>
                <View
                  pointerEvents={screenReader ? 'box-none' : 'none'}
                  style={StyleSheet.absoluteFill}>
                  {Array.from({ length: rows }, (_, r) => (
                    <View key={r} style={styles.row}>
                      {Array.from({ length: cols }, (_, col) => {
                        const i = r * cols + col;
                        const state = cells[i];
                        // After a wrong answer: where the member's grid differed from the picture.
                        const differs =
                          !!result &&
                          !result.isCorrect &&
                          !!solution &&
                          (mine[i] === FILLED) !== (solution[i] === FILLED);
                        return (
                          <NonogramCell
                            key={col}
                            index={i}
                            state={state}
                            label={t('challenge.nonogram.cell', {
                              row: r + 1,
                              col: col + 1,
                              state: t(
                                state === FILLED
                                  ? 'challenge.nonogram.filled'
                                  : state === MARKED
                                    ? 'challenge.nonogram.marked'
                                    : 'challenge.nonogram.empty',
                              ),
                            })}
                            hint={
                              mode === 'fill'
                                ? t('challenge.nonogram.cellHintFill')
                                : t('challenge.nonogram.cellHintMark')
                            }
                            size={cell}
                            fill={fillColor}
                            markColor={c.textMuted}
                            background={differs ? c.dangerSoft : c.surface}
                            borderColor={lineColor}
                            rightColor={(col + 1) % 5 === 0 ? majorColor : lineColor}
                            bottomColor={(r + 1) % 5 === 0 ? majorColor : lineColor}
                            rightWidth={col === cols - 1 ? 0 : (col + 1) % 5 === 0 ? 2 : thin}
                            bottomWidth={r === rows - 1 ? 0 : (r + 1) % 5 === 0 ? 2 : thin}
                            locked={locked}
                            onPress={pressCell}
                            onLongPress={longPressCell}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </GestureDetector>
          </View>
        </View>
      </View>
    ) : null;

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.nonogram.title', { rows, cols })}
        </Text>
        {!result ? (
          <Text variant="caption" tone="muted">
            {t('challenge.nonogram.rules')}
          </Text>
        ) : null}
      </View>

      {result ? (
        <View style={[styles.reveal, { gap: theme.spacing.sm }]}>
          {result.isCorrect ? <Celebration size={72} /> : null}
          <View style={styles.flex}>
            <Text variant="heading" accessibilityLiveRegion="polite">
              {title
                ? t('challenge.nonogram.pictureTitle', { title })
                : result.isCorrect
                  ? t('challenge.nonogram.solved')
                  : t('challenge.nonogram.solutionHint')}
            </Text>
            {!result.isCorrect && title ? (
              <Text variant="caption" tone="muted">
                {t('challenge.nonogram.solutionHint')}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {scrolls ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          accessibilityHint={t('challenge.nonogram.scrollHint')}>
          {board}
        </ScrollView>
      ) : (
        <View style={styles.center}>{board}</View>
      )}

      {!result && width > 0 ? (
        <>
          <View style={[styles.wrap, styles.centerRow, { gap: theme.spacing.sm }]}>
            <Chip
              label={t('challenge.nonogram.modeFill')}
              icon="square"
              selected={mode === 'fill'}
              onPress={() => setMode('fill')}
            />
            <Chip
              label={t('challenge.nonogram.modeMark')}
              icon="close"
              selected={mode === 'mark'}
              onPress={() => setMode('mark')}
            />
            <Chip
              label={t('challenge.nonogram.clear')}
              icon="refresh"
              onPress={() => {
                if (!locked) setDraft(initial);
              }}
            />
          </View>
          {status ? (
            <Text variant="caption" tone="muted" align="center" accessibilityLiveRegion="polite">
              {status}
            </Text>
          ) : null}
          <Button
            title={t('challenge.check')}
            icon="checkmark-circle-outline"
            size="lg"
            disabled={locked || filledCount === 0}
            loading={!!pending && !result}
            onPress={submit}
          />
        </>
      ) : null}
    </View>
  );
}

interface CellProps {
  index: number;
  state: number;
  label: string;
  hint: string;
  size: number;
  fill: string;
  markColor: string;
  background: string;
  borderColor: string;
  rightColor: string;
  bottomColor: string;
  rightWidth: number;
  bottomWidth: number;
  locked: boolean;
  onPress: (index: number) => void;
  onLongPress: (index: number) => void;
}

/**
 * One cell. Visually inert while playing with touch (the grid handles taps, long-presses and
 * drags); with a screen reader or the keyboard on web it is a button. Memoized on primitives so a
 * tap re-renders only the changed cell.
 */
const NonogramCell = memo(function NonogramCell({
  index,
  state,
  label,
  hint,
  size,
  fill,
  markColor,
  background,
  borderColor,
  rightColor,
  bottomColor,
  rightWidth,
  bottomWidth,
  locked,
  onPress,
  onLongPress,
}: CellProps) {
  const inset = Math.max(2, Math.round(size * 0.08));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: locked, checked: state === FILLED }}
      disabled={locked}
      onPress={() => onPress(index)}
      onLongPress={() => onLongPress(index)}
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor: background,
          borderColor,
          borderRightColor: rightColor,
          borderBottomColor: bottomColor,
          borderRightWidth: rightWidth,
          borderBottomWidth: bottomWidth,
        },
      ]}>
      {state === FILLED ? (
        <View
          style={[
            styles.filled,
            { top: inset - 1, left: inset - 1, right: inset - 1, bottom: inset - 1 },
            { backgroundColor: fill, borderRadius: Math.max(2, size * 0.12) },
          ]}
        />
      ) : state === MARKED ? (
        <Text
          color={markColor}
          weight="bold"
          maxFontSizeMultiplier={1}
          style={{ fontSize: size * 0.5, lineHeight: Math.round(size * 0.6) }}>
          ✕
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  colClue: { alignItems: 'center', justifyContent: 'flex-end' },
  rowClue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  doneClue: { opacity: 0.6 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  filled: { position: 'absolute' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  centerRow: { justifyContent: 'center' },
  center: { alignItems: 'center' },
  reveal: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 4 },
});
