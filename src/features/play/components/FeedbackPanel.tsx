import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { Button, ClanReaction, Icon, Text, surfaceStyle, useTheme, withAlpha } from '@/ui';

interface FeedbackPanelProps {
  isCorrect: boolean;
  /** Text of the correct answer (shown when wrong). */
  correctText: string | null;
  explanation: string | null;
  pointsAwarded: number;
  onContinue: () => void;
  continueLabel?: string;
  /** The member's avatar: their Clan character cheers (correct) or encourages (wrong). */
  avatar?: string | null;
}

/**
 * Shown after each answer: the member's Clan character reacting (cheer / encourage), correct /
 * wrong, the correct answer, explanation, continue.
 */
export function FeedbackPanel({
  isCorrect,
  correctText,
  explanation,
  pointsAwarded,
  onContinue,
  continueLabel,
  avatar,
}: FeedbackPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  const tint = isCorrect ? c.success : c.danger;
  const kid = theme.vibe === 'kid';

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
        <ClanReaction
          avatar={avatar}
          kind={isCorrect ? 'cheer' : 'encourage'}
          size={kid ? 60 : 46}
        />
        <View style={styles.flex}>
          <View style={[styles.row, { gap: theme.spacing.xs }]}>
            {kid ? null : (
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor: tint,
                    borderRadius: theme.surface === 'outlined' ? theme.radius.sm : 12,
                  },
                ]}>
                <Icon
                  name={isCorrect ? 'checkmark' : 'close'}
                  size={16}
                  color={isCorrect ? c.onSuccess : c.onDanger}
                />
              </View>
            )}
            <Text variant="title" color={tint} style={styles.flex}>
              {isCorrect ? t('play.feedback.correct') : t('play.feedback.wrong')}
            </Text>
          </View>
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
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  answer: { gap: 2 },
});
