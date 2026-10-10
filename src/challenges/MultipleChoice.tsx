import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { ChoiceResponse, MultipleChoicePayload } from '@/api/types';
import { ChoiceList, correctChoiceId } from '@/challenges/ChoiceList';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { Appear, Text, useTheme } from '@/ui';

export function isMultipleChoicePayload(value: unknown): value is MultipleChoicePayload {
  const v = value as MultipleChoicePayload | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.question === 'string' &&
    Array.isArray(v.choices) &&
    v.choices.length > 0 &&
    v.choices.every((c) => typeof c?.id === 'string' && typeof c?.text === 'string')
  );
}

/** `multiple_choice`: question (+ optional image) and tappable choices. Tap = answer. */
export function MultipleChoice({
  item,
  onSubmit,
  disabled,
  pending,
  result,
}: ChallengeComponentProps<MultipleChoicePayload, ChoiceResponse>) {
  const theme = useTheme();
  const { question, choices, image_url } = item.payload;
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Appear>
        <Text variant="heading" accessibilityRole="header">
          {question}
        </Text>
      </Appear>
      {image_url ? (
        <Image
          source={{ uri: image_url }}
          style={[styles.image, { borderRadius: theme.radius.lg }]}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      ) : null}
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
  image: { width: '100%', aspectRatio: 16 / 9 },
});
