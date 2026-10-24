import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ChatMessage } from '@/api/types';
import { useIsAdmin, usePolicy } from '@/features/auth/hooks';
import { isChatDisabledError } from '@/features/chat/api';
import { Composer } from '@/features/chat/components/Composer';
import { ConfirmSheet } from '@/features/chat/components/ConfirmSheet';
import {
  DaySeparator,
  MessageBubble,
  PendingBubble,
} from '@/features/chat/components/MessageBubble';
import {
  useAppActive,
  useChatAccess,
  useChatHistory,
  useChatPolling,
  useDeleteChatMessage,
  useMarkChatRead,
} from '@/features/chat/hooks';
import {
  buildChatRows,
  canDeleteMessage,
  dayLabel,
  flattenHistory,
  pendingForMember,
  retentionText,
  type ChatRow,
  type OutboxItem,
} from '@/features/chat/messages';
import {
  discardChatMessage,
  retryChatMessage,
  sendChatMessage,
  useChatOutbox,
} from '@/features/chat/outbox';
import { canPurchaseFamilyPlan } from '@/features/worlds/catalog';
import {
  EmptyState,
  ErrorState,
  Icon,
  Loading,
  PressableScale,
  SceneBackground,
  Text,
  useTheme,
} from '@/ui';
import { maxContentWidth } from '@/ui/themes/layout';

type DeleteTarget =
  { kind: 'message'; message: ChatMessage } | { kind: 'pending'; item: OutboxItem };

/** Safe area + world scene + centered reading column; the composer sits above the keyboard. */
function ChatFrame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  const theme = useTheme();
  const maxWidth = maxContentWidth('reading', theme.layout);
  const column = { width: '100%' as const, maxWidth, alignSelf: 'center' as const };
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <SceneBackground animated={false} />
      <KeyboardAvoidingView
        style={styles.flex}
        // Android is edge-to-edge (SDK 57): the window no longer resizes for the keyboard.
        behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <View style={[styles.flex, column]}>{children}</View>
        {footer ? (
          <View
            style={[
              styles.footer,
              {
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.background,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              },
            ]}>
            <View style={column}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ retentionDays }: { retentionDays: number | null | undefined }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const policy = usePolicy();
  const isAdmin = useIsAdmin();
  const retention = retentionText(retentionDays, t);
  // Admins on the free plan who may buy: a small way to keep messages longer.
  const upsell = canPurchaseFamilyPlan(policy, isAdmin) && policy?.tier === 'free';
  return (
    <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, gap: 4 }}>
      <Text variant={theme.key === 'classic' ? 'heading' : 'display'} accessibilityRole="header">
        {t('chat.title')}
      </Text>
      {retention ? (
        <View style={styles.retention}>
          <Icon name="time-outline" size={16} color={theme.colors.textMuted} />
          <Text variant="caption" tone="muted" style={styles.flexShrink}>
            {retention}
          </Text>
        </View>
      ) : null}
      {upsell ? (
        <PressableScale
          onPress={() => router.push('/family-plan')}
          accessibilityRole="link"
          hitSlop={8}
          style={styles.retention}>
          <Icon name="star" size={16} color={theme.colors.primary} />
          <Text variant="caption" tone="primary" weight="bold" style={styles.flexShrink}>
            {t('chat.upsell')}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** "A parent turned chat off for you". */
function ChatDisabled() {
  const { t } = useTranslation();
  return (
    <ChatFrame>
      <View style={[styles.flex, styles.center]}>
        <EmptyState
          title={t('chat.disabledTitle')}
          body={t('chat.disabledBody')}
          emoji="💬"
          icon="chatbubbles-outline"
        />
      </View>
    </ChatFrame>
  );
}

function ChatRoom({ memberId }: { memberId: number }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isAdmin = useIsAdmin();
  const policy = usePolicy();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const history = useChatHistory(true);
  const live = focused && appActive;
  useChatPolling(live && history.isSuccess);
  const outbox = useChatOutbox((s) => s.items);
  const remove = useDeleteChatMessage();
  const markRead = useMarkChatRead(history.meta?.last_read_id);
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const list = useRef<FlatList<ChatRow>>(null);

  const messages = useMemo(() => flattenHistory(history.data), [history.data]);
  const rows = useMemo(
    () => buildChatRows(messages, pendingForMember(outbox, memberId, messages), memberId),
    [messages, outbox, memberId],
  );
  const locale = i18n.language;

  // Mark read what the member actually sees (stable callback for FlatList).
  const markReadRef = useRef<(id: number) => void>(() => undefined);
  useEffect(() => {
    markReadRef.current = live ? markRead : () => undefined;
  }, [live, markRead]);
  const [onViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken<ChatRow>[] }) => {
        let max = 0;
        for (const v of viewableItems) {
          if (v.item?.type === 'message' && v.item.message.id > max) max = v.item.message.id;
        }
        if (max > 0) markReadRef.current(max);
      },
  );
  // Back on the screen (or new messages) while the latest ones are in view: they are read.
  const latestId = messages[0]?.id ?? null;
  useEffect(() => {
    if (live && !awayFromLatest && latestId !== null) markRead(latestId);
  }, [live, awayFromLatest, latestId, markRead]);

  const onLongPress = useCallback(
    (message: ChatMessage) => {
      if (canDeleteMessage(message, memberId, isAdmin)) setTarget({ kind: 'message', message });
    },
    [memberId, isAdmin],
  );
  const onPendingLongPress = useCallback(
    (item: OutboxItem) => setTarget({ kind: 'pending', item }),
    [],
  );
  const onRetry = useCallback(
    (item: OutboxItem) => retryChatMessage(memberId, item.clientId),
    [memberId],
  );

  const send = (text: string) => {
    const sent = sendChatMessage(memberId, text) !== null;
    if (sent) list.current?.scrollToOffset({ offset: 0, animated: !theme.reducedMotion });
    return sent;
  };

  const renderItem = useCallback(
    ({ item }: { item: ChatRow }) => {
      switch (item.type) {
        case 'day':
          return <DaySeparator label={dayLabel(item.iso, locale, t)} />;
        case 'pending':
          return (
            <PendingBubble item={item.item} onRetry={onRetry} onLongPress={onPendingLongPress} />
          );
        case 'message':
          return (
            <MessageBubble
              message={item.message}
              own={item.own}
              showAuthor={item.showAuthor}
              locale={locale}
              onLongPress={
                canDeleteMessage(item.message, memberId, isAdmin) ? onLongPress : undefined
              }
            />
          );
      }
    },
    [locale, t, onRetry, onPendingLongPress, onLongPress, memberId, isAdmin],
  );

  if (history.isError && isChatDisabledError(history.error)) return <ChatDisabled />;

  const retentionDays = policy?.chat?.retention_days ?? history.meta?.retention_days;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const away = e.nativeEvent.contentOffset.y > 400;
    if (away !== awayFromLatest) setAwayFromLatest(away);
  };

  return (
    <ChatFrame footer={<Composer onSend={send} />}>
      <Header retentionDays={retentionDays} />
      {history.isPending ? (
        <Loading />
      ) : history.isError && messages.length === 0 ? (
        <View style={[styles.flex, styles.center]}>
          <ErrorState error={history.error} onRetry={() => void history.refetch()} />
        </View>
      ) : rows.length === 0 ? (
        <View style={[styles.flex, styles.center]}>
          <EmptyState
            title={t('chat.emptyTitle')}
            body={t('chat.emptyBody')}
            emoji="👋"
            icon="chatbubbles-outline"
          />
        </View>
      ) : (
        <View style={styles.flex}>
          <FlatList
            ref={list}
            data={rows}
            inverted
            keyExtractor={(row) => row.key}
            renderItem={renderItem}
            onEndReached={() => {
              if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={history.isFetchingNextPage ? <Loading fill={false} /> : null}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewability}
            onScroll={onScroll}
            scrollEventThrottle={100}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
            }}
            accessibilityLabel={t('chat.listLabel')}
          />
          {awayFromLatest ? (
            <PressableScale
              onPress={() =>
                list.current?.scrollToOffset({ offset: 0, animated: !theme.reducedMotion })
              }
              accessibilityRole="button"
              accessibilityLabel={t('chat.jumpToLatest')}
              style={[
                styles.jump,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.md,
                },
              ]}>
              <Icon name="arrow-down" size={16} color={theme.colors.onPrimary} />
              <Text variant="label" weight="bold" tone="onPrimary">
                {t('chat.jumpToLatest')}
              </Text>
            </PressableScale>
          ) : null}
        </View>
      )}
      {target ? (
        <ConfirmSheet
          title={target.kind === 'message' ? t('chat.deleteTitle') : t('chat.discardTitle')}
          body={target.kind === 'message' ? t('chat.deleteBody') : t('chat.discardBody')}
          confirmLabel={target.kind === 'message' ? t('chat.delete') : t('chat.discard')}
          cancelLabel={t('common.cancel')}
          secondaryLabel={
            target.kind === 'pending' && target.item.status === 'failed'
              ? t('chat.retry')
              : undefined
          }
          onSecondary={
            target.kind === 'pending'
              ? () => {
                  onRetry(target.item);
                  setTarget(null);
                }
              : undefined
          }
          onConfirm={() => {
            if (target.kind === 'message') remove.mutate(target.message.id);
            else discardChatMessage(target.item.clientId);
            setTarget(null);
          }}
          onCancel={() => setTarget(null)}
        />
      ) : null}
      {remove.isError ? (
        <Text variant="caption" tone="danger" align="center">
          {t('chat.deleteFailed')}
        </Text>
      ) : null}
    </ChatFrame>
  );
}

const viewability = { itemVisiblePercentThreshold: 60, minimumViewTime: 300 };

/**
 * Family chat: one group chat per family, plain text + emoji. Polls for new messages while open,
 * marks what's visible as read, sends through the persisted outbox (works offline).
 */
export function ChatScreen() {
  const { memberId, enabled } = useChatAccess();
  if (memberId === null) return <Loading />;
  if (!enabled) return <ChatDisabled />;
  return <ChatRoom memberId={memberId} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  retention: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  jump: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
});
