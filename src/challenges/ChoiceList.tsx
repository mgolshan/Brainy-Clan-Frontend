import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Choice } from '@/api/types';
import { Appear, Icon, PressableScale, Text, surfaceStyle, useTheme, withAlpha } from '@/ui';

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

/** `{ choice_id }` from a `correct_response`, or null. */
export function correctChoiceId(correct: unknown): string | null {
  return typeof correct === 'object' && correct !== null && 'choice_id' in correct
    ? String((correct as { choice_id: unknown }).choice_id)
    : null;
}

interface ChoiceButtonProps {
  choice: Choice;
  index: number;
  state: ChoiceState;
  disabled?: boolean;
  onPress: () => void;
}

const LETTERS = 'ABCDEFGH';

function ChoiceButton({ choice, index, state, disabled, onPress }: ChoiceButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (theme.reducedMotion) return;
    if (state === 'wrong') {
      shake.set(
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        ),
      );
    } else if (state === 'correct') {
      pop.set(
        withSequence(withSpring(1.05, theme.motion.spring), withSpring(1, theme.motion.spring)),
      );
    }
  }, [state, shake, pop, theme]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }, { scale: pop.get() }],
  }));

  const playful = theme.vibe === 'kid';
  const letterColor = playful ? c.categories[index % c.categories.length] : c.primary;
  const accent =
    state === 'correct'
      ? c.success
      : state === 'wrong'
        ? c.danger
        : state === 'selected'
          ? c.primary
          : null;

  const base = surfaceStyle(theme, { selected: !!accent, tint: accent ?? undefined });
  const bg =
    state === 'correct'
      ? c.successSoft
      : state === 'wrong'
        ? c.dangerSoft
        : state === 'selected'
          ? c.primarySoft
          : (base.backgroundColor as string);

  const bubbleSize = Math.round(theme.touchTarget * 0.7);
  const stateLabel =
    state === 'correct'
      ? t('play.correctAnswer')
      : state === 'wrong'
        ? t('play.yourAnswerWrong')
        : undefined;

  return (
    <Animated.View style={anim}>
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        haptic
        accessibilityRole="button"
        accessibilityLabel={stateLabel ? `${choice.text}, ${stateLabel}` : choice.text}
        accessibilityState={{ disabled: !!disabled, selected: state === 'selected' }}
        style={[
          base,
          styles.choice,
          {
            minHeight: theme.touchTarget + 10,
            backgroundColor: bg,
            borderRadius: playful ? theme.radius.lg : theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            gap: theme.spacing.sm,
            opacity: state === 'dimmed' ? 0.55 : 1,
          },
          accent && { borderColor: accent },
        ]}>
        <View
          style={[
            styles.letter,
            {
              width: bubbleSize,
              height: bubbleSize,
              borderRadius: theme.surface === 'outlined' ? theme.radius.sm : bubbleSize / 2,
              backgroundColor: accent ?? (playful ? letterColor : withAlpha(letterColor, 0.14)),
              borderWidth: theme.surface === 'outlined' && !accent ? 1.5 : 0,
              borderColor: c.borderStrong,
            },
          ]}>
          {state === 'correct' || state === 'wrong' ? (
            <Icon
              name={state === 'correct' ? 'checkmark' : 'close'}
              size={bubbleSize * 0.6}
              color={state === 'correct' ? c.onSuccess : c.onDanger}
            />
          ) : (
            <Text
              variant="label"
              weight="bold"
              color={accent ? c.onPrimary : playful ? '#FFFFFF' : letterColor}>
              {LETTERS[index] ?? '•'}
            </Text>
          )}
        </View>
        <Text variant="bodyLarge" weight="medium" style={styles.flex}>
          {choice.text}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

interface ChoiceListProps {
  choices: Choice[];
  /** The member's pick (before or after scoring). */
  selectedId?: string | null;
  /** Known after scoring. */
  correctId?: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
}

/** Answer buttons shared by multiple-choice style challenges. */
export function ChoiceList({
  choices,
  selectedId,
  correctId,
  disabled,
  onSelect,
}: ChoiceListProps) {
  const theme = useTheme();
  const scored = correctId != null;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {choices.map((choice, i) => {
        let state: ChoiceState = 'idle';
        if (scored) {
          if (choice.id === correctId) state = 'correct';
          else if (choice.id === selectedId) state = 'wrong';
          else state = 'dimmed';
        } else if (choice.id === selectedId) {
          state = 'selected';
        }
        return (
          <Appear key={choice.id} index={i}>
            <ChoiceButton
              choice={choice}
              index={i}
              state={state}
              disabled={disabled || scored}
              onPress={() => onSelect(choice.id)}
            />
          </Appear>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: 'row', alignItems: 'center' },
  letter: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
