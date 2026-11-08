import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { CrossMathCell, CrossMathPayload, CrossMathResponse } from '@/api/types';
import {
  blanksOf,
  clearSlot,
  emptyDraft,
  equationState,
  equationsOf,
  isCrossMathDraft,
  operatorGlyph,
  placeTile,
  readFills,
  toFills,
  trackSizes,
  unitFor,
  usedTiles,
  valueGrid,
  type CrossMathDraft,
  type EquationState,
} from '@/challenges/crossmath/logic';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import { HowToPlay } from '@/challenges/HowToPlay';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useCellFont } from '@/challenges/useCellFont';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { CHALLENGE_ROOT_ID } from '@/challenges/useWebKeys';
import {
  Button,
  Celebration,
  Chip,
  PressableScale,
  Text,
  fitCellToHeight,
  useTheme,
  useUiSound,
  withAlpha,
} from '@/ui';

/** Operator tracks are this fraction of a number cell (more room for the numbers). */
const OP_RATIO = 0.56;
const GAP = 3;

type OpName = 'plus' | 'minus' | 'times' | 'divide' | 'equals';
const OP_NAMES: Record<string, OpName> = {
  '+': 'plus',
  '-': 'minus',
  '*': 'times',
  '/': 'divide',
  '=': 'equals',
};

/**
 * `cross_math` (level-up puzzle): a number crossword. Tap a number tile below the grid, then an
 * empty square (or the square first, then the tile); tap a filled square to send its tile back.
 * A row or column whose equation is complete and true gets a soft green highlight and a ✓ on its
 * `=` (a complete but false one shows ≠), computed from the member's own numbers only. Check
 * (enabled once every square is filled) submits `{ fills }`; after a wrong answer the generator's
 * solution is shown, with the squares that differed marked.
 */
export function CrossMath({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<CrossMathPayload, CrossMathResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const sound = useUiSound();
  const payload = item.payload;
  const { rows, cols, cells, bank } = payload;
  const blanks = useMemo(() => blanksOf(payload), [payload]);
  const equations = useMemo(() => equationsOf(payload), [payload]);

  const initial = useMemo(() => emptyDraft(blanks.length), [blanks.length]);
  const isDraft = useCallback(
    (v: unknown): v is CrossMathDraft => isCrossMathDraft(v, blanks.length, bank.length),
    [blanks.length, bank.length],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('cross_math', item.id),
    initial,
    isDraft,
  );
  const [tile, setTile] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [width, onLayout] = useMeasuredWidth();
  const win = useWindowDimensions();
  const cellFont = useCellFont();

  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const locked = !!disabled || !!pending || !!result;
  const placed = draft.placed;
  const used = useMemo(() => usedTiles(placed), [placed]);

  // Values on the board: the member's (draft, or what was sent), then the solution after a miss.
  const submittedGrid = useMemo(
    () =>
      result
        ? readFills(result.submitted, rows, cols)
        : pending
          ? readFills(pending, rows, cols)
          : null,
    [result, pending, rows, cols],
  );
  const solutionGrid = useMemo(
    () => (result && !result.isCorrect ? readFills(result.correctResponse, rows, cols) : null),
    [result, rows, cols],
  );
  const mineGrid = useMemo(() => {
    const base = valueGrid(payload, placed);
    if (!submittedGrid) return base;
    return base.map((row, r) =>
      row.map((v, col) => (cells[r][col] === '?' ? submittedGrid[r][col] : v)),
    );
  }, [payload, placed, submittedGrid, cells]);
  const shownGrid = useMemo(() => {
    if (!solutionGrid) return mineGrid;
    return mineGrid.map((row, r) =>
      row.map((v, col) => (cells[r][col] === '?' ? (solutionGrid[r][col] ?? v) : v)),
    );
  }, [mineGrid, solutionGrid, cells]);

  const states = useMemo(
    () => equations.map((eq) => equationState(eq, shownGrid)),
    [equations, shownGrid],
  );
  const trueCount = states.filter((s) => s === 'true').length;
  const filledCount = placed.filter((p) => p !== null).length;
  const allFilled = filledCount === blanks.length;

  // A little chime when an equation turns true (not on load / after scoring).
  const prevTrue = useRef(trueCount);
  useEffect(() => {
    if (!result && trueCount > prevTrue.current) sound('correct', 1.25);
    prevTrue.current = trueCount;
  }, [trueCount, result, sound]);

  // Per cell: the equations it belongs to (for highlights) and the blank slot index.
  const cellInfo = useMemo(() => {
    const slotAt = new Map<string, number>();
    blanks.forEach(([r, col], k) => slotAt.set(`${r},${col}`, k));
    const lineState = new Map<string, EquationState[]>();
    const equalsState = new Map<string, EquationState>();
    equations.forEach((eq, i) => {
      const add = (r: number, col: number) => {
        const key = `${r},${col}`;
        lineState.set(key, [...(lineState.get(key) ?? []), states[i]]);
      };
      eq.cells.forEach(([r, col]) => add(r, col));
      equalsState.set(`${eq.equals[0]},${eq.equals[1]}`, states[i]);
    });
    return { slotAt, lineState, equalsState };
  }, [blanks, equations, states]);

  // --- input
  const choose = (k: number, mode: 'tile' | 'slot') => {
    if (locked) return;
    if (mode === 'tile') {
      if (used.has(k)) return;
      if (slot !== null) {
        setDraft((d) => ({ placed: placeTile(d.placed, slot, k) }));
        setSlot(null);
        setTile(null);
        sound('tap', 1.12);
        return;
      }
      setTile((cur) => (cur === k ? null : k));
      sound('tap');
      return;
    }
    // A square.
    if (tile !== null) {
      setDraft((d) => ({ placed: placeTile(d.placed, k, tile) }));
      setTile(null);
      setSlot(null);
      sound('tap', 1.12);
    } else if (placed[k] !== null) {
      setDraft((d) => ({ placed: clearSlot(d.placed, k) }));
      setSlot(null);
      sound('tap', 0.89);
    } else {
      setSlot((cur) => (cur === k ? null : k));
    }
  };

  const submit = () => {
    if (locked || !allFilled) return;
    setTile(null);
    setSlot(null);
    onSubmit({ fills: toFills(payload, placed) });
  };

  // --- layout: number tracks 1, operator tracks OP_RATIO; fitted to the height in landscape.
  const byWidth = width
    ? Math.floor(
        Math.min(unitFor(cols, width - GAP * (cols - 1), OP_RATIO), theme.touchTarget * 1.6),
      )
    : 0;
  const rowUnits = Math.ceil(rows / 2) + Math.floor(rows / 2) * OP_RATIO;
  const unit = width
    ? fitCellToHeight({
        cell: byWidth,
        count: rowUnits + 2,
        windowWidth: win.width,
        windowHeight: win.height,
        reservedHeight: theme.touchTarget * 4 + 220,
        minCell: 34,
      })
    : 0;
  const colSizes = trackSizes(cols, unit, OP_RATIO);
  const rowSizes = trackSizes(rows, unit, OP_RATIO);
  const numberFont = (value: number | null) =>
    cellFont(unit, value !== null && value >= 100 ? 0.36 : 0.46, 0.6);
  const opFont = cellFont(unit, 0.42, 0.56);
  const tileSize = unit ? Math.max(theme.touchTarget, Math.min(unit, theme.touchTarget * 1.3)) : 0;

  const radius = theme.key === 'classic' ? theme.radius.sm : theme.radius.md;
  const chunky = theme.surface === 'chunky';
  const filledBg = c.primary;
  const filledFg = c.onPrimary;

  const cellLabel = (r: number, col: number, value: number | null, blank: boolean) =>
    t('challenge.crossmath.cell', {
      row: r + 1,
      col: col + 1,
      value: value === null ? t('challenge.crossmath.empty') : String(value),
    }) + (blank ? `. ${t('challenge.crossmath.blankHint')}` : '');

  const renderCell = (value: CrossMathCell, r: number, col: number) => {
    const w = colSizes[col];
    const h = rowSizes[r];
    const key = `${r},${col}`;
    if (value === null) return <View key={col} style={{ width: w, height: h }} />;
    if (typeof value === 'string' && value !== '?') {
      const eqState = value === '=' ? cellInfo.equalsState.get(key) : undefined;
      const glyph = eqState === 'false' ? '≠' : operatorGlyph(value);
      const tone = eqState === 'true' ? c.success : eqState === 'false' ? c.danger : c.textMuted;
      return (
        <View
          key={col}
          accessible
          accessibilityLabel={t(`challenge.crossmath.ops.${OP_NAMES[value]}`)}
          style={[styles.center, { width: w, height: h }]}>
          {eqState === 'true' ? (
            <View
              style={[
                styles.okDot,
                {
                  width: Math.min(w, h) * 0.86,
                  height: Math.min(w, h) * 0.86,
                  borderRadius: Math.min(w, h),
                  backgroundColor: withAlpha(c.success, 0.18),
                },
              ]}
            />
          ) : null}
          <Text
            weight="bold"
            color={tone}
            maxFontSizeMultiplier={1}
            style={{ fontSize: opFont, lineHeight: Math.round(opFont * 1.2) }}>
            {glyph}
          </Text>
        </View>
      );
    }
    const states = cellInfo.lineState.get(key) ?? [];
    const inTrue = states.includes('true');
    const shown = shownGrid[r][col];
    if (value === '?') {
      const k = cellInfo.slotAt.get(key) ?? -1;
      const mine = mineGrid[r][col];
      const wrongHere = !!solutionGrid && mine !== null && mine !== shown;
      return (
        <BlankCell
          key={col}
          slot={k}
          width={w}
          height={h}
          value={shown}
          mine={wrongHere ? mine : null}
          selected={slot === k}
          inTrue={inTrue && !solutionGrid}
          tone={result ? (result.isCorrect ? 'right' : wrongHere ? 'wrong' : 'plain') : 'plain'}
          fontSize={numberFont(shown)}
          radius={radius}
          label={cellLabel(r, col, shown, !locked)}
          locked={locked}
          onPress={(s) => choose(s, 'slot')}
        />
      );
    }
    return (
      <View
        key={col}
        accessible
        accessibilityLabel={cellLabel(r, col, value, false)}
        style={[
          styles.center,
          {
            width: w,
            height: h,
            borderRadius: radius,
            backgroundColor: inTrue ? withAlpha(c.success, 0.16) : c.surfaceAlt,
            borderWidth: theme.surface === 'outlined' ? 1.5 : 1,
            borderColor: inTrue ? withAlpha(c.success, 0.55) : c.border,
          },
        ]}>
        <Text
          weight="bold"
          maxFontSizeMultiplier={1}
          style={{ fontSize: numberFont(value), lineHeight: Math.round(numberFont(value) * 1.2) }}>
          {value}
        </Text>
      </View>
    );
  };

  const status = result
    ? null
    : t('challenge.crossmath.progress', { done: trueCount, total: equations.length });

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.crossmath.title')}
        </Text>
        <Text variant="caption" tone="muted">
          {result
            ? result.isCorrect
              ? t('challenge.crossmath.solved')
              : t('challenge.crossmath.solutionHint')
            : t('challenge.crossmath.rules')}
        </Text>
      </View>

      <HowToPlay
        game="cross_math"
        hidden={!!result}
        steps={[
          { icon: 'hand-left-outline', text: t('challenge.crossmath.how1') },
          { icon: 'grid-outline', text: t('challenge.crossmath.how2') },
          { icon: 'checkmark-circle-outline', text: t('challenge.crossmath.how3') },
        ]}
      />

      {result?.isCorrect ? (
        <View style={styles.centerRow}>
          <Celebration size={72} />
        </View>
      ) : null}

      {unit > 0 ? (
        <View style={[styles.board, { gap: GAP }]}>
          {cells.map((row, r) => (
            <View key={r} style={[styles.row, { gap: GAP }]}>
              {row.map((value, col) => renderCell(value, r, col))}
            </View>
          ))}
        </View>
      ) : null}

      {!result && tileSize > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="caption" tone="muted" align="center">
            {tile !== null
              ? t('challenge.crossmath.pickSquare', { value: bank[tile] })
              : slot !== null
                ? t('challenge.crossmath.pickTile')
                : t('challenge.crossmath.tilesLabel')}
          </Text>
          <View style={[styles.bank, { gap: theme.spacing.xs }]}>
            {bank.map((value, k) => {
              const isUsed = used.has(k);
              const selected = tile === k;
              return (
                <PressableScale
                  key={k}
                  haptic
                  disabled={locked || isUsed}
                  onPress={() => choose(k, 'tile')}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isUsed
                      ? t('challenge.crossmath.tileUsed', { value })
                      : t('challenge.crossmath.tile', { value })
                  }
                  accessibilityState={{ selected, disabled: locked || isUsed }}
                  style={[
                    styles.center,
                    {
                      width: tileSize,
                      height: tileSize,
                      borderRadius: radius,
                      backgroundColor: isUsed ? 'transparent' : selected ? c.secondary : filledBg,
                      borderWidth: isUsed ? 1.5 : selected ? 3 : chunky ? 2 : 1,
                      borderBottomWidth: isUsed ? 1.5 : chunky && !selected ? 5 : selected ? 3 : 1,
                      borderStyle: isUsed ? 'dashed' : 'solid',
                      borderColor: isUsed ? c.border : selected ? c.text : c.primaryPressed,
                      transform:
                        selected && !theme.reducedMotion ? [{ translateY: -4 }] : undefined,
                    },
                  ]}>
                  {!isUsed ? (
                    <Text
                      weight="bold"
                      color={selected ? c.onSecondary : filledFg}
                      maxFontSizeMultiplier={1}
                      style={{
                        fontSize: cellFont(tileSize, value >= 100 ? 0.34 : 0.44, 0.56),
                        lineHeight: Math.round(cellFont(tileSize, 0.44, 0.56) * 1.2),
                      }}>
                      {value}
                    </Text>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        </View>
      ) : null}

      {status ? (
        <Text variant="caption" tone="muted" align="center" accessibilityLiveRegion="polite">
          {status}
        </Text>
      ) : null}

      {!result && width > 0 ? (
        <>
          <View style={styles.centerRow}>
            <Chip
              label={t('challenge.crossmath.clear')}
              icon="refresh"
              onPress={() => {
                if (locked) return;
                setDraft(initial);
                setTile(null);
                setSlot(null);
              }}
            />
          </View>
          <Button
            title={t('challenge.check')}
            icon="checkmark-circle-outline"
            size="lg"
            disabled={locked || !allFilled}
            loading={!!pending && !result}
            onPress={submit}
          />
        </>
      ) : null}
    </View>
  );
}

interface BlankProps {
  slot: number;
  width: number;
  height: number;
  value: number | null;
  /** After a wrong answer: the member's different number (shown small, struck through). */
  mine: number | null;
  selected: boolean;
  inTrue: boolean;
  tone: 'plain' | 'right' | 'wrong';
  fontSize: number;
  radius: number;
  label: string;
  locked: boolean;
  onPress: (slot: number) => void;
}

/** A square to fill: dashed when empty, a number tile when filled. */
const BlankCell = memo(function BlankCell({
  slot,
  width,
  height,
  value,
  mine,
  selected,
  inTrue,
  tone,
  fontSize,
  radius,
  label,
  locked,
  onPress,
}: BlankProps) {
  const theme = useTheme();
  const c = theme.colors;
  const empty = value === null;
  const bg =
    tone === 'wrong'
      ? c.dangerSoft
      : tone === 'right'
        ? c.successSoft
        : empty
          ? withAlpha(c.primary, selected ? 0.22 : 0.08)
          : inTrue
            ? c.success
            : c.primary;
  const fg =
    tone === 'wrong' ? c.danger : tone === 'right' ? c.success : inTrue ? c.onSuccess : c.onPrimary;
  const border =
    tone === 'wrong'
      ? c.danger
      : tone === 'right'
        ? c.success
        : selected
          ? c.text
          : empty
            ? withAlpha(c.primary, 0.7)
            : inTrue
              ? c.success
              : c.primaryPressed;
  return (
    <PressableScale
      haptic
      disabled={locked}
      onPress={() => onPress(slot)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: locked, selected }}
      style={[
        styles.center,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: bg,
          borderWidth: selected ? 3 : 2,
          borderStyle: empty && !selected ? 'dashed' : 'solid',
          borderColor: border,
        },
      ]}>
      {value !== null ? (
        <Text
          weight="bold"
          color={fg}
          maxFontSizeMultiplier={1}
          style={{ fontSize, lineHeight: Math.round(fontSize * 1.2) }}>
          {value}
        </Text>
      ) : (
        <Text
          weight="bold"
          color={withAlpha(c.primary, 0.6)}
          maxFontSizeMultiplier={1}
          style={{ fontSize: fontSize * 0.8, lineHeight: Math.round(fontSize) }}>
          ?
        </Text>
      )}
      {mine !== null ? (
        <Text
          weight="bold"
          color={c.danger}
          maxFontSizeMultiplier={1}
          style={[styles.mine, { fontSize: Math.max(10, fontSize * 0.42) }]}>
          {mine}
        </Text>
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  board: { alignSelf: 'center' },
  row: { flexDirection: 'row' },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerRow: { flexDirection: 'row', justifyContent: 'center' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  okDot: { position: 'absolute' },
  mine: {
    position: 'absolute',
    top: 2,
    right: 4,
    textDecorationLine: 'line-through',
  },
});
