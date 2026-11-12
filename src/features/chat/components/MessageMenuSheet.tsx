import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import type { ChatReactionKey } from '@/api/types';
import { useFamily } from '@/features/family/hooks';
import {
  REACTION_EMOJI,
  REACTION_KEYS,
  reactorNames,
  type ShownReaction,
} from '@/features/chat/reactions';
import { Button, Card, Text, useTheme, withAlpha, type IconName } from '@/ui';

/** Backdrop + centered card, the chat's in-app sheet pattern (no system alert: none on web). */
function SheetFrame({
  onClose,
  closeLabel,
  children,
}: {
  onClose: () => void;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal
      visible
      transparent
      animationType={theme.reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View style={styles.sheetWrap}>
          <Card padding="lg" style={{ gap: theme.spacing.sm }}>
            {children}
          </Card>
        </View>
      </View>
    </Modal>
  );
}

export interface MenuAction {
  label: string;
  icon: IconName;
  variant: 'danger' | 'outline' | 'primary';
  onPress: () => void;
}

interface MessageMenuSheetProps {
  /** `null`: no reactions (tombstone). */
  mine: ChatReactionKey | null;
  canReact: boolean;
  onReact: (key: ChatReactionKey) => void;
  /** Delete / report / review, and "Who reacted" when there are reactions. */
  actions: MenuAction[];
  onClose: () => void;
}

/**
 * Long press on a message: the 6 reactions on top (your own highlighted; tapping it removes it),
 * then the message actions that a long press offered before (delete, report, review).
 */
export function MessageMenuSheet({
  mine,
  canReact,
  onReact,
  actions,
  onClose,
}: MessageMenuSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const size = Math.max(44, theme.touchTarget);
  return (
    <SheetFrame onClose={onClose} closeLabel={t('common.cancel')}>
      <Text variant="title" accessibilityRole="header">
        {t('chat.menuTitle')}
      </Text>
      {canReact ? (
        <View style={styles.reactions} accessibilityLabel={t('chat.react')}>
          {REACTION_KEYS.map((key) => {
            const selected = mine === key;
            const name = t(`chat.reactionNames.${key}`);
            return (
              <Pressable
                key={key}
                onPress={() => onReact(key)}
                accessibilityRole="button"
                accessibilityLabel={
                  selected ? t('chat.removeReaction', { name }) : t('chat.reactWith', { name })
                }
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.reaction,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: selected ? 2 : 0,
                    borderColor: c.primary,
                    backgroundColor: selected
                      ? withAlpha(c.primary, theme.scheme === 'dark' ? 0.28 : 0.14)
                      : c.surfaceAlt,
                    transform: pressed && !theme.reducedMotion ? [{ scale: 0.92 }] : undefined,
                  },
                ]}>
                <RNText style={styles.emoji}>{REACTION_EMOJI[key]}</RNText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
        {actions.map((a) => (
          <Button
            key={a.label}
            title={a.label}
            icon={a.icon}
            variant={a.variant}
            onPress={a.onPress}
          />
        ))}
        <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
      </View>
    </SheetFrame>
  );
}

/** Who reacted to a message, per reaction (nicknames from the family; unknown ids skipped). */
export function ReactorsSheet({
  reactions,
  onClose,
}: {
  reactions: readonly ShownReaction[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const family = useFamily();
  const rows = reactorNames(reactions, family.data?.members);
  return (
    <SheetFrame onClose={onClose} closeLabel={t('common.done')}>
      <Text variant="title" accessibilityRole="header">
        {t('chat.whoReacted')}
      </Text>
      {rows.map((row) => (
        <View
          key={row.key}
          style={[styles.whoRow, { gap: theme.spacing.sm }]}
          accessible
          accessibilityLabel={`${t(`chat.reactionNames.${row.key}`)}: ${row.names.join(', ')}`}>
          <RNText style={styles.emoji}>{row.emoji}</RNText>
          <Text style={styles.flex}>{row.names.join(', ')}</Text>
        </View>
      ))}
      <Button title={t('common.done')} variant="ghost" onPress={onClose} />
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  sheetWrap: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  reaction: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  whoRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
