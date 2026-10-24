import type { InfiniteData } from '@tanstack/react-query';
import type { TFunction } from 'i18next';

import type { ChatMessage, ChatMessagesPage, MePayload } from '@/api/types';

/**
 * Pure family-chat logic (no React, no network): merging server pages, the local outbox shown as
 * pending bubbles, list rows with day separators, and labels. Message bodies are data only here;
 * they are rendered exclusively by `MessageText` (plain `<Text>`).
 */

/** Longest body the server accepts (characters after trimming). */
export const MAX_BODY_LENGTH = 1000;
/** The composer shows a counter from this length on. */
export const COUNTER_FROM = 900;
/** Messages per history page (`limit`, the server allows ≤ 100). */
export const PAGE_SIZE = 50;
/** Two messages by the same author closer than this share one author header. */
const GROUP_GAP_MS = 10 * 60_000;

export type ChatHistory = InfiniteData<ChatMessagesPage>;

/** A message the app is sending or will send (persisted outbox, see `outbox.ts`). */
export type OutboxStatus = 'sending' | 'waiting' | 'failed';

export interface OutboxItem {
  memberId: number;
  /** UUID sent as `client_id`; the same one on every retry, so the server never duplicates. */
  clientId: string;
  body: string;
  /** ISO time the member pressed send (orders pending bubbles). */
  createdAt: string;
  /**
   * `sending`: request in flight; `waiting`: no connection, re-sent automatically;
   * `failed`: the server refused it (rate limit, validation...), the member may retry.
   */
  status: OutboxStatus;
  /** Contract error code of the last refusal (`failed` only). */
  errorCode?: string | null;
}

/**
 * Trimmed body ready to send, or `null` when it can't be sent (empty or longer than the limit).
 * The server trims and normalizes again; this only avoids pointless requests.
 */
export function prepareBody(text: string): string | null {
  const body = text.trim();
  if (body.length === 0 || body.length > MAX_BODY_LENGTH) return null;
  return body;
}

/** Of two copies of the same message, the tombstone wins (deleting can't be undone). */
function preferred(a: ChatMessage, b: ChatMessage): ChatMessage {
  if (a.deleted !== b.deleted) return a.deleted ? a : b;
  return b;
}

/**
 * Merges message lists into one list, newest first: one entry per `id` (a tombstone wins over
 * an older copy), and one per `client_id` (a retried send never shows twice; the first stored
 * message, the lowest id, is kept).
 */
export function mergeMessages(...lists: readonly (readonly ChatMessage[])[]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  for (const list of lists) {
    for (const message of list) {
      const existing = byId.get(message.id);
      byId.set(message.id, existing ? preferred(existing, message) : message);
    }
  }
  const sorted = [...byId.values()].sort((a, b) => a.id - b.id);
  const seenClientIds = new Set<string>();
  const out: ChatMessage[] = [];
  for (const message of sorted) {
    if (message.client_id) {
      if (seenClientIds.has(message.client_id)) continue;
      seenClientIds.add(message.client_id);
    }
    out.push(message);
  }
  return out.reverse();
}

/** All cached history pages as one newest-first list. */
export function flattenHistory(history: ChatHistory | undefined): ChatMessage[] {
  return history ? mergeMessages(...history.pages.map((p) => p.data)) : [];
}

/** Highest message id in the cache (the `after` polling cursor), or `null` when empty. */
export function newestId(history: ChatHistory | undefined): number | null {
  let max: number | null = null;
  for (const page of history?.pages ?? []) {
    for (const m of page.data) if (max === null || m.id > max) max = m.id;
  }
  return max;
}

/** `before` cursor for the next (older) page: the oldest id of the last page, if it has more. */
export function nextBeforeCursor(page: ChatMessagesPage): number | null {
  if (!page.meta.has_more || page.data.length === 0) return null;
  return Math.min(...page.data.map((m) => m.id));
}

/**
 * Puts fresh messages (a poll, a sent message) into the cached pages: known ids are updated in
 * the page that holds them, new ones join the first (newest) page. Returns the same object when
 * nothing changed. Without a cache there is nothing to update (the first fetch loads them).
 */
export function insertMessages(
  history: ChatHistory | undefined,
  messages: readonly ChatMessage[],
): ChatHistory | undefined {
  if (!history || history.pages.length === 0 || messages.length === 0) return history;
  const incoming = new Map(messages.map((m) => [m.id, m]));
  let changed = false;
  const pages = history.pages.map((page) => {
    let pageChanged = false;
    const data = page.data.map((m) => {
      const fresh = incoming.get(m.id);
      if (!fresh) return m;
      incoming.delete(m.id);
      const next = preferred(m, fresh);
      if (next !== m && (next.deleted !== m.deleted || next.body !== m.body)) {
        pageChanged = true;
        return next;
      }
      return m;
    });
    if (!pageChanged) return page;
    changed = true;
    return { ...page, data };
  });
  if (incoming.size > 0) {
    changed = true;
    pages[0] = { ...pages[0], data: mergeMessages([...incoming.values()], pages[0].data) };
  }
  return changed ? { ...history, pages } : history;
}

/**
 * Merges a fresh newest page (`GET ?limit=` without a cursor) into the cache: picks up messages
 * deleted by others (tombstones) and, when the cache holds no message yet, the first messages of
 * an empty chat (the `after` poll needs a newest id). An empty cache takes the page as is, so its
 * `has_more` cursor stays right.
 */
export function applyLatestPage(
  history: ChatHistory | undefined,
  latest: ChatMessagesPage,
): ChatHistory | undefined {
  if (!history || history.pages.length === 0) return history;
  if (newestId(history) === null) {
    if (latest.data.length === 0) return history;
    return { pages: [latest], pageParams: [null] };
  }
  return insertMessages(history, latest.data);
}

/** Marks a message as deleted everywhere in the cache (optimistic delete). */
export function markDeleted(history: ChatHistory | undefined, id: number): ChatHistory | undefined {
  if (!history) return history;
  return {
    ...history,
    pages: history.pages.map((page) =>
      page.data.some((m) => m.id === id)
        ? {
            ...page,
            data: page.data.map((m) => (m.id === id ? { ...m, deleted: true, body: null } : m)),
          }
        : page,
    ),
  };
}

/**
 * The member's outbox items still to show as pending bubbles, newest first: a message the
 * server already returned (same `client_id`) is shown from the server copy instead.
 */
export function pendingForMember(
  outbox: readonly OutboxItem[],
  memberId: number | null,
  serverMessages: readonly ChatMessage[],
): OutboxItem[] {
  if (memberId === null) return [];
  const stored = new Set(serverMessages.map((m) => m.client_id).filter(Boolean));
  return outbox
    .filter((item) => item.memberId === memberId && !stored.has(item.clientId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Local calendar day ("2026-10-23") of an ISO time, in the device time zone. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export type ChatRow =
  | {
      type: 'message';
      key: string;
      message: ChatMessage;
      own: boolean;
      /** First message of a run by this author: show avatar + nickname. */
      showAuthor: boolean;
    }
  | { type: 'pending'; key: string; item: OutboxItem }
  | { type: 'day'; key: string; day: string; iso: string };

/**
 * Rows for the inverted list, newest first: pending bubbles, then server messages, with a day
 * separator after the oldest message of each day (shown above that day in the inverted list).
 */
export function buildChatRows(
  messages: readonly ChatMessage[],
  pending: readonly OutboxItem[],
  ownMemberId: number | null,
): ChatRow[] {
  type Entry = { iso: string; row: Exclude<ChatRow, { type: 'day' }> };
  const entries: Entry[] = [
    ...pending.map((item): Entry => ({
      iso: item.createdAt,
      row: { type: 'pending', key: `p:${item.clientId}`, item },
    })),
    ...messages.map((message, i): Entry => {
      const older = messages[i + 1];
      const own = ownMemberId !== null && message.member_id === ownMemberId;
      const showAuthor =
        !own &&
        (!older ||
          message.member_id === null ||
          older.member_id !== message.member_id ||
          dayKey(older.created_at) !== dayKey(message.created_at) ||
          Date.parse(message.created_at) - Date.parse(older.created_at) > GROUP_GAP_MS);
      return {
        iso: message.created_at,
        row: { type: 'message', key: `m:${message.id}`, message, own, showAuthor },
      };
    }),
  ];

  const rows: ChatRow[] = [];
  entries.forEach((entry, i) => {
    rows.push(entry.row);
    const day = dayKey(entry.iso);
    const older = entries[i + 1];
    if (!older || dayKey(older.iso) !== day) {
      rows.push({ type: 'day', key: `d:${day}`, day, iso: entry.iso });
    }
  });
  return rows;
}

/** "Today", "Yesterday" or a localized date ("Thursday, October 22"). */
export function dayLabel(iso: string, locale: string, t: TFunction, now = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now.toISOString())) return t('chat.today');
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === dayKey(yesterday.toISOString())) return t('chat.yesterday');
  const date = new Date(iso);
  const sameYear = date.getFullYear() === now.getFullYear();
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(date);
  } catch {
    return key;
  }
}

/** Short local time of a message ("6:02 PM" / "18:02") in the device locale. */
export function messageTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  } catch {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}

/**
 * "Messages are kept for 7 days" / "… for 1 year" from the policy's `chat.retention_days`
 * (whole years read as years). `null` when the server hasn't said.
 */
export function retentionText(days: number | null | undefined, t: TFunction): string | null {
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) return null;
  if (days >= 365 && days % 365 === 0) return t('chat.retentionYears', { count: days / 365 });
  return t('chat.retentionDays', { count: days });
}

/** Author line for a message: the nickname, or "Former member" for someone who left. */
export function authorName(message: ChatMessage, t: TFunction): string {
  return message.member_id === null || !message.nickname
    ? t('chat.formerMember')
    : message.nickname;
}

/** Who may delete a message: its author, or any family admin. Tombstones can't be deleted. */
export function canDeleteMessage(
  message: ChatMessage,
  ownMemberId: number | null,
  isAdmin: boolean,
): boolean {
  if (message.deleted) return false;
  return isAdmin || (ownMemberId !== null && message.member_id === ownMemberId);
}

/** Inserts `insert` at the selection, never past the length limit. */
export function insertAt(
  text: string,
  selection: { start: number; end: number },
  insert: string,
  max = MAX_BODY_LENGTH,
): { text: string; cursor: number } {
  const start = Math.max(0, Math.min(selection.start, text.length));
  const end = Math.max(start, Math.min(selection.end, text.length));
  const next = text.slice(0, start) + insert + text.slice(end);
  if (next.length > max) return { text, cursor: end };
  return { text: next, cursor: start + insert.length };
}

/** Badge text for the Chat tab (`undefined` hides it). */
export function badgeLabel(unread: number | null | undefined): string | undefined {
  if (!unread || unread <= 0) return undefined;
  return unread > 99 ? '99+' : String(unread);
}

export interface ChatAccess {
  memberId: number | null;
  /** `false` shows "A parent turned chat off for you" (no chat request is made). */
  enabled: boolean;
}

/** Chat needs a family membership and `chat_enabled` (absent on older backends = on). */
export function chatAccess(me: MePayload | undefined): ChatAccess {
  const member = me?.member ?? null;
  return {
    memberId: member?.id ?? null,
    enabled: !!member && !!me?.family && member.chat_enabled !== false,
  };
}
