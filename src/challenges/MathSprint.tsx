import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { MathAnswerFormat, MathSprintPayload, MathSprintResponse } from '@/api/types';
import { PadKey } from '@/challenges/PadKey';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { CHALLENGE_ROOT_ID, useWebKeys } from '@/challenges/useWebKeys';
import { Appear, Button, Text, surfaceStyle, useTheme } from '@/ui';

const FORMATS: MathAnswerFormat[] = ['integer', 'decimal', 'fraction'];

export function isMathSprintPayload(value: unknown): value is MathSprintPayload {
  const v = value as MathSprintPayload | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.question === 'string' &&
    v.question.length > 0 &&
    FORMATS.includes(v.answer_format) &&
    (v.time_limit_ms == null || (typeof v.time_limit_ms === 'number' && v.time_limit_ms > 0))
  );
}

export function readMathValue(value: unknown): string | null {
  return typeof value === 'object' && value !== null && 'value' in value
    ? String((value as { value: unknown }).value)
    : null;
}

/**
 * The bottom keypad row. Answers may be negative in every format (API.md), so ± is always there;
 * decimals and fractions also get "." or "/" (that row then has four slightly narrower keys).
 */
function bottomRow(format: MathAnswerFormat): string[] {
  if (format === 'integer') return ['-', '0', 'back'];
  return ['-', '0', format === 'fraction' ? '/' : '.', 'back'];
}

/** Append a key to the typed answer, keeping it well-formed for the format. */
export function typeKey(current: string, key: string, format: MathAnswerFormat): string {
  if (key === '-') return current.startsWith('-') ? current.slice(1) : `-${current}`;
  if (key === '.' || key === '/') {
    if (format === 'integer') return current;
    if (format === 'decimal' && key !== '.') return current;
    if (format === 'fraction' && key !== '/') return current;
    const digits = current.replace('-', '');
    if (current.includes(key) || digits.length === 0) return current;
    return current + key;
  }
  if (!/^[0-9]$/.test(key) || current.replace(/[-./]/g, '').length >= 9) return current;
  return current + key;
}

function isComplete(value: string): boolean {
  return /^-?\d+([./]\d+)?$/.test(value);
}

/** Advisory countdown: a shrinking bar, or seconds as text with reduced motion. */
function Countdown({ ms, stopped }: { ms: number; stopped: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const progress = useSharedValue(1);
  const [left, setLeft] = useState(Math.ceil(ms / 1000));

  useEffect(() => {
    const started = Date.now();
    if (!theme.reducedMotion) {
      progress.set(withTiming(0, { duration: ms, easing: Easing.linear }));
    }
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((ms - (Date.now() - started)) / 1000));
      setLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 250);
    return () => {
      clearInterval(timer);
      cancelAnimation(progress);
    };
  }, [ms, progress, theme.reducedMotion]);

  useEffect(() => {
    if (stopped) cancelAnimation(progress);
  }, [stopped, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const late = left === 0;
  const color = late ? c.textSubtle : left <= 3 ? c.warning : c.primary;

  return (
    <View
      style={{ gap: theme.spacing.xxs }}
      accessibilityLabel={
        late ? t('challenge.math.timeUp') : t('challenge.math.secondsLeft', { count: left })
      }>
      {theme.reducedMotion ? null : (
        <View
          style={[
            styles.track,
            { backgroundColor: c.surfaceAlt, borderRadius: theme.radius.pill },
          ]}>
          <Animated.View
            style={[styles.fill, { backgroundColor: color, borderRadius: theme.radius.pill }, fill]}
          />
        </View>
      )}
      <Text variant="caption" tone={late ? 'subtle' : 'muted'} align="right">
        {late ? t('challenge.math.timeUp') : t('challenge.math.secondsLeft', { count: left })}
      </Text>
    </View>
  );
}

/**
 * `math_sprint`: question, on-screen keypad (± always; "/" or "." only when the answer format
 * needs it) and an advisory countdown bar from `time_limit_ms` (hidden with calm timers). Answering
 * late still submits.
 */
export function MathSprint({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<MathSprintPayload, MathSprintResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const { question, answer_format: format, time_limit_ms: limit } = item.payload;
  const [value, setValue] = useState('');
  const [width, onLayout] = useMeasuredWidth();
  const locked = !!disabled || !!pending || !!result;
  const shown = result
    ? (readMathValue(result.submitted) ?? '')
    : pending
      ? (readMathValue(pending) ?? value)
      : value;
  const ready = isComplete(value);

  const press = useCallback(
    (key: string) => {
      if (locked) return;
      if (key === 'back') setValue((v) => v.slice(0, -1));
      else setValue((v) => typeKey(v, key, format));
    },
    [locked, format],
  );
  const submit = useCallback(() => {
    if (!locked && isComplete(value)) onSubmit({ value });
  }, [locked, value, onSubmit]);

  useWebKeys((key) => {
    if (/^[0-9]$/.test(key) || key === '.' || key === '/' || key === '-') {
      press(key);
      return true;
    }
    if (key === ',') {
      press('.');
      return true;
    }
    if (key === 'Backspace') {
      press('back');
      return true;
    }
    if (key === 'Enter') {
      submit();
      return true;
    }
    return false;
  }, !locked);

  const gap = theme.spacing.sm;
  const keyWidth = width ? Math.floor(Math.min((width - gap * 2) / 3, theme.touchTarget * 2.2)) : 0;
  const keyHeight = Math.max(theme.touchTarget, Math.round(theme.touchTarget * 1.05));
  const rows = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], bottomRow(format)];
  // Rows keep the same total width: a four-key row shares the width of three keys + two gaps.
  const widthFor = (count: number) =>
    count <= 3 ? keyWidth : Math.floor((keyWidth * 3 + gap * 2 - gap * (count - 1)) / count);
  const showTimer = limit != null && !theme.calmTimers && !result;
  const tint = result ? (result.isCorrect ? c.success : c.danger) : c.primary;
  // "7 × 8" gets a trailing "="; a worded question is shown as is.
  const expression = !/\p{L}{2,}/u.test(question);
  const display = shown.replace('-', '−').replace('/', ' ⁄ ');

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      {showTimer ? <Countdown ms={limit} stopped={locked} /> : null}
      <Appear>
        {expression ? (
          <Text variant="display" align="center" accessibilityRole="header">
            {`${question.replace(/\s*=\s*\?*\s*$/, '')} =`}
          </Text>
        ) : (
          <Text variant="heading" align="center" accessibilityRole="header">
            {question}
          </Text>
        )}
      </Appear>
      <View
        accessibilityLabel={t('challenge.math.yourAnswer', { value: shown || '…' })}
        style={[
          surfaceStyle(theme, { tint, selected: true }),
          styles.answer,
          {
            minHeight: theme.touchTarget + 16,
            borderRadius: theme.radius.md,
            backgroundColor: result ? (result.isCorrect ? c.successSoft : c.dangerSoft) : c.surface,
          },
        ]}>
        <Text variant="display" color={shown ? tint : c.textSubtle} align="center">
          {display || '?'}
        </Text>
      </View>
      {format === 'fraction' && !result ? (
        <Text variant="caption" tone="muted" align="center">
          {t('challenge.math.fractionHint')}
        </Text>
      ) : null}

      {!result && keyWidth > 0 ? (
        <>
          <View style={{ gap, alignItems: 'center' }}>
            {rows.map((row, r) => (
              <View key={r} style={[styles.row, { gap }]}>
                {row.map((key) => (
                  <PadKey
                    key={key}
                    label={key === 'back' ? undefined : key === '-' ? '±' : key}
                    icon={key === 'back' ? 'backspace-outline' : undefined}
                    width={widthFor(row.length)}
                    height={keyHeight}
                    tone={
                      key === 'back' || key === '-' || key === '.' || key === '/'
                        ? 'faded'
                        : 'default'
                    }
                    disabled={locked}
                    accessibilityLabel={
                      key === 'back'
                        ? t('challenge.math.delete')
                        : key === '-'
                          ? t('challenge.math.minus')
                          : key === '/'
                            ? t('challenge.math.fractionBar')
                            : key === '.'
                              ? t('challenge.math.decimalPoint')
                              : key
                    }
                    onPress={() => press(key)}
                  />
                ))}
              </View>
            ))}
          </View>
          <Button
            title={t('challenge.check')}
            icon="checkmark-circle-outline"
            size="lg"
            disabled={locked || !ready}
            loading={!!pending && !result}
            onPress={submit}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, overflow: 'hidden' },
  fill: { height: '100%' },
  answer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  row: { flexDirection: 'row' },
});
