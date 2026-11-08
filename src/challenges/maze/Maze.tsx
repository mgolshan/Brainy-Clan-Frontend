import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, SvgXml } from 'react-native-svg';

import type { GridCell, MazePayload, MazeResponse } from '@/api/types';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import { HowToPlay } from '@/challenges/HowToPlay';
import {
  cellKey,
  collectedStars,
  isMazeSolved,
  isValidPath,
  keyDirection,
  move,
  neighbour,
  openDirections,
  pathPoints,
  readPath,
  run,
  sameCell,
  swipeDirection,
  walkTo,
  wallPathData,
  type Direction,
  type MoveResult,
} from '@/challenges/maze/logic';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useScreenReaderEnabled } from '@/challenges/useScreenReader';
import { CHALLENGE_ROOT_ID, useWebKeys } from '@/challenges/useWebKeys';
import {
  Badge,
  Button,
  Celebration,
  Chip,
  Icon,
  PressableScale,
  Text,
  fitCellToHeight,
  useTheme,
  useUiSound,
  withAlpha,
  type IconName,
} from '@/ui';
import { clanSvg } from '@/ui/avatars';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';

interface Draft {
  path: GridCell[];
}

/** Board padding around the outer wall (px). */
const PAD = 4;
/** Pause on the goal before the path is sent, so the arrival can be seen. */
const FINISH_MS = 650;
const STEP_MS = 90;

const webNoSelect =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as unknown as ViewStyle)
    : null;

const ARROWS: Record<Direction, IconName> = {
  up: 'arrow-up',
  right: 'arrow-forward',
  down: 'arrow-down',
  left: 'arrow-back',
};

/** Five-point star polygon around (x, y). */
function starPoints(x: number, y: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(
      `${Math.round((x + Math.cos(a) * rr) * 10) / 10},${Math.round((y + Math.sin(a) * rr) * 10) / 10}`,
    );
  }
  return pts.join(' ');
}

/**
 * `maze` (level-up puzzle): walls drawn with SVG, the member's Clan avatar walks the maze.
 * Move with the arrow pad (or the keyboard arrows on web), by drawing from the avatar along the
 * corridors, or by swiping anywhere (the avatar runs to the next junction, star or goal). Walls
 * block every move exactly as the server checks them; the trail is drawn; each star pops with a
 * sound. Reaching the goal with every star sends the recorded `{ path }`; "Show me the way"
 * gives up (wrong answer) and the shortest route is drawn after scoring.
 */
export function Maze({
  item,
  onSubmit,
  disabled,
  pending,
  result,
  avatar,
}: ChallengeComponentProps<MazePayload, MazeResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const sound = useUiSound();
  const screenReader = useScreenReaderEnabled();
  const payload = item.payload;
  const { rows, cols, start, goal, stars } = payload;

  const initial = useMemo<Draft>(() => ({ path: [start] }), [start]);
  const isDraft = useCallback(
    (v: unknown): v is Draft =>
      typeof v === 'object' &&
      v !== null &&
      Array.isArray((v as Draft).path) &&
      isValidPath(payload, (v as Draft).path),
    [payload],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('maze', item.id),
    initial,
    isDraft,
  );
  const [width, onLayout] = useMeasuredWidth();
  const win = useWindowDimensions();
  const [announce, setAnnounce] = useState<string | null>(null);
  const [pop, setPop] = useState<{ cell: GridCell; n: number } | null>(null);

  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const submitted = useMemo(
    () =>
      result
        ? readPath(result.submitted, rows, cols)
        : pending
          ? readPath(pending, rows, cols)
          : null,
    [result, pending, rows, cols],
  );
  const path = submitted ?? draft.path;
  const here = path[path.length - 1] ?? start;
  const got = useMemo(() => collectedStars(payload, path), [payload, path]);
  const starCount = got.filter(Boolean).length;
  const solved = useMemo(() => isMazeSolved(payload, path), [payload, path]);
  const atGoal = sameCell(here, goal);
  const locked = !!disabled || !!pending || !!result || solved;
  const shortest = useMemo(
    () => (result && !result.isCorrect ? readPath(result.correctResponse, rows, cols) : null),
    [result, rows, cols],
  );

  // --- moves
  const apply = useCallback(
    (step: MoveResult) => {
      if (!step.entered.length) {
        sound('wrong', 1.4);
        setAnnounce(t('challenge.maze.blocked'));
        return;
      }
      const before = new Set(payload.stars.filter((_, i) => got[i]).map((s) => cellKey(s)));
      const newStar = step.entered.find(
        (cell) => payload.stars.some((s) => sameCell(s, cell)) && !before.has(cellKey(cell)),
      );
      setDraft({ path: step.path });
      const end = step.entered[step.entered.length - 1];
      const total = payload.stars.length;
      const nowGot = collectedStars(payload, step.path).filter(Boolean).length;
      if (newStar) {
        sound('unlock');
        setPop((p) => ({ cell: newStar, n: (p?.n ?? 0) + 1 }));
        setAnnounce(t('challenge.maze.starAnnounce', { got: nowGot, total }));
      } else if (sameCell(end, payload.goal)) {
        if (nowGot < total) {
          sound('wrong');
          setAnnounce(t('challenge.maze.needStars', { got: nowGot, total }));
        } else {
          setAnnounce(t('challenge.maze.arrived'));
        }
      } else {
        sound('tap', 1 + Math.min(0.3, step.entered.length * 0.03));
        const open = openDirections(payload, end)
          .map((d) => t(`challenge.maze.dir.${d}`))
          .join(', ');
        setAnnounce(t('challenge.maze.position', { row: end[0] + 1, col: end[1] + 1, open }));
      }
    },
    [payload, got, setDraft, sound, t],
  );
  const step = useCallback(
    (dir: Direction) => {
      if (locked) return;
      apply(move(payload, draft.path, dir));
    },
    [locked, apply, payload, draft.path],
  );
  const runTo = useCallback(
    (dir: Direction) => {
      if (locked) return;
      apply(run(payload, draft.path, dir));
    },
    [locked, apply, payload, draft.path],
  );
  const drawTo = useCallback(
    (target: GridCell) => {
      if (locked) return;
      const res = walkTo(payload, draft.path, target);
      if (res.entered.length) apply(res);
    },
    [locked, apply, payload, draft.path],
  );

  useWebKeys((key) => {
    const dir = keyDirection(key);
    if (!dir) return false;
    step(dir);
    return true;
  }, !locked);

  // iOS has no live regions: speak the status there (Android and web use the live region).
  useEffect(() => {
    if (announce && screenReader && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(announce);
    }
  }, [announce, screenReader]);

  // Solved: send the walked path after a short beat.
  const send = useCallback(() => {
    if (disabled || pending || result) return;
    onSubmit({ path: draft.path });
  }, [disabled, pending, result, onSubmit, draft.path]);
  const autoSent = useRef(false);
  useEffect(() => {
    if (!solved || submitted || autoSent.current || disabled) return;
    const timer = setTimeout(() => {
      autoSent.current = true;
      send();
    }, FINISH_MS);
    return () => clearTimeout(timer);
  }, [solved, submitted, disabled, send]);

  // --- layout: square cells from the width, fitted to the height in landscape (iPad, desktop).
  const byWidth = width
    ? Math.min(Math.floor((width - PAD * 2) / cols), Math.round(theme.touchTarget * 1.4))
    : 0;
  const cell = width
    ? fitCellToHeight({
        cell: byWidth,
        count: rows,
        windowWidth: win.width,
        windowHeight: win.height,
        reservedHeight: theme.touchTarget * 5 + 230,
        minCell: 16,
      })
    : 0;
  const boardW = cell * cols + PAD * 2;
  const boardH = cell * rows + PAD * 2;

  const cellAt = (x: number, y: number): GridCell => [
    Math.min(rows - 1, Math.max(0, Math.floor((y - PAD) / (cell || 1)))),
    Math.min(cols - 1, Math.max(0, Math.floor((x - PAD) / (cell || 1)))),
  ];

  // Drawing starts on (or next to) the avatar; a drag anywhere else is a swipe.
  // Until the mode set in onStart has re-rendered it is derived from the event (they agree).
  const [drawMode, setDrawMode] = useState<boolean | null>(null);
  const startsOnAvatar = (e: {
    x: number;
    y: number;
    translationX: number;
    translationY: number;
  }) => {
    if (drawMode !== null) return drawMode;
    const from = cellAt(e.x - e.translationX, e.y - e.translationY);
    return Math.abs(from[0] - here[0]) <= 1 && Math.abs(from[1] - here[1]) <= 1;
  };
  const gestureOn = !locked && cell > 0;
  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(gestureOn)
    .minDistance(8)
    .shouldCancelWhenOutside(false)
    .onStart((e) => {
      const draw = startsOnAvatar(e);
      setDrawMode(draw);
      if (draw) drawTo(cellAt(e.x, e.y));
    })
    .onUpdate((e) => {
      if (startsOnAvatar(e)) drawTo(cellAt(e.x, e.y));
    })
    .onEnd((e) => {
      if (startsOnAvatar(e)) return;
      const dir = swipeDirection(e.translationX, e.translationY);
      if (dir) runTo(dir);
    })
    .onFinalize(() => setDrawMode(null));
  const tap = Gesture.Tap()
    .runOnJS(true)
    .enabled(gestureOn)
    .maxDistance(8)
    .onEnd((e, success) => {
      if (success) drawTo(cellAt(e.x, e.y));
    });
  const gesture = Gesture.Race(pan, tap);

  // --- colors
  const wallColor =
    theme.vibe === 'kid' ? c.primaryPressed : theme.key === 'classic' ? c.text : c.borderStrong;
  const wallWidth = Math.max(2, Math.round(cell * 0.12));
  const trailColor = withAlpha(c.primary, 0.42);
  const walls = useMemo(() => (cell > 0 ? wallPathData(payload, cell, PAD) : ''), [payload, cell]);
  const trail = cell > 0 ? pathPoints(path, cell, PAD) : '';
  const center = (n: number) => (n + 0.5) * cell + PAD;
  const avatarKey: string = avatar && clanSvg(avatar) ? avatar : 'fox';

  const total = stars.length;
  const statusText = result
    ? result.isCorrect
      ? t('challenge.maze.solved')
      : t('challenge.maze.wayHint')
    : atGoal && starCount < total
      ? t('challenge.maze.needStars', { got: starCount, total })
      : solved
        ? t('challenge.maze.arrived')
        : (announce ?? (total ? t('challenge.maze.goalStars') : t('challenge.maze.goal')));

  const canGo = (dir: Direction) => !locked && neighbour(payload, here, dir) !== null;
  const padSize = Math.round(theme.touchTarget * 1.05);

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.maze.title', { rows, cols })}
        </Text>
        {!result ? (
          <Text variant="caption" tone="muted">
            {total ? t('challenge.maze.rulesStars') : t('challenge.maze.rules')}
          </Text>
        ) : null}
      </View>

      <HowToPlay
        game="maze"
        hidden={!!result}
        steps={[
          { icon: 'flag-outline', text: t('challenge.maze.how1') },
          { icon: 'star-outline', text: t('challenge.maze.how2') },
          { icon: 'finger-print-outline', text: t('challenge.maze.how3') },
        ]}
      />

      {total > 0 ? (
        <View style={styles.counters}>
          <Badge
            label={t('challenge.maze.stars', { got: starCount, total })}
            tone={starCount === total ? 'success' : 'accent'}
            icon="star"
          />
        </View>
      ) : null}

      {result?.isCorrect ? (
        <View style={styles.centerRow}>
          <Celebration size={72} avatar={avatarKey} />
        </View>
      ) : null}

      {cell > 0 ? (
        <View style={styles.centerRow}>
          <GestureDetector gesture={gesture}>
            <View
              accessible
              accessibilityLabel={t('challenge.maze.boardLabel', {
                rows,
                cols,
                row: here[0] + 1,
                col: here[1] + 1,
                goalRow: goal[0] + 1,
                goalCol: goal[1] + 1,
              })}
              style={[
                webNoSelect,
                {
                  width: boardW,
                  height: boardH,
                  borderRadius: theme.radius.md,
                  backgroundColor: c.surface,
                  borderWidth: result ? 3 : 0,
                  borderColor: result ? (result.isCorrect ? c.success : c.danger) : undefined,
                },
              ]}>
              <Svg width={boardW} height={boardH}>
                {/* Start and goal squares. */}
                <Rect
                  x={start[1] * cell + PAD}
                  y={start[0] * cell + PAD}
                  width={cell}
                  height={cell}
                  fill={withAlpha(c.primary, 0.14)}
                />
                <Rect
                  x={goal[1] * cell + PAD}
                  y={goal[0] * cell + PAD}
                  width={cell}
                  height={cell}
                  fill={withAlpha(c.success, 0.22)}
                />
                {/* The walked trail. */}
                {path.length > 1 ? (
                  <Polyline
                    points={trail}
                    fill="none"
                    stroke={trailColor}
                    strokeWidth={Math.max(3, cell * 0.3)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {/* After a wrong answer: the shortest route through every star. */}
                {shortest && shortest.length > 1 ? (
                  <Polyline
                    points={pathPoints(shortest, cell, PAD)}
                    fill="none"
                    stroke={c.success}
                    strokeWidth={Math.max(2, cell * 0.14)}
                    strokeDasharray={`${Math.max(3, cell * 0.25)} ${Math.max(3, cell * 0.2)}`}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                <Path
                  d={walls}
                  stroke={wallColor}
                  strokeWidth={wallWidth}
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Goal flag. */}
                <G>
                  <Line
                    x1={center(goal[1]) - cell * 0.18}
                    y1={center(goal[0]) - cell * 0.32}
                    x2={center(goal[1]) - cell * 0.18}
                    y2={center(goal[0]) + cell * 0.32}
                    stroke={c.text}
                    strokeWidth={Math.max(1.5, cell * 0.07)}
                    strokeLinecap="round"
                  />
                  <Polygon
                    points={`${center(goal[1]) - cell * 0.16},${center(goal[0]) - cell * 0.32} ${center(goal[1]) + cell * 0.3},${center(goal[0]) - cell * 0.16} ${center(goal[1]) - cell * 0.16},${center(goal[0])}`}
                    fill={c.danger}
                  />
                </G>
                {stars.map((s, i) =>
                  got[i] ? (
                    <Circle
                      key={i}
                      cx={center(s[1])}
                      cy={center(s[0])}
                      r={Math.max(2, cell * 0.1)}
                      fill={withAlpha(c.accent, 0.7)}
                    />
                  ) : (
                    <Polygon
                      key={i}
                      points={starPoints(center(s[1]), center(s[0]), cell * 0.36)}
                      fill={c.accent}
                      stroke={withAlpha(c.text, 0.5)}
                      strokeWidth={1}
                    />
                  ),
                )}
              </Svg>
              {pop ? (
                <StarPop key={pop.n} x={center(pop.cell[1])} y={center(pop.cell[0])} size={cell} />
              ) : null}
              <Walker avatar={avatarKey} cell={cell} row={here[0]} col={here[1]} />
            </View>
          </GestureDetector>
        </View>
      ) : null}

      <Text
        variant="caption"
        align="center"
        tone={
          result
            ? result.isCorrect
              ? 'success'
              : 'danger'
            : atGoal && starCount < total
              ? 'warning'
              : 'muted'
        }
        accessibilityLiveRegion="polite">
        {statusText}
      </Text>

      {!result && cell > 0 ? (
        <View style={{ gap: theme.spacing.sm }}>
          {/* Arrow pad (also the screen-reader and switch-control way to play). */}
          <View style={[styles.pad, { width: padSize * 3, height: padSize * 3 }]}>
            {(['up', 'left', 'right', 'down'] as Direction[]).map((dir) => (
              <ArrowKey
                key={dir}
                dir={dir}
                size={padSize}
                label={t(`challenge.maze.move.${dir}`)}
                disabled={!canGo(dir)}
                onPress={step}
              />
            ))}
          </View>
          <View style={[styles.controls, { gap: theme.spacing.sm }]}>
            <Chip
              label={t('challenge.maze.restart')}
              icon="refresh"
              onPress={() => {
                if (!locked) setDraft(initial);
              }}
            />
            <Chip
              label={t('challenge.maze.giveUp')}
              icon="help-buoy-outline"
              onPress={() => {
                if (!locked) send();
              }}
            />
          </View>
        </View>
      ) : null}

      {/* Sent automatically; the button only matters when sending failed (try again). */}
      {solved && !result ? (
        <Button
          title={t('challenge.check')}
          icon="checkmark-circle-outline"
          size="lg"
          disabled={!!disabled || !!pending}
          loading={!!pending}
          onPress={send}
        />
      ) : null}
    </View>
  );
}

/** The member's avatar on the current cell; glides between cells (instant with reduced motion). */
const Walker = memo(function Walker({
  avatar,
  cell,
  row,
  col,
}: {
  avatar: string;
  cell: number;
  row: number;
  col: number;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const size = Math.max(14, cell * 0.92);
  const x = useSharedValue(col * cell + PAD + (cell - size) / 2);
  const y = useSharedValue(row * cell + PAD + (cell - size) / 2);
  useEffect(() => {
    const nx = col * cell + PAD + (cell - size) / 2;
    const ny = row * cell + PAD + (cell - size) / 2;
    if (theme.reducedMotion) {
      x.set(nx);
      y.set(ny);
    } else {
      x.set(withTiming(nx, { duration: STEP_MS }));
      y.set(withTiming(ny, { duration: STEP_MS }));
    }
  }, [row, col, cell, size, theme.reducedMotion, x, y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }],
  }));
  const xml = clanSvg(avatar);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.walker,
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.surface,
          borderColor: c.primary,
          borderWidth: Math.max(1.5, size * 0.07),
        },
      ]}>
      {xml ? <SvgXml xml={xml} width={size * 0.94} height={size * 0.94} /> : null}
    </Animated.View>
  );
});

/** A collected star jumps up and fades (a still, brief glow with reduced motion). */
function StarPop({ x, y, size }: { x: number; y: number; size: number }) {
  const theme = useTheme();
  const box = Math.max(28, size * 1.6);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      theme.reducedMotion
        ? withSequence(withTiming(0.5, { duration: 0 }), withTiming(1, { duration: 700 }))
        : withTiming(1, { duration: 700 }),
    );
  }, [progress, theme.reducedMotion]);
  const reduced = theme.reducedMotion;
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: 1 - p,
      transform: reduced ? [] : [{ translateY: -p * size * 1.2 }, { scale: 0.8 + p * 0.9 }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pop, style, { left: x - box / 2, top: y - box / 2, width: box, height: box }]}>
      <Svg width={box} height={box}>
        <Polygon points={starPoints(box / 2, box / 2, box * 0.42)} fill={theme.colors.accent} />
      </Svg>
    </Animated.View>
  );
}

function ArrowKey({
  dir,
  size,
  label,
  disabled,
  onPress,
}: {
  dir: Direction;
  size: number;
  label: string;
  disabled: boolean;
  onPress: (dir: Direction) => void;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const pos: Record<Direction, { left: number; top: number }> = {
    up: { left: size, top: 0 },
    left: { left: 0, top: size },
    right: { left: size * 2, top: size },
    down: { left: size, top: size * 2 },
  };
  const chunky = theme.surface === 'chunky';
  return (
    <PressableScale
      haptic
      disabled={disabled}
      onPress={() => onPress(dir)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        styles.arrow,
        pos[dir],
        {
          width: size - 4,
          height: size - 4,
          borderRadius: theme.key === 'classic' ? theme.radius.sm : theme.radius.md,
          backgroundColor: disabled ? c.surfaceAlt : c.primary,
          borderColor: disabled ? c.border : c.primaryPressed,
          borderWidth: chunky ? 2 : 1,
          borderBottomWidth: chunky && !disabled ? 5 : chunky ? 2 : 1,
          opacity: disabled ? 0.55 : 1,
        },
      ]}>
      <Icon
        name={ARROWS[dir]}
        size={Math.round(size * 0.46)}
        color={disabled ? c.textSubtle : c.onPrimary}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  counters: { flexDirection: 'row', justifyContent: 'center' },
  centerRow: { flexDirection: 'row', justifyContent: 'center' },
  walker: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pop: { position: 'absolute' },
  pad: { alignSelf: 'center' },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
