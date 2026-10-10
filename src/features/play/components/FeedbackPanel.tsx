import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { Button, Icon, Text, surfaceStyle, useTheme, withAlpha } from '@/ui';

interface FeedbackPanelProps {
  isCorrect: boolean;
  /** Text of the correct answer (shown when wrong). */
  correctText: string | null;
  explanation: string | null;
  pointsAwarded: number;
  onContinue: () => void;
  continueLabel?: string;
}

const KID_CHEERS_RIGHT = ['🎉', '🌟', '🥳', '💪', '🚀'];
const KID_CHEERS_WRONG = ['🤔', '🙈', '💡'];

/** Shown after each answer: correct / wrong, the correct answer, explanation, continue. */
export function FeedbackPanel({
  isCorrect,
  correctText,
  explanation,
  pointsAwarded,
  onContinue,
  continueLabel,
}: FeedbackPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  const tint = isCorrect ? c.success : c.danger;
  const emojiSet = isCorrect ? KID_CHEERS_RIGHT : KID_CHEERS_WRONG;
  const emoji = emojiSet[(pointsAwarded + (correctText?.length ?? 0)) % emojiSet.length];

  const entering = theme.reducedMotion
    ? undefined
    : theme.motion.enter === 'bounce'
      ? SlideInDown.springify().damping(theme.motion.spring.damping + 4)
      : FadeIn.duration(theme.motion.duration);

  return (
    <Animated.View
      entering={entering}
      accessibilityLiveRegion="assertive"
      style={[
        surfaceStyle(theme, { tint, selected: true }),
        styles.panel,
        {
          backgroundColor: isCorrect ? c.successSoft : c.dangerSoft,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
          borderRadius: theme.radius.lg,
        },
      ]}>
      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        {theme.emojiIcons ? (
          <RNText style={styles.emoji}>{emoji}</RNText>
        ) : (
          <View
            style={[
              styles.icon,
              {
                backgroundColor: tint,
                borderRadius: theme.surface === 'outlined' ? theme.radius.sm : 20,
              },
            ]}>
            <Icon
              name={isCorrect ? 'checkmark' : 'close'}
              size={24}
              color={isCorrect ? c.onSuccess : c.onDanger}
            />
          </View>
        )}
        <View style={styles.flex}>
          <Text variant="title" color={tint}>
            {isCorrect ? t('play.feedback.correct') : t('play.feedback.wrong')}
          </Text>
          {isCorrect && pointsAwarded > 0 ? (
            <Text variant="label" tone="muted">
              {t('play.feedback.points', { count: pointsAwarded })}
            </Text>
          ) : null}
        </View>
      </View>
      {!isCorrect && correctText ? (
        <View
          style={[
            styles.answer,
            {
              backgroundColor: withAlpha(c.success, 0.12),
              borderRadius: theme.radius.md,
              padding: theme.spacing.sm,
            },
          ]}>
          <Text variant="caption" tone="muted">
            {t('play.feedback.correctAnswerWas')}
          </Text>
          <Text weight="bold">{correctText}</Text>
        </View>
      ) : null}
      {explanation ? <Text tone="muted">{explanation}</Text> : null}
      <Button
        title={continueLabel ?? t('play.feedback.continue')}
        variant={isCorrect ? 'success' : 'primary'}
        iconRight="arrow-forward"
        onPress={onContinue}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  emoji: { fontSize: 40 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  answer: { gap: 2 },
});
