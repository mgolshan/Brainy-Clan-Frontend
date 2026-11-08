import type { TFunction } from 'i18next';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { CodeBreakerPayload, CodeBreakerResponse } from '@/api/types';
import {
  clearPeg,
  emptyCurrent,
  gameStatus,
  isCodeBreakerDraft,
  isComplete,
  nextEmptySlot,
  putPeg,
  readCode,
  readGuesses,
  removeLast,
  scoreGuess,
  type CodeBreakerDraft,
  type Feedback,
} from '@/challenges/codebreaker/logic';
import { draftKey, useChallengeDraft } from '@/challenges/drafts';
import { HowToPlay } from '@/challenges/HowToPlay';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { useScreenReaderEnabled } from '@/challenges/useScreenReader';
import { CHALLENGE_ROOT_ID, useWebKeys } from '@/challenges/useWebKeys';
import {
  Appear,
  Badge,
  Button,
  Celebration,
  Chip,
  Icon,
  PressableScale,
  Text,
  useTheme,
  useUiSound,
  withAlpha,
} from '@/ui';
import { clanSvg, parseAvatarKey } from '@/ui/avatars';

/** Pause after the last guess before the answer is sent, so its feedback can be read. */
const FINISH_MS = 900;

function pegName(t: TFunction, key: string): string {
  const parts = parseAvatarKey(key);
  return parts ? t(`avatars.${parts.species}`) : key;
}

/** Spoken feedback: "1 right friend in the right spot, 2 in the wrong spot". */
function feedbackText(t: TFunction, fb: Feedback): string {
  if (fb.exact === 0 && fb.near === 0) return t('challenge.codebreaker.noneRight');
  return [
    t('challenge.codebreaker.exactCount', { count: fb.exact }),
    t('challenge.codebreaker.nearCount', { count: fb.near }),
  ].join(', ');
}

/**
 * `code_breaker` (level-up puzzle, Mastermind with Clan friends): build a guess of `length`
 * friends (tap a friend to fill the next empty spot, tap a spot to empty it and choose it), then
 * "Try it". Every guess gets markers, sorted so they never tell which spot: a filled ✓ disc for
 * "right friend, right spot" and an open ↔ ring for "right friend, wrong spot" (different shapes,
 * not only colors, plus spoken labels). Scored here with the contract's formula; when the code is
 * found or the guesses run out, `{ guesses }` is sent. The secret line is revealed after scoring.
 * Web: number keys pick friends, Backspace removes, Enter tries the guess.
 */
export function CodeBreaker({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<CodeBreakerPayload, CodeBreakerResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const sound = useUiSound();
  const screenReader = useScreenReaderEnabled();
  const payload = item.payload;
  const { pegs, length, repeats, max_guesses: maxGuesses, code } = payload;

  const initial = useMemo<CodeBreakerDraft>(
    () => ({ guesses: [], current: emptyCurrent(length) }),
    [length],
  );
  const isDraft = useCallback(
    (v: unknown): v is CodeBreakerDraft => isCodeBreakerDraft(v, payload),
    [payload],
  );
  const [draft, setDraft, clearDraft] = useChallengeDraft(
    draftKey('code_breaker', item.id),
    initial,
    isDraft,
  );
  const [slot, setSlot] = useState<number | null>(null);
  const [announce, setAnnounce] = useState<string | null>(null);
  const [width, onLayout] = useMeasuredWidth();

  useEffect(() => {
    if (result) clearDraft();
  }, [result, clearDraft]);

  const submitted = useMemo(
    () => (result ? readGuesses(result.submitted) : pending ? readGuesses(pending) : null),
    [result, pending],
  );
  const guesses = submitted ?? draft.guesses;
  const current = draft.current;
  const status = gameStatus(payload, guesses);
  const over = status !== 'playing';
  const locked = !!disabled || !!pending || !!result || over;
  const left = Math.max(0, maxGuesses - guesses.length);
  const names = useMemo(() => pegs.map((p) => pegName(t, p)), [pegs, t]);
  const feedback = useMemo(() => guesses.map((g) => scoreGuess(g, code)), [guesses, code]);
  const secret = result ? (readCode(result.correctResponse, length) ?? code) : null;

  // --- input
  const pick = useCallback(
    (peg: number) => {
      if (locked) return;
      sound('tap', 1 + (peg % 8) * 0.06);
      const next = putPeg(current, peg, slot);
      setDraft((d) => ({ ...d, current: next }));
      setSlot(slot !== null ? nextEmptySlot(next, slot) : null);
    },
    [locked, slot, current, setDraft, sound],
  );
  const tapSlot = useCallback(
    (i: number) => {
      if (locked) return;
      if (current[i] !== null) setDraft((d) => ({ ...d, current: clearPeg(d.current, i) }));
      setSlot((s) => (s === i && current[i] === null ? null : i));
    },
    [locked, current, setDraft],
  );
  const tryGuess = useCallback(() => {
    if (locked || !isComplete(current)) return;
    const guess = [...current];
    const fb = scoreGuess(guess, code);
    const solved = fb.exact === length;
    setDraft((d) => ({ guesses: [...d.guesses, guess], current: emptyCurrent(length) }));
    setSlot(null);
    sound(solved ? 'celebrate' : fb.exact + fb.near > 0 ? 'correct' : 'wrong', solved ? 1 : 0.9);
    setAnnounce(
      solved
        ? t('challenge.codebreaker.cracked')
        : t('challenge.codebreaker.guessAnnounce', {
            n: guesses.length + 1,
            feedback: feedbackText(t, fb),
          }),
    );
  }, [locked, current, code, length, setDraft, sound, t, guesses.length]);

  useWebKeys((key) => {
    if (/^[1-9]$/.test(key)) {
      const peg = Number(key) - 1;
      if (peg < pegs.length) pick(peg);
      return peg < pegs.length;
    }
    if (key === 'Backspace') {
      setDraft((d) => ({ ...d, current: removeLast(d.current) }));
      return true;
    }
    if (key === 'Enter') {
      tryGuess();
      return isComplete(current);
    }
    return false;
  }, !locked);

  useEffect(() => {
    if (announce && screenReader && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(announce);
    }
  }, [announce, screenReader]);

  // Done (cracked or out of guesses): send every guess after a short beat.
  const send = useCallback(() => {
    if (disabled || pending || result) return;
    onSubmit({ guesses: draft.guesses });
  }, [disabled, pending, result, onSubmit, draft.guesses]);
  const autoSent = useRef(false);
  const finished = over && !submitted;
  useEffect(() => {
    if (!finished || autoSent.current || disabled) return;
    const timer = setTimeout(() => {
      autoSent.current = true;
      send();
    }, FINISH_MS);
    return () => clearTimeout(timer);
  }, [finished, disabled, send]);

  // --- layout
  // Guess rows: number + friends + markers; the guess being built gets bigger spots.
  const markerBox = Math.ceil(length / 2) * 16 + 4;
  const rowExtras = 22 + markerBox + theme.spacing.xs * (length + 1) + theme.spacing.xxs * 2;
  const small = width
    ? Math.max(26, Math.floor(Math.min((width - rowExtras) / length, theme.touchTarget * 0.95)))
    : 0;
  const big = width
    ? Math.floor(
        Math.min((width - theme.spacing.xs * (length - 1)) / length, theme.touchTarget * 1.35),
      )
    : 0;
  const palette = width
    ? Math.floor(
        Math.min(
          (width - theme.spacing.sm * (Math.min(pegs.length, 4) - 1)) / Math.min(pegs.length, 4),
          theme.touchTarget * 1.3,
        ),
      )
    : 0;

  const resultText = result
    ? result.isCorrect
      ? t('challenge.codebreaker.solvedIn', { count: guesses.length })
      : t('challenge.codebreaker.notCracked')
    : status === 'solved'
      ? t('challenge.codebreaker.cracked')
      : status === 'out'
        ? t('challenge.codebreaker.outOfGuesses')
        : null;

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.codebreaker.title')}
        </Text>
        <Text variant="caption" tone="muted">
          {repeats
            ? t('challenge.codebreaker.rulesRepeats', { n: length })
            : t('challenge.codebreaker.rules', { n: length })}
        </Text>
      </View>

      <HowToPlay
        game="code_breaker"
        hidden={!!result}
        steps={[
          { icon: 'people-outline', text: t('challenge.codebreaker.how1', { n: length }) },
          { icon: 'checkmark-circle', text: t('challenge.codebreaker.how2') },
          { icon: 'swap-horizontal', text: t('challenge.codebreaker.how3') },
        ]}
      />

      {result?.isCorrect ? (
        <View style={styles.rowCenter}>
          <Celebration size={64} />
        </View>
      ) : null}

      {/* Secret line: locked until scored. */}
      {big > 0 ? (
        <View
          style={[styles.rowCenter, { gap: theme.spacing.xs }]}
          accessible
          accessibilityLabel={
            secret
              ? t('challenge.codebreaker.secretWas', {
                  pegs: secret.map((i) => names[i] ?? '?').join(', '),
                })
              : t('challenge.codebreaker.secretHidden', { n: length })
          }>
          {Array.from({ length }, (_, i) => {
            const peg = secret ? secret[i] : null;
            return (
              <PegFace
                key={i}
                peg={peg}
                avatar={peg !== null ? pegs[peg] : null}
                size={small}
                hidden={!secret}
              />
            );
          })}
        </View>
      ) : null}

      <View style={[styles.counters, { gap: theme.spacing.sm }]}>
        <Badge
          label={t('challenge.codebreaker.left', { count: left })}
          tone={!result && left <= 2 ? 'warning' : 'neutral'}
          icon="key-outline"
        />
      </View>

      {/* Legend: the two markers, with their meaning in words. */}
      <View style={[styles.legend, { gap: theme.spacing.md }]}>
        <View style={[styles.rowCenter, { gap: theme.spacing.xxs }]}>
          <Marker kind="exact" size={18} />
          <Text variant="caption">{t('challenge.codebreaker.exactLegend')}</Text>
        </View>
        <View style={[styles.rowCenter, { gap: theme.spacing.xxs }]}>
          <Marker kind="near" size={18} />
          <Text variant="caption">{t('challenge.codebreaker.nearLegend')}</Text>
        </View>
      </View>

      {/* Guesses so far. */}
      {big > 0 && guesses.length ? (
        <View style={{ gap: theme.spacing.xs }}>
          {guesses.map((g, k) => (
            <Appear key={k}>
              <View
                accessible
                accessibilityLabel={t('challenge.codebreaker.guessRow', {
                  n: k + 1,
                  pegs: g.map((i) => names[i] ?? '?').join(', '),
                  feedback: feedbackText(t, feedback[k]),
                })}
                style={[
                  styles.guessRow,
                  {
                    gap: theme.spacing.xs,
                    padding: theme.spacing.xxs,
                    borderRadius: theme.radius.md,
                    backgroundColor:
                      feedback[k].exact === length ? c.successSoft : withAlpha(c.surfaceAlt, 0.7),
                  },
                ]}>
                <Text variant="caption" tone="muted" style={styles.num}>
                  {k + 1}
                </Text>
                {g.map((peg, i) => (
                  <PegFace key={i} peg={peg} avatar={pegs[peg]} size={small} />
                ))}
                <FeedbackPins fb={feedback[k]} length={length} />
              </View>
            </Appear>
          ))}
        </View>
      ) : null}

      {/* The guess being built. */}
      {!over && !result && big > 0 ? (
        <View style={{ gap: theme.spacing.sm }}>
          <View style={[styles.rowCenter, { gap: theme.spacing.xs }]}>
            {current.map((peg, i) => (
              <PressableScale
                key={i}
                haptic
                disabled={locked}
                onPress={() => tapSlot(i)}
                accessibilityRole="button"
                accessibilityLabel={t('challenge.codebreaker.slot', {
                  n: i + 1,
                  value: peg === null ? t('challenge.codebreaker.emptySlot') : names[peg],
                })}
                accessibilityState={{ selected: slot === i }}
                style={[
                  styles.slot,
                  {
                    width: big,
                    height: big,
                    borderRadius: big / 2,
                    borderWidth: slot === i ? 3 : 2,
                    borderStyle: peg === null && slot !== i ? 'dashed' : 'solid',
                    borderColor: slot === i ? c.text : withAlpha(c.primary, 0.6),
                    backgroundColor:
                      peg === null
                        ? withAlpha(c.primary, slot === i ? 0.18 : 0.06)
                        : withAlpha(c.categories[peg % c.categories.length], 0.25),
                  },
                ]}>
                {peg !== null ? (
                  <SvgXml xml={clanSvg(pegs[peg]) ?? ''} width={big * 0.86} height={big * 0.86} />
                ) : (
                  <Text tone="subtle" weight="bold" maxFontSizeMultiplier={1}>
                    {i + 1}
                  </Text>
                )}
              </PressableScale>
            ))}
          </View>

          <Text variant="caption" tone="muted" align="center">
            {t('challenge.codebreaker.pickHint')}
          </Text>

          <View style={[styles.palette, { gap: theme.spacing.sm }]}>
            {pegs.map((key, i) => (
              <PaletteKey
                key={key}
                index={i}
                avatar={key}
                size={palette}
                label={t('challenge.codebreaker.pegLabel', { n: i + 1, name: names[i] })}
                disabled={locked}
                onPress={pick}
              />
            ))}
          </View>

          <View style={[styles.rowCenter, { gap: theme.spacing.sm }]}>
            <Chip
              label={t('challenge.codebreaker.clear')}
              icon="backspace-outline"
              onPress={() => {
                if (!locked) {
                  setDraft((d) => ({ ...d, current: emptyCurrent(length) }));
                  setSlot(null);
                }
              }}
            />
          </View>
          <Button
            title={t('challenge.codebreaker.try')}
            icon="key-outline"
            size="lg"
            disabled={locked || !isComplete(current)}
            onPress={tryGuess}
          />
        </View>
      ) : null}

      {resultText || announce ? (
        <Text
          variant="caption"
          align="center"
          tone={
            result
              ? result.isCorrect
                ? 'success'
                : 'danger'
              : status === 'solved'
                ? 'success'
                : 'muted'
          }
          accessibilityLiveRegion="polite">
          {resultText ?? announce}
        </Text>
      ) : null}

      {/* Sent automatically; the button only matters when sending failed (try again). */}
      {over && !result ? (
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

/** A Clan friend in a round tinted frame (or a lock while the secret is hidden). */
const PegFace = memo(function PegFace({
  peg,
  avatar,
  size,
  hidden,
}: {
  peg: number | null;
  avatar: string | null;
  size: number;
  hidden?: boolean;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const xml = avatar ? clanSvg(avatar) : null;
  return (
    <View
      style={[
        styles.slot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: hidden ? c.borderStrong : c.border,
          backgroundColor: hidden
            ? c.surfaceAlt
            : peg !== null
              ? withAlpha(c.categories[peg % c.categories.length], 0.25)
              : c.surface,
        },
      ]}>
      {hidden ? (
        <Icon name="lock-closed" size={Math.round(size * 0.45)} color={c.textMuted} />
      ) : xml ? (
        <SvgXml xml={xml} width={size * 0.86} height={size * 0.86} />
      ) : null}
    </View>
  );
});

/**
 * One feedback marker. Colorblind-safe by shape: "exact" is a filled disc with a check, "near"
 * an open ring with a swap arrow; an unused spot is a small hollow dot.
 */
function Marker({ kind, size }: { kind: 'exact' | 'near' | 'none'; size: number }) {
  const theme = useTheme();
  const c = theme.colors;
  if (kind === 'none') {
    return (
      <View style={[styles.center, { width: size, height: size }]}>
        <View
          style={{
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size,
            borderWidth: 1.5,
            borderColor: c.border,
          }}
        />
      </View>
    );
  }
  const exact = kind === 'exact';
  return (
    <View
      style={[
        styles.center,
        {
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: exact ? c.success : c.surface,
          borderWidth: exact ? 0 : 2,
          borderColor: c.text,
        },
      ]}>
      <Icon
        name={exact ? 'checkmark' : 'swap-horizontal'}
        size={Math.round(size * 0.72)}
        color={exact ? c.onSuccess : c.text}
      />
    </View>
  );
}

/** Markers of one guess: ✓ first, then ↔, then empty dots (never in spot order). */
function FeedbackPins({ fb, length }: { fb: Feedback; length: number }) {
  const kinds: ('exact' | 'near' | 'none')[] = [
    ...new Array<'exact'>(fb.exact).fill('exact'),
    ...new Array<'near'>(fb.near).fill('near'),
  ];
  while (kinds.length < length) kinds.push('none');
  const perRow = Math.ceil(length / 2);
  return (
    <View style={[styles.pins, { width: perRow * 16 + 4 }]}>
      {kinds.map((k, i) => (
        <View key={i} style={styles.pin}>
          <Marker kind={k} size={14} />
        </View>
      ))}
    </View>
  );
}

const PaletteKey = memo(function PaletteKey({
  index,
  avatar,
  size,
  label,
  disabled,
  onPress,
}: {
  index: number;
  avatar: string;
  size: number;
  label: string;
  disabled: boolean;
  onPress: (index: number) => void;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const tint = c.categories[index % c.categories.length];
  const xml = clanSvg(avatar);
  const chunky = theme.surface === 'chunky';
  return (
    <PressableScale
      haptic
      disabled={disabled}
      onPress={() => onPress(index)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        styles.slot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: withAlpha(tint, theme.scheme === 'dark' ? 0.3 : 0.2),
          borderWidth: chunky ? 3 : 2,
          borderBottomWidth: chunky ? 6 : 2,
          borderColor: theme.surface === 'outlined' ? c.borderStrong : withAlpha(tint, 0.75),
        },
      ]}>
      {xml ? <SvgXml xml={xml} width={size * 0.8} height={size * 0.8} /> : null}
      {Platform.OS === 'web' ? (
        <Text variant="caption" tone="muted" maxFontSizeMultiplier={1} style={styles.keyHint}>
          {index + 1}
        </Text>
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  counters: { flexDirection: 'row', justifyContent: 'center' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guessRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  num: { width: 22, textAlign: 'center' },
  slot: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  pins: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' },
  pin: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  keyHint: { position: 'absolute', bottom: 2, right: 6 },
});
