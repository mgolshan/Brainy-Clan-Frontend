import type { TFunction } from 'i18next';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import type { MemoryMatchPayload, MemoryMatchResponse } from '@/api/types';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import {
  checkAttempt,
  gridRows,
  readAttempts,
  replayAttempts,
  type Attempt,
} from '@/challenges/memory/logic';
import { OwlMark } from '@/challenges/memory/OwlMark';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useFitToHeight } from '@/challenges/useFitToHeight';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { useScreenReaderEnabled } from '@/challenges/useScreenReader';
import { CHALLENGE_ROOT_ID } from '@/challenges/useWebKeys';
import { Button, PressableScale, Text, useTheme, useUiSound, withAlpha } from '@/ui';
import { clanSvg, parseAvatarKey } from '@/ui/avatars';

/** How long a mismatched pair stays face up (calm timers: longer). */
const MISS_MS = 800;
const MISS_CALM_MS = 1200;
/** Pause after the last move before the answer is sent, so the final flip can be seen. */
const FINISH_MS = 700;
const FLIP_MS = 260;

interface MemoryDraft {
  attempts: Attempt[];
}

const EMPTY: MemoryDraft = { attempts: [] };

function faceName(t: TFunction, key: string): string {
  const parts = parseAvatarKey(key);
  return parts ? t(`avatars.${parts.species}`) : key;
}

/**
 * `memory_match` (brain game): face-down cards with the world's card back and the Clan owl mark;
 * turn two per attempt. Pairs stay up (with a little bounce), mismatches flip back after 800 ms
 * (1.2 s with calm timers). The attempts so far are a draft, so leaving and coming back keeps
 * them. When every pair is found or the attempts run out the full attempts list is sent and the
 * server decides (same rules as `replayAttempts`).
 */
export function MemoryMatch({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<MemoryMatchPayload, MemoryMatchResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  // The world's sound effects (useSoundEffects, handed down by AppThemeProvider): no-op when off.
  const play = useUiSound();
  const screenReader = useScreenReaderEnabled();
  const payload = item.payload;
  const { cols, cards, max_attempts } = payload;
  const missMs = theme.calmTimers ? MISS_CALM_MS : MISS_MS;

  const isDraft = useCallback(
    (v: unknown): v is MemoryDraft => {
      const attempts = readAttempts(v);
      return !!attempts && replayAttempts(payload, attempts).valid;
    },
    [payload],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('memory_match', item.id),
    EMPTY,
    isDraft,
  );

  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const submitted = useMemo(
    () => (result ? readAttempts(result.submitted) : pending ? readAttempts(pending) : null),
    [result, pending],
  );
  const attempts = submitted ?? draft.attempts;
  const replay = useMemo(() => replayAttempts(payload, attempts), [payload, attempts]);
  const locked = !!disabled || !!pending || !!result || replay.finished;

  const [first, setFirst] = useState<number | null>(null);
  const [miss, setMiss] = useState<Attempt | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMiss = useCallback(() => {
    if (missTimer.current) clearTimeout(missTimer.current);
    missTimer.current = null;
    setMiss(null);
  }, []);
  useEffect(() => clearMiss, [clearMiss]);

  const onCard = useCallback(
    (i: number) => {
      if (locked || replay.matched[i] || i === first) return;
      // A mismatch still showing flips back as soon as the next card is turned.
      if (miss) clearMiss();
      if (first === null) {
        setFirst(i);
        play('tap');
        setStatus(t('challenge.memory.turned', { n: i + 1, face: faceName(t, cards[i]) }));
        return;
      }
      const attempt: Attempt = [first, i];
      const check = checkAttempt(cards, replay.matched, attempt);
      if (check === 'invalid') return;
      setFirst(null);
      setDraft((prev) => ({ attempts: [...prev.attempts, attempt] }));
      const face = faceName(t, cards[i]);
      if (check === 'match') {
        play('correct');
        setStatus(
          t('challenge.memory.matchAnnounce', {
            face,
            found: replay.pairsFound + 1,
            total: replay.totalPairs,
          }),
        );
      } else {
        play('wrong');
        setMiss(attempt);
        missTimer.current = setTimeout(() => {
          missTimer.current = null;
          setMiss(null);
        }, missMs);
        setStatus(
          t('challenge.memory.missAnnounce', { first: faceName(t, cards[first]), second: face }),
        );
      }
    },
    [locked, replay, first, miss, clearMiss, play, t, cards, setDraft, missMs],
  );

  // Done (all pairs, or out of attempts): send the full attempts list after a short pause.
  const send = useCallback(() => {
    if (disabled || pending || result) return;
    onSubmit({ attempts: draft.attempts });
  }, [disabled, pending, result, onSubmit, draft.attempts]);
  const autoSent = useRef(false);
  const finished = replay.finished && !submitted;
  useEffect(() => {
    if (!finished || autoSent.current || disabled) return;
    const timer = setTimeout(
      () => {
        autoSent.current = true;
        send();
      },
      replay.complete ? FINISH_MS : missMs,
    );
    return () => clearTimeout(timer);
  }, [finished, disabled, send, replay.complete, missMs]);

  // iOS has no live regions: speak the status there (Android and web use the live region).
  useEffect(() => {
    if (status && screenReader && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(status);
    }
  }, [status, screenReader]);

  // Layout: square cards from the measured width, fitted to the height in landscape (iPad).
  const [width, onLayout] = useMeasuredWidth();
  const rows = gridRows(cards.length, cols);
  const gap = theme.spacing.xs;
  const cell = useFitToHeight(
    width ? Math.floor(Math.min((width - gap * (cols - 1)) / cols, theme.touchTarget * 2.2)) : 0,
    rows,
  );

  const left = max_attempts - replay.attemptsUsed;
  const resultText = result
    ? result.isCorrect
      ? t('challenge.memory.allFound', { count: replay.attemptsUsed })
      : t('challenge.memory.notAll', { found: replay.pairsFound, total: replay.totalPairs })
    : null;

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.memory.title')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('challenge.memory.rules')}
        </Text>
      </View>

      <View style={[styles.counters, { gap: theme.spacing.sm }]}>
        <Text variant="label" tone={!result && left <= 2 ? 'warning' : 'default'}>
          {t('challenge.memory.attempts', { used: replay.attemptsUsed, max: max_attempts })}
        </Text>
        <Text variant="label" tone="muted">
          {t('challenge.memory.pairs', { found: replay.pairsFound, total: replay.totalPairs })}
        </Text>
      </View>

      {cell > 0 ? (
        <View style={[styles.grid, { gap, width: cell * cols + gap * (cols - 1) }]}>
          {cards.map((face, i) => {
            const matched = replay.matched[i];
            const faceUp =
              !!result || matched || first === i || (!!miss && (miss[0] === i || miss[1] === i));
            const name = faceName(t, face);
            const label = matched
              ? t('challenge.memory.cardMatched', { n: i + 1, face: name })
              : faceUp
                ? t('challenge.memory.cardUp', { n: i + 1, face: name })
                : t('challenge.memory.cardDown', { n: i + 1 });
            return (
              <MemoryCard
                key={i}
                index={i}
                face={face}
                faceUp={faceUp}
                matched={matched}
                missed={!!result && !result.isCorrect && !matched}
                size={cell}
                label={label}
                disabled={locked || matched}
                onPress={onCard}
              />
            );
          })}
        </View>
      ) : null}

      <Text
        variant="caption"
        tone={result ? (result.isCorrect ? 'success' : 'danger') : 'muted'}
        align="center"
        accessibilityLiveRegion="polite">
        {resultText ??
          (replay.finished
            ? replay.complete
              ? t('challenge.memory.allPairs')
              : t('challenge.memory.noAttemptsLeft')
            : (status ?? t('challenge.memory.left', { count: left })))}
      </Text>

      {/* Sent automatically; the button only matters when sending failed (try again). */}
      {replay.finished && !result ? (
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

interface MemoryCardProps {
  index: number;
  face: string;
  faceUp: boolean;
  matched: boolean;
  /** Scored wrong and this pair was never found (shown face up, marked). */
  missed: boolean;
  size: number;
  label: string;
  disabled: boolean;
  onPress: (index: number) => void;
}

/** One card: flips (scale-X turn) between the world card back and the Clan face. */
const MemoryCard = memo(function MemoryCard({
  index,
  face,
  faceUp,
  matched,
  missed,
  size,
  label,
  disabled,
  onPress,
}: MemoryCardProps) {
  const theme = useTheme();
  const c = theme.colors;
  const reduced = theme.reducedMotion;
  const flip = useSharedValue(faceUp ? 1 : 0);
  const bounce = useSharedValue(1);
  const wasMatched = useRef(matched);

  useEffect(() => {
    if (reduced) flip.set(faceUp ? 1 : 0);
    else flip.set(withTiming(faceUp ? 1 : 0, { duration: FLIP_MS }));
  }, [faceUp, reduced, flip]);

  useEffect(() => {
    if (matched && !wasMatched.current && !reduced) {
      bounce.set(
        withSequence(
          withTiming(1, { duration: FLIP_MS }),
          withSpring(1.12, theme.motion.spring),
          withSpring(1, theme.motion.spring),
        ),
      );
    }
    wasMatched.current = matched;
  }, [matched, reduced, bounce, theme.motion.spring]);

  const turn = useAnimatedStyle(() => ({
    transform: [
      { scale: bounce.get() },
      { scaleX: Math.max(0.02, Math.abs(Math.cos(flip.get() * Math.PI))) },
    ],
  }));
  const backStyle = useAnimatedStyle(() => ({ opacity: flip.get() < 0.5 ? 1 : 0 }));
  const frontStyle = useAnimatedStyle(() => ({ opacity: flip.get() < 0.5 ? 0 : 1 }));

  const press = useCallback(() => onPress(index), [onPress, index]);
  const radius = theme.surface === 'outlined' ? theme.radius.sm : theme.radius.md;
  const chunky = theme.surface === 'chunky';
  const xml = clanSvg(face);
  const frontBorder = matched ? c.success : missed ? c.danger : c.border;

  return (
    <PressableScale
      onPress={press}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: size, height: size }}>
      <Animated.View style={[styles.fill, turn]}>
        {/* Card back: the world's primary with an inset frame and the Brainy Clan owl. */}
        <Animated.View
          style={[
            styles.side,
            backStyle,
            {
              borderRadius: radius,
              backgroundColor: c.primary,
              borderColor: chunky ? c.primaryPressed : withAlpha(c.glow, 0.7),
              borderWidth: theme.surface === 'outlined' ? 1.5 : chunky ? 2 : 1,
              borderBottomWidth: chunky ? 4 : theme.surface === 'outlined' ? 1.5 : 1,
            },
          ]}>
          <View
            style={[
              styles.frame,
              {
                borderRadius: Math.max(2, radius - 4),
                borderColor: withAlpha(c.onPrimary, 0.35),
              },
            ]}>
            <OwlMark
              size={size * 0.62}
              color={withAlpha(c.onPrimary, 0.92)}
              background={c.primary}
            />
          </View>
        </Animated.View>
        {/* Face: the Clan kid character. */}
        <Animated.View
          style={[
            styles.side,
            frontStyle,
            {
              borderRadius: radius,
              backgroundColor: matched ? c.successSoft : missed ? c.dangerSoft : c.surface,
              borderColor: frontBorder,
              borderWidth: matched || missed ? 2 : chunky ? 2 : 1,
            },
          ]}>
          {xml ? <SvgXml xml={xml} width={size * 0.82} height={size * 0.82} /> : null}
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  counters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center' },
  fill: { flex: 1 },
  side: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frame: {
    ...StyleSheet.absoluteFill,
    margin: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
