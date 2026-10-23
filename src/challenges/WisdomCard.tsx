import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text as RNText, View } from 'react-native';

import type { ChoiceResponse, WisdomCardPayload } from '@/api/types';
import { ChoiceList, correctChoiceId } from '@/challenges/ChoiceList';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { Appear, Card, Text, useTheme, withAlpha } from '@/ui';

export function isWisdomCardPayload(value: unknown): value is WisdomCardPayload {
  const v = value as WisdomCardPayload | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.card?.text === 'string' &&
    typeof v.question === 'string' &&
    Array.isArray(v.choices) &&
    v.choices.length > 0 &&
    v.choices.every((c) => typeof c?.id === 'string' && typeof c?.text === 'string')
  );
}

/** `wisdom_card`: a quote card, then a question about it. */
export function WisdomCard({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<WisdomCardPayload, ChoiceResponse>) {
  const theme = useTheme();
  const { card, question, choices } = item.payload;
  const c = theme.colors;
  const attribution = [card.author, card.source].filter(Boolean).join(', ');

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Appear>
        <Card
          padding="lg"
          style={[
            styles.card,
            theme.vibe === 'kid' && {
              backgroundColor: withAlpha(c.accent, 0.22),
              borderColor: withAlpha(c.accent, 0.8),
            },
            theme.key === 'classic' && { borderLeftWidth: 6, borderLeftColor: c.accent },
          ]}>
          {theme.vibe === 'teen' ? (
            <LinearGradient
              colors={[
                withAlpha(c.gradient[0], 0.22),
                withAlpha(c.gradient[c.gradient.length - 1], 0.08),
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.lg }]}
            />
          ) : null}
          <RNText
            accessible={false}
            style={[
              styles.mark,
              {
                color: withAlpha(theme.vibe === 'kid' ? c.primary : c.accent, 0.55),
                fontFamily: theme.fonts.display,
              },
            ]}>
            {'“'}
          </RNText>
          <Text variant="quote" accessibilityLabel={`${card.text} ${attribution}`}>
            {card.text}
          </Text>
          {attribution ? (
            <Text variant="label" tone="muted" style={styles.author}>
              {`— ${attribution}`}
            </Text>
          ) : null}
        </Card>
      </Appear>
      <Text variant="title" accessibilityRole="header">
        {question}
      </Text>
      <ChoiceList
        choices={choices}
        selectedId={result?.submitted.choice_id ?? pending?.choice_id ?? null}
        correctId={result ? correctChoiceId(result.correctResponse) : null}
        disabled={disabled || !!pending}
        onSelect={(id) => onSubmit({ choice_id: id })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', gap: 8 },
  mark: { fontSize: 64, lineHeight: 64, marginBottom: -24 },
  author: { marginTop: 4 },
});
