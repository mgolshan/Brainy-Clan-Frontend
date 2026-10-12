import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { SudokuPayload, SudokuResponse } from '@/api/types';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import { PadKey } from '@/challenges/PadKey';
import type { ChallengeComponentProps } from '@/challenges/registry';
import {
  digitCounts,
  findConflicts,
  flatten,
  hasNote,
  isFull,
  isPeer,
  readGrid,
  toGrid,
  toggleNote,
} from '@/challenges/sudoku/logic';
import { useCellFont } from '@/challenges/useCellFont';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { useRenderCount } from '@/challenges/useRenderCount';
import { CHALLENGE_ROOT_ID, useWebKeys } from '@/challenges/useWebKeys';
import { Button, Chip, PressableScale, Text, useTheme, withAlpha } from '@/ui';

interface SudokuDraft {
  values: number[];
  /** Pencil marks per cell, bit `d` set = note `d`. */
  notes: number[];
}

const OUTER = 2;

/**
 * `sudoku` (4×4, 6×6, 9×9): tap a cell, then a number on the pad sized to the grid. Givens are
 * locked; optional pencil notes; duplicates in a row/column/box are flagged locally (pure rules —
 * the server knows the solution). Work in progress is a draft persisted per session item.
 * Submit is enabled once every cell is filled; after a wrong answer the solution is shown with
 * the differing cells marked.
 */
export function Sudoku({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<SudokuPayload, SudokuResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const { size, box, grid } = item.payload;
  const cellCount = size * size;

  const givens = useMemo(() => flatten(grid), [grid]);
  const initial = useMemo<SudokuDraft>(
    () => ({ values: givens, notes: new Array<number>(cellCount).fill(0) }),
    [givens, cellCount],
  );
  const isDraft = useCallback(
    (v: unknown): v is SudokuDraft => {
      const d = v as SudokuDraft | null;
      return (
        typeof d === 'object' &&
        d !== null &&
        Array.isArray(d.values) &&
        Array.isArray(d.notes) &&
        d.values.length === cellCount &&
        d.notes.length === cellCount &&
        d.values.every(
          (x, i) => Number.isInteger(x) && x >= 0 && x <= size && (!givens[i] || x === givens[i]),
        )
      );
    },
    [cellCount, size, givens],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('sudoku', item.id),
    initial,
    isDraft,
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [width, onLayout] = useMeasuredWidth();

  // Scored: the draft is no longer needed (the screen shows the submitted grid).
  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const submitted = useMemo(
    () => (result ? readGrid(result.submitted, size) : pending ? readGrid(pending, size) : null),
    [result, pending, size],
  );
  const solution = useMemo(
    () => (result && !result.isCorrect ? readGrid(result.correctResponse, size) : null),
    [result, size],
  );
  const locked = !!disabled || !!pending || !!result;
  const values = useMemo(
    () => (submitted ? flatten(submitted) : draft.values),
    [submitted, draft.values],
  );
  const solutionValues = useMemo(() => (solution ? flatten(solution) : null), [solution]);
  const showSolution = !!solutionValues && !showMine;
  const shown = showSolution && solutionValues ? solutionValues : values;
  const conflicts = useMemo(
    () => (result ? new Set<number>() : findConflicts(values, size, box)),
    [result, values, size, box],
  );
  const counts = useMemo(() => digitCounts(values, size), [values, size]);
  const full = isFull(values);

  const input = useCallback(
    (digit: number) => {
      if (locked || selected === null || givens[selected]) return;
      const at = selected;
      setDraft((prev) => {
        const nextValues = [...prev.values];
        const nextNotes = [...prev.notes];
        if (notesMode && digit) {
          if (nextValues[at]) return prev;
          nextNotes[at] = toggleNote(nextNotes[at], digit);
          return { values: nextValues, notes: nextNotes };
        }
        const value = digit && nextValues[at] !== digit ? digit : 0;
        nextValues[at] = value;
        nextNotes[at] = 0;
        if (value) {
          // A placed digit can't be a note in the same row, column or box any more.
          for (let j = 0; j < cellCount; j++) {
            if (j !== at && isPeer(j, at, size, box)) nextNotes[j] &= ~(1 << value);
          }
        }
        return { values: nextValues, notes: nextNotes };
      });
    },
    [locked, selected, givens, setDraft, notesMode, cellCount, size, box],
  );

  const submit = useCallback(() => {
    if (locked || !full) return;
    setSelected(null);
    onSubmit({ grid: toGrid(values, size) });
  }, [locked, full, onSubmit, values, size]);

  useWebKeys((key) => {
    if (/^[1-9]$/.test(key) && Number(key) <= size) {
      input(Number(key));
      return true;
    }
    if (key === 'Backspace' || key === 'Delete' || key === '0') {
      input(0);
      return true;
    }
    if (key === 'n' || key === 'N') {
      setNotesMode((m) => !m);
      return true;
    }
    if (key === 'Enter') {
      submit();
      return true;
    }
    const move: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (move[key]) {
      const cur = selected ?? 0;
      const r = Math.min(size - 1, Math.max(0, Math.floor(cur / size) + move[key][0]));
      const col = Math.min(size - 1, Math.max(0, (cur % size) + move[key][1]));
      setSelected(r * size + col);
      return true;
    }
    return false;
  }, !locked);

  // Layout: square cells from the measured width, capped so a 4×4 doesn't get huge.
  const cell = width
    ? Math.floor(Math.min((width - OUTER * 2) / size, theme.touchTarget * 1.5))
    : 0;
  const gridSize = cell * size + OUTER * 2;
  const thin = StyleSheet.hairlineWidth > 0.5 ? 1 : StyleSheet.hairlineWidth * 2;
  const thick = 2;
  const cellFont = useCellFont();
  const digitSize = cellFont(cell, 0.56, 0.78);
  const selectedValue = selected !== null ? values[selected] : 0;
  // Playful's primary (coral) is too close to its danger red for digits: use the blue there.
  const entered = theme.key === 'playful' ? c.secondary : c.primary;

  // Pad: one row when keys stay comfortably big, otherwise two rows.
  const gap = theme.spacing.xs;
  const oneRowKey = (width - gap * (size - 1)) / size;
  const perRow = oneRowKey >= theme.touchTarget * 0.8 ? size : Math.ceil(size / 2);
  const keyWidth = Math.floor(
    Math.min((width - gap * (perRow - 1)) / perRow, theme.touchTarget * 1.4),
  );

  const statusText = result
    ? null
    : conflicts.size > 0
      ? t('challenge.sudoku.clash')
      : full
        ? t('challenge.sudoku.ready')
        : t('challenge.sudoku.fillAll');

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.sudoku.title', { size })}
        </Text>
        <Text variant="caption" tone="muted">
          {t('challenge.sudoku.rules', { size })}
        </Text>
      </View>

      {cell > 0 ? (
        <View
          accessibilityLabel={t('challenge.sudoku.title', { size })}
          style={[
            styles.grid,
            {
              width: gridSize,
              borderWidth: OUTER,
              borderColor: result
                ? result.isCorrect
                  ? c.success
                  : c.danger
                : theme.key === 'classic'
                  ? c.text
                  : c.borderStrong,
              borderRadius: theme.key === 'classic' ? theme.radius.sm : theme.radius.md,
              backgroundColor: c.surface,
            },
          ]}>
          {Array.from({ length: size }, (_, r) => (
            <View key={r} style={styles.row}>
              {Array.from({ length: size }, (_, col) => {
                const i = r * size + col;
                const value = shown[i];
                const given = givens[i] > 0;
                const conflict = conflicts.has(i);
                const isSelected = selected === i && !locked;
                const fixed = !!(showSolution && solutionValues && values[i] !== solutionValues[i]);
                const peer = selected !== null && !locked && isPeer(i, selected, size, box);
                const sameDigit = !locked && selectedValue > 0 && values[i] === selectedValue;
                const bg = fixed
                  ? c.successSoft
                  : isSelected
                    ? withAlpha(c.primary, 0.3)
                    : conflict
                      ? c.dangerSoft
                      : sameDigit
                        ? withAlpha(c.primary, 0.18)
                        : peer
                          ? withAlpha(c.primary, 0.07)
                          : given
                            ? c.surfaceAlt
                            : c.surface;
                const color = fixed ? c.success : conflict ? c.danger : given ? c.text : entered;
                const notes = !value && !result ? draft.notes[i] : 0;
                const label = t('challenge.sudoku.cell', {
                  row: r + 1,
                  col: col + 1,
                  value: value ? String(value) : t('challenge.sudoku.empty'),
                });
                return (
                  <SudokuCell
                    key={col}
                    index={i}
                    value={value}
                    given={given}
                    notes={notes}
                    wrongDigit={fixed ? values[i] : 0}
                    background={bg}
                    color={color}
                    selected={isSelected}
                    locked={locked}
                    label={given ? `${label}, ${t('challenge.sudoku.given')}` : label}
                    cell={cell}
                    digitSize={digitSize}
                    borderColor={c.border}
                    rightColor={(col + 1) % box[1] === 0 ? c.borderStrong : c.border}
                    bottomColor={(r + 1) % box[0] === 0 ? c.borderStrong : c.border}
                    rightWidth={col === size - 1 ? 0 : (col + 1) % box[1] === 0 ? thick : thin}
                    bottomWidth={r === size - 1 ? 0 : (r + 1) % box[0] === 0 ? thick : thin}
                    size={size}
                    box={box}
                    onSelect={setSelected}
                  />
                );
              })}
            </View>
          ))}
        </View>
      ) : null}

      {solutionValues ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="caption" tone="muted">
            {showMine ? t('challenge.sudoku.mineHint') : t('challenge.sudoku.solutionHint')}
          </Text>
          <View style={[styles.wrap, { gap: theme.spacing.xs }]}>
            <Chip
              label={t('challenge.sudoku.showSolution')}
              selected={!showMine}
              onPress={() => setShowMine(false)}
            />
            <Chip
              label={t('challenge.sudoku.showMine')}
              selected={showMine}
              onPress={() => setShowMine(true)}
            />
          </View>
        </View>
      ) : null}

      {!result && width > 0 ? (
        <>
          <View style={[styles.wrap, styles.center, { gap }]}>
            {Array.from({ length: size }, (_, k) => k + 1).map((d) => (
              <PadKey
                key={d}
                label={String(d)}
                width={keyWidth}
                height={Math.max(theme.touchTarget, Math.min(keyWidth, theme.touchTarget * 1.2))}
                tone={counts[d] >= size ? 'faded' : 'default'}
                disabled={locked || selected === null || givens[selected] > 0}
                onPress={() => input(d)}
                accessibilityLabel={
                  notesMode ? t('challenge.sudoku.noteDigit', { digit: d }) : String(d)
                }
              />
            ))}
          </View>
          <View style={[styles.wrap, styles.center, { gap: theme.spacing.sm }]}>
            <Chip
              label={notesMode ? t('challenge.sudoku.notesOn') : t('challenge.sudoku.notesOff')}
              icon="pencil"
              selected={notesMode}
              onPress={() => setNotesMode((m) => !m)}
            />
            <Chip
              label={t('challenge.sudoku.erase')}
              icon="backspace-outline"
              onPress={() => input(0)}
            />
          </View>
          {statusText ? (
            <Text
              variant="caption"
              tone={conflicts.size > 0 ? 'danger' : 'muted'}
              align="center"
              accessibilityLiveRegion="polite">
              {statusText}
            </Text>
          ) : null}
          <Button
            title={t('challenge.check')}
            icon="checkmark-circle-outline"
            size="lg"
            disabled={locked || !full}
            loading={!!pending && !result}
            onPress={submit}
          />
        </>
      ) : null}
    </View>
  );
}

interface SudokuCellProps {
  index: number;
  value: number;
  given: boolean;
  notes: number;
  /** The member's digit where it differed from the solution (shown struck through), else 0. */
  wrongDigit: number;
  background: string;
  color: string;
  selected: boolean;
  locked: boolean;
  label: string;
  cell: number;
  digitSize: number;
  borderColor: string;
  rightColor: string;
  bottomColor: string;
  rightWidth: number;
  bottomWidth: number;
  size: number;
  box: [number, number];
  onSelect: (index: number) => void;
}

/**
 * One grid cell. Memoized on primitive props so tapping a cell only re-renders the cells whose
 * look changes (old/new selection, their peers and same-digit cells), not all 81 of a 9×9.
 */
const SudokuCell = memo(function SudokuCell({
  index,
  value,
  given,
  notes,
  wrongDigit,
  background,
  color,
  selected,
  locked,
  label,
  cell,
  digitSize,
  borderColor,
  rightColor,
  bottomColor,
  rightWidth,
  bottomWidth,
  size,
  box,
  onSelect,
}: SudokuCellProps) {
  const theme = useTheme();
  useRenderCount('SudokuCell');
  const onPress = useCallback(() => onSelect(index), [onSelect, index]);
  return (
    <PressableScale
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: locked || given }}
      style={[
        styles.cell,
        {
          width: cell,
          height: cell,
          backgroundColor: background,
          borderColor,
          borderRightColor: rightColor,
          borderBottomColor: bottomColor,
          borderRightWidth: rightWidth,
          borderBottomWidth: bottomWidth,
        },
      ]}>
      {value ? (
        <Text
          weight={given ? 'bold' : 'medium'}
          color={color}
          maxFontSizeMultiplier={1}
          style={{ fontSize: digitSize, lineHeight: Math.round(digitSize * 1.2) }}>
          {value}
        </Text>
      ) : notes ? (
        <NoteMarks mask={notes} size={size} box={box} cell={cell} />
      ) : null}
      {wrongDigit ? (
        <Text
          color={theme.colors.danger}
          maxFontSizeMultiplier={1}
          style={[styles.wrongMark, { fontSize: Math.max(8, Math.round(cell * 0.26)) }]}>
          {wrongDigit}
        </Text>
      ) : null}
    </PressableScale>
  );
});

/** Pencil marks laid out like the box (2×2, 2×3 or 3×3 mini grid). */
function NoteMarks({
  mask,
  size,
  box,
  cell,
}: {
  mask: number;
  size: number;
  box: [number, number];
  cell: number;
}) {
  const theme = useTheme();
  const cols = box[1];
  const rows = Math.ceil(size / cols);
  const fontSize = Math.max(7, Math.floor((cell / Math.max(rows, cols)) * 0.75));
  return (
    <View style={[styles.notes, { width: cell - 2, height: cell - 2 }]}>
      {Array.from({ length: size }, (_, k) => k + 1).map((d) => (
        <View key={d} style={{ width: `${100 / cols}%`, height: `${100 / rows}%` }}>
          {hasNote(mask, d) ? (
            <Text
              tone="muted"
              align="center"
              maxFontSizeMultiplier={1}
              style={{
                fontSize,
                lineHeight: Math.round(fontSize * 1.15),
                color: theme.colors.textMuted,
              }}>
              {d}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { alignSelf: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  center: { justifyContent: 'center' },
  notes: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' },
  wrongMark: { position: 'absolute', top: 1, left: 3, textDecorationLine: 'line-through' },
});
