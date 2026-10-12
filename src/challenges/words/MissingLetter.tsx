import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import type { MissingLetterPayload, WordResponse } from '@/api/types';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useCellFont } from '@/challenges/useCellFont';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { CHALLENGE_ROOT_ID, useWebKeys } from '@/challenges/useWebKeys';
import { normalizeWord, readWord } from '@/challenges/words/logic';
import { Button, Text, fontFor, useTheme } from '@/ui';

/**
 * `missing_letter`: the pattern with an input slot for every `_` (the device keyboard, so
 * accented letters work). Typing moves to the next slot, backspace on an empty slot goes back.
 * Submits `{ word }` once every slot has a letter.
 */
export function MissingLetter({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<MissingLetterPayload, WordResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const { pattern, hint } = item.payload;
  const chars = useMemo(() => Array.from(pattern), [pattern]);
  const blanks = useMemo(
    () => chars.map((ch, i) => (ch === '_' ? i : -1)).filter((i) => i >= 0),
    [chars],
  );
  const [fills, setFills] = useState<string[]>(() => blanks.map(() => ''));
  const inputs = useRef<(TextInput | null)[]>([]);
  const [width, onLayout] = useMeasuredWidth();
  const locked = !!disabled || !!pending || !!result;
  const full = fills.every((f) => f.length > 0);

  const word = chars.map((ch, i) => (ch === '_' ? (fills[blanks.indexOf(i)] ?? '') : ch)).join('');
  const submittedWord = result ? readWord(result.submitted) : pending ? readWord(pending) : null;
  const shownChars = submittedWord ? Array.from(normalizeWord(submittedWord)) : null;

  const submit = useCallback(() => {
    if (!locked && full) onSubmit({ word: word.toLocaleLowerCase() });
  }, [locked, full, onSubmit, word]);

  const setFill = (k: number, text: string) => {
    const letter = normalizeWord(text.replace(/[^\p{L}]/gu, '')).slice(-1);
    setFills((f) => f.map((v, i) => (i === k ? letter : v)));
    if (letter && k < blanks.length - 1) inputs.current[k + 1]?.focus();
  };

  // Web: a letter typed while no slot has focus yet (the slots mount after the first layout, and
  // autoFocus can land late) goes to the first empty slot instead of being lost.
  useWebKeys((key) => {
    if (/^\p{L}$/u.test(key)) {
      const empty = fills.findIndex((f) => !f);
      const k = empty >= 0 ? empty : blanks.length - 1;
      setFill(k, key);
      if (empty < 0 || k === blanks.length - 1) inputs.current[k]?.focus();
      return true;
    }
    if (key === 'Enter') {
      submit();
      return true;
    }
    return false;
  }, !locked);

  // Focus the first empty slot once the slots exist (they mount after the first layout). Not
  // `autoFocus` on slot 0: it could fire after early keystrokes and pull focus back.
  const slotsShown = width > 0;
  useEffect(() => {
    if (!slotsShown || locked) return;
    const empty = fills.findIndex((v) => !v);
    inputs.current[empty >= 0 ? empty : fills.length - 1]?.focus();
    // Only when the slots first appear, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsShown]);

  const gap = theme.spacing.xxs + 2;
  const box = width
    ? Math.floor(Math.min((width - gap * (chars.length - 1)) / chars.length, theme.touchTarget))
    : 0;
  const cellFont = useCellFont();
  const fontSize = cellFont(box, 0.55, 0.75);
  const verdict = result ? (result.isCorrect ? c.success : c.danger) : c.primary;

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.word.missingTitle')}
        </Text>
        {hint ? <Text tone="muted">{t('challenge.word.hint', { hint })}</Text> : null}
      </View>

      {box > 0 ? (
        <View style={[styles.row, { gap }]}>
          {chars.map((ch, i) => {
            const k = blanks.indexOf(i);
            const isBlank = k >= 0;
            const common = {
              width: box,
              height: Math.round(box * 1.25),
              borderRadius: theme.radius.sm,
            };
            if (!isBlank || shownChars) {
              const letter = shownChars ? (shownChars[i] ?? '') : ch;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    common,
                    {
                      backgroundColor: isBlank
                        ? result
                          ? result.isCorrect
                            ? c.successSoft
                            : c.dangerSoft
                          : c.primarySoft
                        : c.surfaceAlt,
                      borderWidth: isBlank ? 2 : 0,
                      borderColor: verdict,
                    },
                  ]}>
                  <Text
                    weight="bold"
                    color={isBlank ? verdict : c.text}
                    maxFontSizeMultiplier={1}
                    style={{ fontSize, lineHeight: Math.round(fontSize * 1.25) }}>
                    {letter}
                  </Text>
                </View>
              );
            }
            return (
              <TextInput
                key={i}
                ref={(el) => {
                  inputs.current[k] = el;
                }}
                value={fills[k]}
                onChangeText={(text) => setFill(k, text)}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === 'Backspace' && !fills[k] && k > 0) {
                    inputs.current[k - 1]?.focus();
                  }
                }}
                onSubmitEditing={submit}
                editable={!locked}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                selectTextOnFocus
                returnKeyType={k === blanks.length - 1 ? 'done' : 'next'}
                submitBehavior={k === blanks.length - 1 ? 'blurAndSubmit' : 'submit'}
                maxFontSizeMultiplier={1}
                accessibilityLabel={t('challenge.word.missingSlot', {
                  n: k + 1,
                  total: blanks.length,
                })}
                style={[
                  styles.box,
                  common,
                  {
                    textAlign: 'center',
                    padding: 0,
                    fontFamily: fontFor(theme, 'heading', 'bold'),
                    fontSize,
                    color: c.primary,
                    backgroundColor: c.surface,
                    // Web focus ring in the theme colour instead of the browser's black outline.
                    outlineColor: c.primary,
                    borderWidth: 2,
                    borderStyle: fills[k] ? 'solid' : 'dashed',
                    borderColor: fills[k] ? c.primary : c.borderStrong,
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}

      {!result ? (
        <Button
          title={t('challenge.check')}
          icon="checkmark-circle-outline"
          size="lg"
          disabled={locked || !full}
          loading={!!pending && !result}
          onPress={submit}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  box: { alignItems: 'center', justifyContent: 'center' },
});
