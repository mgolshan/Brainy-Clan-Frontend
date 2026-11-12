import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import type { ChatReactionKey } from '@/api/types';
import { REACTION_EMOJI, type ShownReaction } from '@/features/chat/reactions';
import { Text, useTheme, withAlpha } from '@/ui';

interface ReactionChipsProps {
  reactions: readonly ShownReaction[];
  own: boolean;
  /** Tap: your own reaction → remove it; another → set it (replacing yours). */
  onToggle: (key: ChatReactionKey) => void;
  /** Press and hold: who reacted. */
  onShowWho: () => void;
}

/** Reaction counts under a bubble (fixed set); the viewer's own reaction is highlighted. */
export const ReactionChips = memo(function ReactionChips({
  reactions,
  own,
  onToggle,
  onShowWho,
}: ReactionChipsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  if (reactions.length === 0) return null;
  return (
    <View
      style={[styles.row, own ? styles.rowOwn : null]}
      accessibilityLabel={t('chat.reactionsLabel')}>
      {reactions.map((r) => {
        const name = t(`chat.reactionNames.${r.key}`);
        const label = t('chat.reactionChip', { name, count: r.count });
        return (
          <Pressable
            key={r.key}
            onPress={() => onToggle(r.key)}
            onLongPress={onShowWho}
            delayLongPress={350}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={r.mine ? `${label}, ${t('chat.reactionMine')}` : label}
            accessibilityHint={
              r.mine ? t('chat.reactionRemoveHint') : t('chat.reactionAddHint', { name })
            }
            accessibilityState={{ selected: r.mine }}
            accessibilityActions={[{ name: 'whoReacted', label: t('chat.whoReacted') }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'whoReacted') onShowWho();
            }}
            style={({ pressed }) => [
              styles.chip,
              {
                minHeight: 30,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.sm,
                borderWidth: r.mine ? 2 : Math.max(1, theme.borderWidth),
                borderColor: r.mine ? c.primary : c.border,
                backgroundColor: r.mine
                  ? withAlpha(c.primary, theme.scheme === 'dark' ? 0.28 : 0.14)
                  : c.surface,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <RNText style={styles.emoji}>{REACTION_EMOJI[r.key]}</RNText>
            <Text variant="caption" weight="bold" tone={r.mine ? 'primary' : 'default'}>
              {r.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  rowOwn: { justifyContent: 'flex-end' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  emoji: { fontSize: 15 },
});
