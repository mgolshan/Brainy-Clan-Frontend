import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { ChatMessage } from '@/api/types';
import { MessageText } from '@/features/chat/components/MessageText';
import { authorName, messageTime, type OutboxItem } from '@/features/chat/messages';
import { Avatar, Icon, Text, useTheme, type Theme } from '@/ui';

const AVATAR_SIZE = 32;

/** Bubble shape per world: playful worlds get rounder bubbles; the corner by the author is tighter. */
function bubbleShape(theme: Theme, own: boolean): ViewStyle {
  const round =
    theme.vibe === 'kid'
      ? theme.radius.xl
      : theme.surface === 'outlined'
        ? theme.radius.md
        : theme.radius.lg;
  const tail = Math.min(round, theme.radius.sm);
  return {
    borderRadius: round,
    ...(own ? { borderBottomRightRadius: tail } : { borderBottomLeftRadius: tail }),
  };
}

interface BubbleFrameProps {
  own: boolean;
  tombstone?: boolean;
  failed?: boolean;
  children: React.ReactNode;
}

function BubbleFrame({ own, tombstone, failed, children }: BubbleFrameProps) {
  const theme = useTheme();
  const c = theme.colors;
  const filled = own && !tombstone;
  return (
    <View
      style={[
        styles.bubble,
        bubbleShape(theme, own),
        {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          backgroundColor: filled ? c.primary : tombstone ? c.surfaceAlt : c.surface,
          borderColor: failed
            ? c.danger
            : filled
              ? c.primaryPressed
              : theme.surface === 'outlined'
                ? c.borderStrong
                : c.border,
          borderWidth: failed ? 2 : theme.vibe === 'kid' ? 2 : Math.max(1, theme.borderWidth),
        },
      ]}>
      {children}
    </View>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  own: boolean;
  showAuthor: boolean;
  locale: string;
  /** Long press (author or admin): offers "Delete". */
  onLongPress?: (message: ChatMessage) => void;
}

/** A stored message: own on the right (world primary), others on the left with their Clan avatar. */
export const MessageBubble = memo(function MessageBubble({
  message,
  own,
  showAuthor,
  locale,
  onLongPress,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const name = authorName(message, t);
  const time = messageTime(message.created_at, locale);
  const filled = own && !message.deleted;
  const textColor = filled ? c.onPrimary : c.text;
  const metaColor = filled ? c.onPrimary : c.textMuted;
  const deleteAction = onLongPress ? [{ name: 'delete', label: t('chat.delete') }] : undefined;

  return (
    <View style={[styles.row, own ? styles.rowOwn : null, { marginTop: showAuthor ? 10 : 3 }]}>
      {!own ? (
        <View style={{ width: AVATAR_SIZE }}>
          {showAuthor ? <Avatar avatar={message.avatar} size={AVATAR_SIZE} /> : null}
        </View>
      ) : null}
      <Pressable
        onLongPress={onLongPress ? () => onLongPress(message) : undefined}
        delayLongPress={350}
        accessibilityRole="text"
        accessibilityHint={onLongPress ? t('chat.longPressHint') : undefined}
        accessibilityActions={deleteAction}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') onLongPress?.(message);
        }}
        style={[styles.column, own ? styles.columnOwn : null]}>
        {showAuthor && !own ? (
          <Text variant="caption" weight="bold" tone="muted" numberOfLines={1}>
            {name}
          </Text>
        ) : null}
        <BubbleFrame own={own} tombstone={message.deleted}>
          {message.deleted ? (
            <View style={styles.tombstone}>
              <Icon name="trash-outline" size={14} color={c.textMuted} />
              <Text variant="label" tone="muted" style={styles.italic}>
                {t('chat.deleted')}
              </Text>
            </View>
          ) : (
            <MessageText body={message.body} color={textColor} />
          )}
          <Text variant="caption" color={metaColor} align="right" style={styles.time}>
            {time}
          </Text>
        </BubbleFrame>
      </Pressable>
    </View>
  );
});

interface PendingBubbleProps {
  item: OutboxItem;
  onRetry: (item: OutboxItem) => void;
  onLongPress: (item: OutboxItem) => void;
}

/** A message on its way: "Sending…", "Waiting for a connection…" or "Not sent · Tap to retry". */
export const PendingBubble = memo(function PendingBubble({
  item,
  onRetry,
  onLongPress,
}: PendingBubbleProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const failed = item.status === 'failed';
  const status = failed
    ? item.errorCode === 'rate_limited'
      ? t('chat.failedRateLimited')
      : item.errorCode === 'chat_disabled'
        ? t('chat.disabledTitle')
        : t('chat.failed')
    : item.status === 'sending'
      ? t('chat.sending')
      : t('chat.waiting');

  return (
    <View style={[styles.row, styles.rowOwn, { marginTop: 3 }]}>
      <Pressable
        onPress={failed ? () => onRetry(item) : undefined}
        onLongPress={() => onLongPress(item)}
        delayLongPress={350}
        accessibilityRole={failed ? 'button' : 'text'}
        accessibilityHint={failed ? t('chat.retryHint') : undefined}
        style={[styles.column, styles.columnOwn]}>
        <BubbleFrame own failed={failed}>
          <MessageText body={item.body} color={c.onPrimary} />
        </BubbleFrame>
        <View style={styles.status}>
          <Icon
            name={
              failed
                ? 'alert-circle'
                : item.status === 'sending'
                  ? 'time-outline'
                  : 'cloud-offline-outline'
            }
            size={14}
            color={failed ? c.danger : c.textMuted}
          />
          <Text variant="caption" tone={failed ? 'danger' : 'muted'}>
            {status}
          </Text>
        </View>
      </Pressable>
    </View>
  );
});

/** "Today" / "Yesterday" / date between days. */
export function DaySeparator({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.day} accessibilityRole="header">
      <View
        style={[
          styles.dayPill,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: Math.max(1, theme.borderWidth),
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.md,
          },
        ]}>
        <Text variant="caption" weight="bold" tone="muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, width: '100%' },
  rowOwn: { justifyContent: 'flex-end' },
  column: { maxWidth: '80%', flexShrink: 1, gap: 2, alignItems: 'flex-start' },
  columnOwn: { alignItems: 'flex-end' },
  bubble: { maxWidth: '100%', flexShrink: 1, gap: 2 },
  tombstone: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  italic: { fontStyle: 'italic' },
  time: { opacity: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  day: { alignItems: 'center', marginVertical: 12 },
  dayPill: { paddingVertical: 4 },
});
