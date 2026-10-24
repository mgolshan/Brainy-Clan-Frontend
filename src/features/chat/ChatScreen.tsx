import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
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
import { isChatDisabledError, reportErrorKey } from '@/features/chat/api';
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
  useReportChatMessage,
} from '@/features/chat/hooks';
import {
  authorName,
  buildChatRows,
  dayLabel,
  flattenHistory,
  messageAction,
  pendingForMember,
  retentionText,
  rowIndexOfMessage,
  showReportedTag,
  type ChatRow,
  type OutboxItem,
} from '@/features/chat/messages';
import {
  discardChatMessage,
  retryChatMessage,
  sendChatMessage,
  useChatOutbox,
} from '@/features/chat/outbox';
import { useFamily, useUpdateMember } from '@/features/family/hooks';
import { openHelp } from '@/features/help/HelpLink';
import { canPurchaseFamilyPlan } from '@/features/worlds/catalog';
import { errorMessage } from '@/lib/errorMessage';
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

/** The open sheet: delete a message, discard an unsent one, report one, or review a report (admins). */
type SheetTarget =
  | { kind: 'message'; message: ChatMessage }
  | { kind: 'pending'; item: OutboxItem }
  | { kind: 'report'; message: ChatMessage }
  | { kind: 'review'; message: ChatMessage };

type Notice = { tone: 'success' | 'danger'; text: string };

/** How long a notice ("Your parents have been told") stays. */
const NOTICE_MS = 4_000;

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
  const report = useReportChatMessage();
  const markRead = useMarkChatRead(history.meta?.last_read_id);
  const [target, setTarget] = useState<SheetTarget | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
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

  // Notices fade out on their own.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const onLongPress = useCallback(
    (message: ChatMessage) => {
      const action = messageAction(message, memberId, isAdmin);
      if (action === 'delete') {
        // Admins reviewing a reported message get the review actions instead.
        const review = showReportedTag(message, isAdmin) && message.member_id !== memberId;
        setTarget({ kind: review ? 'review' : 'message', message });
      } else if (action === 'report') {
        setTarget({ kind: 'report', message });
      }
    },
    [memberId, isAdmin],
  );
  const onReviewReport = useCallback(
    (message: ChatMessage) => setTarget({ kind: 'review', message }),
    [],
  );

  // Opened from a `family_chat_report` push: scroll to that message once it is loaded.
  const params = useLocalSearchParams<{ message?: string }>();
  const focusId = Number(params.message);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  useEffect(() => {
    if (!Number.isInteger(focusId) || focusId <= 0 || !history.isSuccess) return;
    const index = rowIndexOfMessage(rows, focusId);
    if (index >= 0) {
      // Let the list lay out first.
      setTimeout(() => {
        setHighlightId(focusId);
        list.current?.scrollToIndex({ index, viewPosition: 0.5, animated: !theme.reducedMotion });
      }, 300);
    }
    // Handled (or not loaded: the chat just opens).
    router.setParams({ message: undefined });
  }, [focusId, history.isSuccess, rows, theme.reducedMotion]);
  useEffect(() => {
    if (highlightId === null) return;
    const timer = setTimeout(() => setHighlightId(null), 3_000);
    return () => clearTimeout(timer);
  }, [highlightId]);
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
        case 'message': {
          const reported = showReportedTag(item.message, isAdmin);
          return (
            <MessageBubble
              message={item.message}
              own={item.own}
              showAuthor={item.showAuthor}
              locale={locale}
              action={messageAction(item.message, memberId, isAdmin)}
              onLongPress={onLongPress}
              reported={reported}
              onReviewReport={reported ? onReviewReport : undefined}
              highlighted={item.message.id === highlightId}
            />
          );
        }
      }
    },
    [
      locale,
      t,
      onRetry,
      onPendingLongPress,
      onLongPress,
      onReviewReport,
      memberId,
      isAdmin,
      highlightId,
    ],
  );

  const sendReport = (message: ChatMessage) => {
    report.mutate(message.id, {
      onSuccess: () => {
        setTarget(null);
        setNotice({ tone: 'success', text: t('chat.reportSent') });
      },
      onError: (error) => {
        setTarget(null);
        setNotice({ tone: 'danger', text: t(reportErrorKey(error)) });
      },
    });
  };

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
            actionLabel={t('help.chat')}
            onAction={() => openHelp(i18n.language, 'family-chat')}
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
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              // Rows are measured lazily: jump near it, then try once more.
              list.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
              setTimeout(() => list.current?.scrollToIndex({ index, viewPosition: 0.5 }), 250);
            }}
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
      {target?.kind === 'message' || target?.kind === 'pending' ? (
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
      {target?.kind === 'report' ? (
        <ConfirmSheet
          title={t('chat.reportTitle')}
          body={t('chat.reportBody')}
          confirmLabel={t('chat.reportConfirm')}
          confirmVariant="primary"
          confirmIcon="flag"
          cancelLabel={t('common.cancel')}
          busy={report.isPending}
          onConfirm={() => sendReport(target.message)}
          onCancel={() => setTarget(null)}
        />
      ) : null}
      {target?.kind === 'review' ? (
        <ReviewSheet
          message={target.message}
          onDelete={() => {
            remove.mutate(target.message.id);
            setTarget(null);
          }}
          onChatTurnedOff={(name) => {
            setTarget(null);
            setNotice({ tone: 'success', text: t('chat.chatTurnedOff', { name }) });
          }}
          onCancel={() => setTarget(null)}
        />
      ) : null}
      {remove.isError ? (
        <Text variant="caption" tone="danger" align="center">
          {t('chat.deleteFailed')}
        </Text>
      ) : null}
      {notice ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            styles.notice,
            {
              backgroundColor: theme.colors.surface,
              borderColor: notice.tone === 'danger' ? theme.colors.danger : theme.colors.success,
              borderRadius: theme.radius.md,
              marginHorizontal: theme.spacing.lg,
              padding: theme.spacing.sm,
            },
          ]}>
          <Icon
            name={notice.tone === 'danger' ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color={notice.tone === 'danger' ? theme.colors.danger : theme.colors.success}
          />
          <Text variant="label" style={styles.flexShrink}>
            {notice.text}
          </Text>
        </View>
      ) : null}
    </ChatFrame>
  );
}

/**
 * Admins, for a reported message: delete it, or turn chat off for its author (the member editor's
 * `chat_enabled` switch, `PATCH /family/members/{member}`).
 */
function ReviewSheet({
  message,
  onDelete,
  onChatTurnedOff,
  onCancel,
}: {
  message: ChatMessage;
  onDelete: () => void;
  onChatTurnedOff: (name: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const family = useFamily();
  const author = family.data?.members.find((m) => m.id === message.member_id) ?? null;
  const update = useUpdateMember(author?.id ?? 0);
  const name = authorName(message, t);
  // Only for a current member whose chat is still on.
  const canTurnOff = !!author && author.chat_enabled !== false;
  return (
    <ConfirmSheet
      title={t('chat.reviewTitle')}
      body={
        update.isError
          ? errorMessage(update.error, t)
          : canTurnOff
            ? t('chat.reviewBody', { name })
            : t('chat.reviewBodyDeleteOnly', { name })
      }
      confirmLabel={t('chat.delete')}
      cancelLabel={t('common.cancel')}
      secondaryLabel={canTurnOff ? t('chat.turnOffChatFor', { name }) : undefined}
      secondaryIcon="chatbubbles-outline"
      secondaryVariant="outline"
      busy={update.isPending}
      onSecondary={
        author
          ? () =>
              update.mutate(
                { chat_enabled: false },
                { onSuccess: () => onChatTurnedOff(author.nickname) },
              )
          : undefined
      }
      onConfirm={onDelete}
      onCancel={onCancel}
    />
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
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
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
