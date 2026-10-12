import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { AnagramPayload, WordResponse } from '@/api/types';
import { PadKey } from '@/challenges/PadKey';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { useCellFont } from '@/challenges/useCellFont';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { CHALLENGE_ROOT_ID, useWebKeys } from '@/challenges/useWebKeys';
import { normalizeWord, readWord, shuffledOrder } from '@/challenges/words/logic';
import { Button, Chip, PressableScale, Text, useTheme } from '@/ui';

/**
 * `anagram`: tap letter tiles into the slots (tap a filled slot to give its letter back),
 * shuffle, backspace. Submits `{ word }` once every slot is filled.
 */
export function Anagram({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<AnagramPayload, WordResponse>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const { letters, hint } = item.payload;
  const [order, setOrder] = useState(() => letters.map((_, i) => i));
  /** Tile indices (into `letters`) in slot order. */
  const [picked, setPicked] = useState<number[]>([]);
  const [width, onLayout] = useMeasuredWidth();
  const locked = !!disabled || !!pending || !!result;
  const full = picked.length === letters.length;
  const word = picked.map((i) => letters[i]).join('');

  const submittedWord = result ? readWord(result.submitted) : pending ? readWord(pending) : null;
  const slotLetters = useMemo(
    () =>
      submittedWord
        ? Array.from(normalizeWord(submittedWord))
        : letters.map((_, k) => (picked[k] !== undefined ? letters[picked[k]] : '')),
    [submittedWord, letters, picked],
  );

  const pick = useCallback(
    (i: number) => {
      if (locked) return;
      setPicked((p) => (p.includes(i) || p.length >= letters.length ? p : [...p, i]));
    },
    [locked, letters.length],
  );
  const unpickAt = (slot: number) => {
    if (!locked) setPicked((p) => p.filter((_, k) => k !== slot));
  };
  const back = useCallback(() => {
    if (!locked) setPicked((p) => p.slice(0, -1));
  }, [locked]);
  const submit = useCallback(() => {
    if (!locked && full) onSubmit({ word: word.toLocaleLowerCase() });
  }, [locked, full, onSubmit, word]);

  useWebKeys((key) => {
    if (key === 'Backspace') {
      back();
      return true;
    }
    if (key === 'Enter') {
      submit();
      return true;
    }
    if (key.length === 1) {
      const upper = normalizeWord(key);
      const tile = order.find((i) => !picked.includes(i) && normalizeWord(letters[i]) === upper);
      if (tile !== undefined) {
        pick(tile);
        return true;
      }
    }
    return false;
  }, !locked);

  const gap = theme.spacing.xs;
  const count = letters.length;
  const perRow = Math.min(count, 8);
  const tile = width
    ? Math.floor(Math.min((width - gap * (perRow - 1)) / perRow, theme.touchTarget * 1.15))
    : 0;
  const cellFont = useCellFont();
  const tileFont = cellFont(tile, 0.5, 0.7);
  const slotColor = result ? (result.isCorrect ? c.success : c.danger) : c.primary;

  return (
    <View style={{ gap: theme.spacing.md }} onLayout={onLayout} nativeID={CHALLENGE_ROOT_ID}>
      <View style={{ gap: theme.spacing.xxs }}>
        <Text variant="title" accessibilityRole="header">
          {t('challenge.word.anagramTitle')}
        </Text>
        {hint ? <Text tone="muted">{t('challenge.word.hint', { hint })}</Text> : null}
      </View>

      {tile > 0 ? (
        <View
          style={[styles.wrap, { gap }]}
          accessibilityLabel={t('challenge.word.slots', { word: slotLetters.join('') || '…' })}>
          {slotLetters.map((letter, k) => (
            <PressableScale
              key={k}
              onPress={() => unpickAt(k)}
              disabled={locked || !letter}
              accessibilityRole="button"
              accessibilityLabel={letter || t('challenge.word.emptySlot')}
              style={[
                styles.slot,
                {
                  width: tile,
                  height: tile,
                  borderRadius: theme.key === 'classic' ? theme.radius.sm : theme.radius.md,
                  borderWidth: 2,
                  borderStyle: letter ? 'solid' : 'dashed',
                  borderColor: letter ? slotColor : c.borderStrong,
                  backgroundColor: result
                    ? result.isCorrect
                      ? c.successSoft
                      : c.dangerSoft
                    : letter
                      ? c.primarySoft
                      : c.surfaceAlt,
                },
              ]}>
              <Text
                variant="heading"
                weight="bold"
                color={slotColor}
                maxFontSizeMultiplier={1}
                style={{ fontSize: tileFont, lineHeight: Math.round(tileFont * 1.2) }}>
                {letter}
              </Text>
            </PressableScale>
          ))}
        </View>
      ) : null}

      {!result && tile > 0 ? (
        <>
          <View style={[styles.wrap, { gap }]}>
            {order.map((i) => (
              <PadKey
                key={i}
                label={picked.includes(i) ? ' ' : letters[i]}
                accessibilityLabel={
                  picked.includes(i)
                    ? t('challenge.word.usedLetter', { letter: normalizeWord(letters[i]) })
                    : normalizeWord(letters[i])
                }
                width={tile}
                height={tile}
                tone={picked.includes(i) ? 'faded' : 'default'}
                disabled={locked || picked.includes(i)}
                onPress={() => pick(i)}
              />
            ))}
          </View>
          <View style={[styles.wrap, { gap: theme.spacing.sm }]}>
            <Chip
              label={t('challenge.word.shuffle')}
              icon="shuffle"
              onPress={() => !locked && setOrder((o) => shuffledOrder(o))}
            />
            <Chip label={t('challenge.word.backspace')} icon="backspace-outline" onPress={back} />
          </View>
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

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  slot: { alignItems: 'center', justifyContent: 'center' },
});
