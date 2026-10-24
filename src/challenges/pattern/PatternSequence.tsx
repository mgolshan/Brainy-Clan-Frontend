import type { TFunction } from 'i18next';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import type { PatternSequencePayload, PatternSequenceResponse } from '@/api/types';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import {
  inputStatus,
  padColumns,
  padToneRate,
  playbackTiming,
  readInput,
  tapPad,
} from '@/challenges/pattern/logic';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useFitToHeight } from '@/challenges/useFitToHeight';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { useScreenReaderEnabled } from '@/challenges/useScreenReader';
import { CHALLENGE_ROOT_ID } from '@/challenges/useWebKeys';
import { Button, PressableScale, Text, useTheme, useUiSound, withAlpha } from '@/ui';
import { clanSvg, parseAvatarKey } from '@/ui/avatars';

/** Pause before the first step, so the member is looking at the pads. */
const LEAD_IN_MS = 600;
/** Pad flash when the member taps it. */
const TAP_FLASH_MS = 220;

interface PatternDraft {
  /** The pattern was played (it is shown once: no replay, even after leaving). */
  watched: boolean;
  input: number[];
}

const EMPTY: PatternDraft = { watched: false, input: [] };

type Phase = 'ready' | 'watch' | 'input';

function padName(t: TFunction, key: string): string {
  const parts = parseAvatarKey(key);
  return parts ? t(`avatars.${parts.species}`) : key;
}

/**
 * `pattern_sequence` (brain game): Clan kid pads on round world-styled buttons. "Watch": the
 * pattern plays once (highlight + scale + a tone per pad; `show_ms` per step, ×1.5 with calm
 * timers; no scaling with reduced motion). "Your turn": tap the pads in the same order; a wrong
 * tap ends the round and is sent at once, like the full sequence. With a screen reader on the
 * whole pattern is also announced.
 */
export function PatternSequence({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<PatternSequencePayload, PatternSequenceResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  // The world's sound effects (useSoundEffects, handed down by AppThemeProvider): no-op when off.
  const play = useUiSound();
  const screenReader = useScreenReaderEnabled();
  const { pads, sequence, show_ms } = item.payload;

  const isDraft = useCallback(
    (v: unknown): v is PatternDraft => {
      const d = v as PatternDraft | null;
      return (
        typeof d === 'object' &&
        d !== null &&
        typeof d.watched === 'boolean' &&
        Array.isArray(d.input) &&
        d.input.every((n) => Number.isInteger(n) && n >= 0 && n < pads.length)
      );
    },
    [pads.length],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('pattern_sequence', item.id),
    EMPTY,
    isDraft,
  );
  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const submitted = useMemo(
    () => (result ? readInput(result.submitted) : pending ? readInput(pending) : null),
    [result, pending],
  );
  const input = submitted ?? draft.input;
  const status = inputStatus(sequence, input);
  const [phase, setPhase] = useState<Phase>(draft.watched ? 'input' : 'ready');
  const [lit, setLit] = useState<number | null>(null);
  const [played, setPlayed] = useState(0);
  const [announce, setAnnounce] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timing = playbackTiming(show_ms, theme.calmTimers);
  const over = status !== 'playing' || !!submitted;
  const locked = !!disabled || !!pending || !!result || over;

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
    },
    [],
  );

  const names = useMemo(() => pads.map((p) => padName(t, p)), [pads, t]);

  const watch = useCallback(() => {
    if (phase !== 'ready' || locked) return;
    // Shown once: remember it right away, so leaving and coming back doesn't replay it.
    setDraft({ watched: true, input: [] });
    setPhase('watch');
    setPlayed(0);
    if (screenReader) {
      AccessibilityInfo.announceForAccessibility(
        t('challenge.pattern.sequenceAnnounce', { pads: sequence.map((i) => names[i]).join(', ') }),
      );
    }
    const step = timing.onMs + timing.gapMs;
    sequence.forEach((pad, k) => {
      later(LEAD_IN_MS + k * step, () => {
        setLit(pad);
        setPlayed(k + 1);
        setAnnounce(names[pad]);
        play('tap', padToneRate(pad));
      });
      later(LEAD_IN_MS + k * step + timing.onMs, () => setLit(null));
    });
    later(LEAD_IN_MS + sequence.length * step, () => {
      setPhase('input');
      setAnnounce(t('challenge.pattern.yourTurn'));
    });
  }, [phase, locked, setDraft, screenReader, t, sequence, names, timing, later, play]);

  const onPad = useCallback(
    (pad: number) => {
      if (phase !== 'input' || locked) return;
      const next = tapPad(sequence, input, pad);
      setLit(pad);
      later(TAP_FLASH_MS, () => setLit((cur) => (cur === pad ? null : cur)));
      if (next.status === 'playing') {
        play('tap', padToneRate(pad));
        setAnnounce(
          t('challenge.pattern.progress', { done: next.input.length, total: sequence.length }),
        );
      }
      setDraft({ watched: true, input: next.input });
      // A wrong tap ends the round; the whole sequence is done: send either at once.
      if (next.status !== 'playing') onSubmit({ input: next.input });
    },
    [phase, locked, sequence, input, later, play, t, setDraft, onSubmit],
  );

  // Layout: pads in a 2- to 4-column grid, fitted to the window height in landscape.
  const [width, onLayout] = useMeasuredWidth();
  const cols = padColumns(pads.length);
  const rows = Math.ceil(pads.length / cols);
  const gap = theme.spacing.md;
  const pad = useFitToHeight(
    width ? Math.floor(Math.min((width - gap * (cols - 1)) / cols, theme.touchTarget * 2.4)) : 0,
    rows,
  );

  const phaseText = result
    ? result.isCorrect
      ? t('challenge.pattern.allRight')
      : t('challenge.pattern.wrongAt', { step: Math.max(1, input.length) })
    : phase === 'ready'
      ? t('challenge.pattern.readyHint')
      : phase === 'watch'
        ? t('challenge.pattern.watching')
        : status === 'playing'
          ? t('challenge.pattern.yourTurnHint')
          : null;
  const correctInput =
    result && !result.isCorrect ? (readInput(result.correctResponse) ?? sequence) : null;
  const filled = phase === 'watch' ? played : input.length;

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {phase === 'input' || result
            ? t('challenge.pattern.yourTurn')
            : t('challenge.pattern.watch')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('challenge.pattern.rules')}
        </Text>
      </View>

      {/* Length indicator: one dot per step (filled while watching, then per tap). */}
      <View
        style={[styles.dots, { gap: theme.spacing.xs }]}
        accessible
        accessibilityLabel={t('challenge.pattern.length', {
          done: filled,
          total: sequence.length,
        })}>
        {sequence.map((_, k) => {
          const wrong = phase !== 'watch' && status === 'wrong' && k === input.length - 1;
          const done = k < filled;
          const color = wrong
            ? c.danger
            : done
              ? phase === 'watch'
                ? c.primary
                : c.success
              : c.border;
          return (
            <View
              key={k}
              style={[
                styles.dot,
                {
                  backgroundColor: done || wrong ? color : 'transparent',
                  borderColor: color,
                },
              ]}
            />
          );
        })}
      </View>

      {pad > 0 ? (
        <View style={[styles.pads, { gap, width: pad * cols + gap * (cols - 1) }]}>
          {pads.map((key, i) => (
            <Pad
              key={i}
              index={i}
              avatar={key}
              size={pad}
              lit={lit === i}
              label={t('challenge.pattern.pad', { n: i + 1, name: names[i] })}
              disabled={phase !== 'input' || locked}
              onPress={onPad}
            />
          ))}
        </View>
      ) : null}

      {phaseText ? (
        <Text
          variant="caption"
          align="center"
          tone={result ? (result.isCorrect ? 'success' : 'danger') : 'muted'}>
          {phaseText}
        </Text>
      ) : null}
      {/* Live region: each step while watching, then progress (Android / web screen readers). */}
      {announce && !result ? (
        <Text variant="caption" tone="subtle" align="center" accessibilityLiveRegion="polite">
          {announce}
        </Text>
      ) : null}

      {correctInput ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="caption" tone="muted" align="center">
            {t('challenge.pattern.wasLabel')}
          </Text>
          <View
            style={[styles.dots, { gap: theme.spacing.xs }]}
            accessible
            accessibilityLabel={t('challenge.pattern.was', {
              pads: correctInput.map((i) => names[i] ?? '?').join(', '),
            })}>
            {correctInput.map((i, k) => {
              const xml = clanSvg(pads[i]);
              return (
                <View
                  key={k}
                  style={[
                    styles.mini,
                    {
                      width: theme.touchTarget * 0.8,
                      height: theme.touchTarget * 0.8,
                      borderRadius: theme.touchTarget,
                      backgroundColor: withAlpha(c.categories[i % c.categories.length], 0.22),
                      borderColor: input[k] === i ? c.success : c.border,
                    },
                  ]}>
                  {xml ? (
                    <SvgXml
                      xml={xml}
                      width={theme.touchTarget * 0.7}
                      height={theme.touchTarget * 0.7}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {phase === 'ready' && !result ? (
        <Button
          title={t('challenge.pattern.start')}
          icon="eye-outline"
          size="lg"
          disabled={!!disabled}
          onPress={watch}
        />
      ) : null}
      {/* Sent at once; the button only matters when sending failed (try again). */}
      {over && !result ? (
        <Button
          title={t('challenge.check')}
          icon="checkmark-circle-outline"
          size="lg"
          disabled={!!disabled || !!pending}
          loading={!!pending}
          onPress={() => onSubmit({ input })}
        />
      ) : null}
    </View>
  );
}

interface PadProps {
  index: number;
  avatar: string;
  size: number;
  lit: boolean;
  label: string;
  disabled: boolean;
  onPress: (index: number) => void;
}

/** One round pad: the Clan character on a world-tinted button; lights up (and grows) when lit. */
const Pad = memo(function Pad({ index, avatar, size, lit, label, disabled, onPress }: PadProps) {
  const theme = useTheme();
  const c = theme.colors;
  const glow = useSharedValue(lit ? 1 : 0);

  useEffect(() => {
    glow.set(withTiming(lit ? 1 : 0, { duration: theme.reducedMotion ? 0 : 120 }));
  }, [lit, glow, theme.reducedMotion]);

  const scaleUp = !theme.reducedMotion;
  const anim = useAnimatedStyle(() =>
    scaleUp ? { transform: [{ scale: 1 + glow.get() * 0.12 }] } : {},
  );

  const tint = c.categories[index % c.categories.length];
  const xml = clanSvg(avatar);
  const press = useCallback(() => onPress(index), [onPress, index]);
  const ring = Math.max(3, Math.round(size / 20));

  return (
    <PressableScale
      onPress={press}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: size, height: size }}>
      <Animated.View
        style={[
          styles.pad,
          anim,
          {
            borderRadius: size / 2,
            backgroundColor: lit ? tint : withAlpha(tint, theme.scheme === 'dark' ? 0.26 : 0.18),
            borderWidth: lit ? ring : theme.surface === 'chunky' ? 3 : 2,
            borderBottomWidth: theme.surface === 'chunky' && !lit ? 6 : lit ? ring : 2,
            borderColor: lit
              ? c.glow
              : theme.surface === 'outlined'
                ? c.borderStrong
                : withAlpha(tint, 0.7),
            shadowColor: c.glow,
            shadowOpacity: lit ? 0.6 : 0,
            shadowRadius: lit ? size / 8 : 0,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}>
        {xml ? <SvgXml xml={xml} width={size * 0.78} height={size * 0.78} /> : null}
      </Animated.View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  pads: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center' },
  pad: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  mini: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
});
