import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type { ChatMessagesMeta, ChatUnread } from '@/api/types';
import { useMe } from '@/features/auth/hooks';
import {
  deleteChatMessage,
  fetchChatMessages,
  fetchChatUnread,
  isChatDisabledError,
  postChatRead,
  reportChatMessage,
} from '@/features/chat/api';
import {
  PAGE_SIZE,
  applyLatestPage,
  insertMessages,
  markDeleted,
  chatAccess,
  newestId,
  nextBeforeCursor,
  type ChatAccess,
  type ChatHistory,
} from '@/features/chat/messages';
import { useChatOutboxSync } from '@/features/chat/outbox';

/** Poll for new messages this often while the chat screen is open (contract: ~4 s). */
export const POLL_MS = 4_000;
/** Poll the unread count this often elsewhere, for the tab badge (contract: ~60 s). */
export const UNREAD_POLL_MS = 60_000;
/** While polling, re-read the newest page this often (deletions by others, tombstones). */
export const REFRESH_MS = 20_000;

/** No retries for "chat is off" / not found; network and server errors retry twice. */
function retryUnlessRefused(count: number, error: unknown) {
  if (isChatDisabledError(error)) return false;
  return count < 2;
}

/**
 * Whether chat is available to the signed-in member: needs a family and `chat_enabled` (absent
 * on older backends = on). `false` shows "A parent turned chat off for you".
 */
export function useChatAccess(): ChatAccess {
  return chatAccess(useMe().data);
}

/** `true` while the app is in the foreground (polling stops in the background). */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) =>
      setActive(s === 'active'),
    );
    return () => sub.remove();
  }, []);
  return active;
}

/** `chat_disabled` from any chat call: refresh `me` so every screen sees the switch. */
function onChatError(error: unknown) {
  if (isChatDisabledError(error)) void queryClient.invalidateQueries({ queryKey: queryKeys.me });
}

/**
 * Message history (`GET /family/chat/messages?before=`), newest page first; `fetchNextPage`
 * loads older messages. The last page's `meta` (retention, last read id) is exposed as `meta`.
 */
export function useChatHistory(enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.chatMessages,
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam, signal }) => {
      try {
        return await fetchChatMessages({ before: pageParam }, PAGE_SIZE, signal);
      } catch (error) {
        onChatError(error);
        throw error;
      }
    },
    getNextPageParam: (lastPage) => nextBeforeCursor(lastPage),
    enabled,
    retry: retryUnlessRefused,
    staleTime: 60_000,
  });
  const meta: ChatMessagesMeta | undefined = query.data?.pages[0]?.meta;
  return { ...query, meta };
}

/**
 * Polls `?after=<newest id>` every `POLL_MS` while `active` (screen focused + app in the
 * foreground) and merges new messages into the history cache. Pages through `has_more`.
 */
export function useChatPolling(active: boolean) {
  const client = useQueryClient();
  // Time of the last newest-page refresh; the first poll starts the clock (the history was just loaded).
  const lastRefresh = useRef<number | null>(null);
  return useQuery({
    queryKey: queryKeys.chatPoll,
    enabled: active,
    refetchInterval: active ? POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      let after = newestId(client.getQueryData<ChatHistory>(queryKeys.chatMessages));
      try {
        // An empty chat has no `after` cursor, and `after` never returns messages deleted
        // since: then (and every REFRESH_MS) re-read the newest page.
        lastRefresh.current ??= Date.now();
        if (after === null || Date.now() - lastRefresh.current >= REFRESH_MS) {
          const latest = await fetchChatMessages({}, PAGE_SIZE, signal);
          lastRefresh.current = Date.now();
          client.setQueryData<ChatHistory>(queryKeys.chatMessages, (prev) =>
            applyLatestPage(prev, latest),
          );
          after = newestId(client.getQueryData<ChatHistory>(queryKeys.chatMessages));
          if (after === null) return { at: Date.now() };
        }
        // A long absence may have left more than one page of new messages.
        for (let page = 0; page < 5; page++) {
          const result = await fetchChatMessages({ after }, 100, signal);
          if (result.data.length > 0) {
            client.setQueryData<ChatHistory>(queryKeys.chatMessages, (prev) =>
              insertMessages(prev, result.data),
            );
            after = Math.max(after, ...result.data.map((m) => m.id));
          }
          if (!result.meta.has_more || result.data.length === 0) break;
        }
      } catch (error) {
        onChatError(error);
        throw error;
      }
      return { at: Date.now() };
    },
  });
}

/**
 * Unread count for the Chat tab badge: `GET /family/chat/unread` every `UNREAD_POLL_MS` (paused
 * in the background by TanStack Query's focus manager) and on `family_chat` pushes. Also keeps
 * the outbox sending while the app is open.
 */
export function useChatBadge(): number {
  const { memberId, enabled } = useChatAccess();
  useChatOutboxSync(enabled ? memberId : null);
  const unread = useQuery({
    queryKey: queryKeys.chatUnread,
    queryFn: async ({ signal }) => {
      try {
        return await fetchChatUnread(signal);
      } catch (error) {
        onChatError(error);
        throw error;
      }
    },
    enabled,
    refetchInterval: UNREAD_POLL_MS,
    retry: retryUnlessRefused,
    staleTime: 30_000,
  });
  return enabled ? (unread.data?.unread ?? 0) : 0;
}

/**
 * Marks messages read as they become visible: `markVisible(maxId)` posts `last_read_id` (only
 * forward, at most once per second) and clears the badge when the newest message was seen.
 */
export function useMarkChatRead(serverLastReadId: number | null | undefined) {
  const client = useQueryClient();
  const sent = useRef(0);
  const pending = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (maxVisibleId: number) => {
      const floor = Math.max(sent.current, serverLastReadId ?? 0);
      if (maxVisibleId <= floor) return;
      pending.current = Math.max(pending.current ?? 0, maxVisibleId);
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        const id = pending.current;
        pending.current = null;
        if (id === null || id <= sent.current) return;
        sent.current = id;
        postChatRead({ last_read_id: id })
          .then(() => {
            const newest = newestId(client.getQueryData<ChatHistory>(queryKeys.chatMessages));
            if (newest !== null && id >= newest) {
              client.setQueryData<ChatUnread>(queryKeys.chatUnread, { unread: 0 });
            } else {
              void client.invalidateQueries({ queryKey: queryKeys.chatUnread });
            }
          })
          .catch((error: unknown) => {
            // Try again with the next visible message.
            sent.current = Math.min(sent.current, floor);
            onChatError(error);
          });
      }, 1_000);
    },
    [client, serverLastReadId],
  );
}

/** `DELETE /family/chat/messages/{id}` (author or admin), shown as a tombstone at once. */
export function useDeleteChatMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChatMessage(id),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.chatMessages });
      const previous = client.getQueryData<ChatHistory>(queryKeys.chatMessages);
      client.setQueryData<ChatHistory>(queryKeys.chatMessages, (prev) => markDeleted(prev, id));
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) client.setQueryData(queryKeys.chatMessages, context.previous);
      onChatError(error);
    },
  });
}

/**
 * `POST /family/chat/messages/{id}/report` (non-admins, another member's message): tells the
 * family's admins. Nothing changes in the reporter's view (only admins see `reported`).
 */
export function useReportChatMessage() {
  return useMutation({
    mutationFn: (id: number) => reportChatMessage(id),
    onError: onChatError,
  });
}

/**
 * A `family_chat_report` push (admins) arrived or was tapped: re-read the loaded history so the
 * "Reported" tag shows on the message, even on an older page.
 */
export function refreshChatFromReportPush() {
  void queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages });
  void queryClient.invalidateQueries({ queryKey: queryKeys.chatUnread });
}

/** A `family_chat` push arrived or was tapped: fetch new messages and the badge now. */
export function refreshChatFromPush() {
  void queryClient.invalidateQueries({ queryKey: queryKeys.chatUnread });
  void queryClient.invalidateQueries({ queryKey: queryKeys.chatPoll });
}
