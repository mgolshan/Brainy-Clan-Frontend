import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { GridCell, WordPlacement, WordSearchPayload, WordSearchResponse } from '@/api/types';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useCellFont } from '@/challenges/useCellFont';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { useScreenReaderEnabled } from '@/challenges/useScreenReader';
import {
  isPlacement,
  lineCells,
  matchSelection,
  normalizeWord,
  readFound,
  snapToLine,
} from '@/challenges/words/logic';
import { Button, Text, useTheme, withAlpha } from '@/ui';

interface Draft {
  found: WordPlacement[];
}

const sameCell = (a: GridCell, b: GridCell) => a[0] === b[0] && a[1] === b[1];

/** Web: no text selection or page scroll while dragging across the grid. */
const webNoSelect =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as unknown as ViewStyle)
    : null;

/** Rounded band over the cells from `start` to `end` (any of the 8 directions). */
function Band({
  start,
  end,
  cell,
  color,
  dashed,
}: {
  start: GridCell;
  end: GridCell;
  cell: number;
  color: string;
  dashed?: boolean;
}) {
  const dr = end[0] - start[0];
  const dc = end[1] - start[1];
  const thickness = cell * 0.78;
  const length = Math.hypot(dr, dc) * cell + thickness;
  const cx = ((start[1] + end[1]) / 2 + 0.5) * cell;
  const cy = ((start[0] + end[0]) / 2 + 0.5) * cell;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.band,
        {
          left: cx - length / 2,
          top: cy - thickness / 2,
          width: length,
          height: thickness,
          borderRadius: thickness / 2,
          backgroundColor: withAlpha(color, dashed ? 0.12 : 0.3),
          borderColor: withAlpha(color, 0.85),
          borderStyle: dashed ? 'dashed' : 'solid',
          transform: [{ rotate: `${Math.atan2(dr, dc)}rad` }],
        },
      ]}
    />
  );
}

/**
 * One letter. Visually inert while dragging (the grid handles the gestures); with a screen reader
 * (or the keyboard on web) it is a button: choose the first letter, then the last letter.
 */
const LetterCell = memo(function LetterCell({
  row,
  col,
  letter,
  label,
  hint,
  selected,
  locked,
  size,
  fontSize,
  onPress,
}: {
  row: number;
  col: number;
  letter: string;
  label: string;
  hint: string;
  selected: boolean;
  locked: boolean;
  size: number;
  fontSize: number;
  onPress: (row: number, col: number) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected, disabled: locked }}
      disabled={locked}
      onPress={() => onPress(row, col)}
      style={[styles.cell, { width: size, height: size }]}>
      <Text
        weight="bold"
        maxFontSizeMultiplier={1}
        style={{ fontSize, lineHeight: Math.round(fontSize * 1.2) }}>
        {letter}
      </Text>
    </Pressable>
  );
});

/**
 * `word_search`: find every listed word in the letter grid (8 directions). Drag from the first
 * to the last letter, or tap the first and then the last letter. Found words are banded in the
 * grid and struck through in the list; the work is a draft persisted per session item. Submits
 * `{ found }` automatically when every word is found, or with "Give up". With a screen reader every
 * letter is a button ("Row 2, column 3, K"): choose the first and then the last letter of a word.
 */
export function WordSearch({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<WordSearchPayload, WordSearchResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const { grid, words } = item.payload;
  const rows = grid.length;
  const cols = grid[0].length;

  const initial = useMemo<Draft>(() => ({ found: [] }), []);
  const isDraft = useCallback(
    (v: unknown): v is Draft =>
      typeof v === 'object' &&
      v !== null &&
      Array.isArray((v as Draft).found) &&
      (v as Draft).found.every(isPlacement),
    [],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('word_search', item.id),
    initial,
    isDraft,
  );
  const [selection, setSelection] = useState<{ start: GridCell; end: GridCell } | null>(null);
  const [tapStart, setTapStart] = useState<GridCell | null>(null);
  const [miss, setMiss] = useState(false);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [width, onLayout] = useMeasuredWidth();
  const [lastFound, setLastFound] = useState<string | null>(null);
  const screenReader = useScreenReaderEnabled();
  const cellFont = useCellFont();

  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const locked = !!disabled || !!pending || !!result;
  const found = result ? readFound(result.submitted) : pending ? readFound(pending) : draft.found;
  const solution = result && !result.isCorrect ? readFound(result.correctResponse) : [];
  const foundWords = new Set(found.map((f) => normalizeWord(f.word)));
  const remaining = words.filter((w) => !foundWords.has(normalizeWord(w)));
  const missed = solution.filter((p) => !foundWords.has(normalizeWord(p.word)));
  const colorOf = (word: string) => {
    const i = words.findIndex((w) => normalizeWord(w) === normalizeWord(word));
    return c.categories[(i < 0 ? 0 : i) % c.categories.length];
  };

  const cell = width ? Math.floor(Math.min((width - 4) / cols, theme.touchTarget)) : 0;

  // Every word found → submit (the last band shows briefly first).
  const allFound = !result && !pending && remaining.length === 0;
  useEffect(() => {
    if (!allFound || disabled) return;
    const timer = setTimeout(() => onSubmit({ found: draft.found }), 450);
    return () => clearTimeout(timer);
  }, [allFound, disabled, onSubmit, draft.found]);

  useEffect(() => {
    if (!miss) return;
    const timer = setTimeout(() => setMiss(false), 600);
    return () => clearTimeout(timer);
  }, [miss]);

  const tryMatch = (a: GridCell, b: GridCell) => {
    const match = matchSelection(grid, a, b, remaining);
    if (match) {
      setDraft((d) => ({ found: [...d.found, match] }));
      setLastFound(match.word);
    } else {
      setLastFound(null);
      setMiss(true);
    }
  };

  const cellAt = (x: number, y: number): GridCell => [
    Math.min(rows - 1, Math.max(0, Math.floor(y / (cell || 1)))),
    Math.min(cols - 1, Math.max(0, Math.floor(x / (cell || 1)))),
  ];
  /** Start and (snapped) end cell of a pan, from its current point and translation. */
  const span = (e: { x: number; y: number; translationX: number; translationY: number }) => {
    const start = cellAt(e.x - e.translationX, e.y - e.translationY);
    return { start, end: snapToLine(start, cellAt(e.x, e.y), rows, cols) };
  };

  // Drag from the first to the last letter, or tap the first and then the last letter. Every
  // callback derives the cells from the event itself, so no gesture state is kept.
  const tap = (at: GridCell) => {
    if (tapStart && !sameCell(tapStart, at)) {
      // Second tap: from the first letter to this one, snapped to a straight line.
      setTapStart(null);
      tryMatch(tapStart, snapToLine(tapStart, at, rows, cols));
    } else {
      setLastFound(null);
      setTapStart(tapStart ? null : at);
    }
  };

  // Screen reader / keyboard: the exact cells chosen, no snapping (a crooked pair is a miss).
  const pressRef = useRef<(at: GridCell) => void>(() => {});
  useLayoutEffect(() => {
    pressRef.current = (at) => {
      if (locked) return;
      if (tapStart && !sameCell(tapStart, at)) {
        setTapStart(null);
        tryMatch(tapStart, at);
      } else {
        setLastFound(null);
        setTapStart(tapStart ? null : at);
      }
    };
  });
  const pressCell = useCallback((row: number, col: number) => pressRef.current([row, col]), []);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .enabled(!locked && cell > 0 && !screenReader)
    .minDistance(4)
    .shouldCancelWhenOutside(false)
    .onStart((e) => setSelection(span(e)))
    .onUpdate((e) => {
      const next = span(e);
      setSelection((prev) =>
        prev && sameCell(prev.start, next.start) && sameCell(prev.end, next.end) ? prev : next,
      );
    })
    .onFinalize((e, success) => {
      setSelection(null);
      if (!success) return;
      const { start, end } = span(e);
      setTapStart(null);
      if (sameCell(start, end)) tap(start);
      else tryMatch(start, end);
    });
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .enabled(!locked && cell > 0 && !screenReader)
    .onEnd((e, success) => {
      if (success) tap(cellAt(e.x, e.y));
    });
  const gesture = Gesture.Race(panGesture, tapGesture);

  const fontSize = cellFont(cell, 0.5);

  // Words (found, or shown as missed) running through each cell, for the cell labels.
  const wordsAt = new Map<string, string[]>();
  for (const p of [...found, ...missed]) {
    for (const [r, col] of lineCells(p.start, p.end) ?? []) {
      const key = `${r}:${col}`;
      wordsAt.set(key, [...(wordsAt.get(key) ?? []), normalizeWord(p.word)]);
    }
  }

  const status = miss
    ? t('challenge.word.notAWord')
    : confirmGiveUp
      ? t('challenge.word.giveUpHint')
      : tapStart
        ? t('challenge.word.firstChosen', {
            letter: normalizeWord(grid[tapStart[0]]?.[tapStart[1]] ?? ''),
          })
        : lastFound
          ? t('challenge.word.foundAnnounce', {
              word: normalizeWord(lastFound),
              found: found.length,
              total: words.length,
            })
          : t('challenge.word.progress', { found: found.length, total: words.length });
  const announce = !result && (miss || !!tapStart || !!lastFound) ? status : null;

  // iOS has no live regions: speak the status changes there (Android and web use the live region).
  useEffect(() => {
    if (announce && screenReader && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(announce);
    }
  }, [announce, screenReader]);

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.word.searchTitle')}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          accessibilityLabel={`${t('challenge.word.searchHelp')} ${t('challenge.word.gridLabel', { rows, cols })}`}>
          {t('challenge.word.searchHelp')}
        </Text>
      </View>

      <View style={[styles.words, { gap: theme.spacing.xs }]}>
        {words.map((w) => {
          const done = foundWords.has(normalizeWord(w));
          const isMissed = !!result && !done;
          const color = colorOf(w);
          return (
            <View
              key={w}
              accessible
              accessibilityLabel={
                done
                  ? t('challenge.word.foundWord', { word: w })
                  : t('challenge.word.toFind', { word: w })
              }
              style={[
                styles.wordChip,
                {
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.sm,
                  backgroundColor: done
                    ? withAlpha(color, 0.25)
                    : isMissed
                      ? c.dangerSoft
                      : c.surfaceAlt,
                  borderColor: done ? color : isMissed ? c.danger : c.border,
                },
              ]}>
              <Text
                variant="label"
                weight="bold"
                color={done ? c.textMuted : isMissed ? c.danger : c.text}
                style={done ? styles.struck : undefined}>
                {normalizeWord(w)}
              </Text>
            </View>
          );
        })}
      </View>

      {cell > 0 ? (
        <View
          style={[
            styles.frame,
            {
              borderColor: miss
                ? c.danger
                : result
                  ? result.isCorrect
                    ? c.success
                    : c.danger
                  : theme.key === 'classic'
                    ? c.borderStrong
                    : c.border,
              borderRadius: theme.radius.md,
              backgroundColor: c.surface,
            },
          ]}>
          <GestureDetector gesture={gesture}>
            <View style={[styles.grid, webNoSelect, { width: cell * cols, height: cell * rows }]}>
              {found.map((f) => (
                <Band
                  key={`f-${f.word}`}
                  start={f.start}
                  end={f.end}
                  cell={cell}
                  color={colorOf(f.word)}
                />
              ))}
              {missed.map((f) => (
                <Band
                  key={`m-${f.word}`}
                  start={f.start}
                  end={f.end}
                  cell={cell}
                  color={c.danger}
                  dashed
                />
              ))}
              {selection ? (
                <Band start={selection.start} end={selection.end} cell={cell} color={c.primary} />
              ) : tapStart ? (
                <Band start={tapStart} end={tapStart} cell={cell} color={c.primary} />
              ) : null}
              <View
                pointerEvents={screenReader ? 'box-none' : 'none'}
                style={StyleSheet.absoluteFill}>
                {grid.map((row, r) => (
                  <View key={r} style={styles.row} pointerEvents="box-none">
                    {row.map((letter, col) => {
                      const shown = normalizeWord(letter);
                      const inWords = wordsAt.get(`${r}:${col}`);
                      const position = { row: r + 1, col: col + 1, letter: shown };
                      return (
                        <LetterCell
                          key={col}
                          row={r}
                          col={col}
                          letter={shown}
                          label={
                            inWords
                              ? t('challenge.word.cellInWord', {
                                  ...position,
                                  words: inWords.join(', '),
                                })
                              : t('challenge.word.cell', position)
                          }
                          hint={locked ? '' : t('challenge.word.cellHint')}
                          selected={!!tapStart && sameCell(tapStart, [r, col])}
                          locked={locked}
                          size={cell}
                          fontSize={fontSize}
                          onPress={pressCell}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </GestureDetector>
        </View>
      ) : null}

      {!result ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text
            variant="caption"
            tone={miss || confirmGiveUp ? 'danger' : 'muted'}
            align="center"
            accessibilityLiveRegion="polite">
            {status}
          </Text>
          <Button
            title={confirmGiveUp ? t('challenge.word.giveUpConfirm') : t('challenge.word.giveUp')}
            icon="flag-outline"
            variant={confirmGiveUp ? 'danger' : 'ghost'}
            disabled={locked}
            loading={!!pending}
            onPress={() => {
              if (!confirmGiveUp) {
                setConfirmGiveUp(true);
                return;
              }
              onSubmit({ found: draft.found });
            }}
          />
        </View>
      ) : missed.length > 0 ? (
        <Text variant="caption" tone="muted">
          {t('challenge.word.missedHint')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  wordChip: { borderWidth: 1.5, paddingVertical: 4 },
  struck: { textDecorationLine: 'line-through' },
  frame: { alignSelf: 'center', borderWidth: 2, overflow: 'hidden' },
  grid: { overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', borderWidth: 2 },
});
