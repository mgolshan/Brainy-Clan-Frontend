import type { TFunction } from 'i18next';

import type { ChatMessage, ChatMessagesPage, MePayload } from '@/api/types';
import {
  applyLatestPage,
  authorName,
  badgeLabel,
  buildChatRows,
  canDeleteMessage,
  chatAccess,
  flattenHistory,
  insertAt,
  insertMessages,
  markDeleted,
  mergeMessages,
  newestId,
  nextBeforeCursor,
  pendingForMember,
  prepareBody,
  retentionText,
  type ChatHistory,
  type OutboxItem,
} from '@/features/chat/messages';

// i18next-like stub: returns the key plus the count, so plural choices are visible.
const t = ((key: string, opts?: { count?: number }) =>
  opts?.count !== undefined ? `${key}:${opts.count}` : key) as unknown as TFunction;

const msg = (id: number, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  member_id: 1,
  nickname: 'Sam',
  avatar: 'fox-kid',
  body: `message ${id}`,
  deleted: false,
  client_id: `c-${id}`,
  created_at: `2026-10-23T12:${String(id % 60).padStart(2, '0')}:00Z`,
  ...over,
});

const meta = { has_more: false, retention_days: 7, last_read_id: null, unread: 0 };
const page = (data: ChatMessage[], hasMore = false): ChatMessagesPage => ({
  data,
  meta: { ...meta, has_more: hasMore },
});
const history = (...pages: ChatMessagesPage[]): ChatHistory => ({
  pages,
  pageParams: pages.map((_, i) => (i === 0 ? null : i)),
});
const ids = (list: ChatMessage[]) => list.map((m) => m.id);

describe('mergeMessages', () => {
  it('orders newest first and dedupes by id', () => {
    expect(ids(mergeMessages([msg(3), msg(1)], [msg(2), msg(3)]))).toEqual([3, 2, 1]);
  });

  it('keeps the tombstone when a message appears deleted in a later fetch', () => {
    const merged = mergeMessages([msg(5)], [msg(5, { deleted: true, body: null })]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ deleted: true, body: null });
    // ...and in the other order too (deleting can't be undone).
    expect(mergeMessages([msg(5, { deleted: true, body: null })], [msg(5)])[0].deleted).toBe(true);
  });

  it('shows a retried send once (same client_id), keeping the first stored message', () => {
    const merged = mergeMessages([msg(7, { client_id: 'abc' }), msg(9, { client_id: 'abc' })]);
    expect(ids(merged)).toEqual([7]);
  });

  it('never dedupes messages without a client_id', () => {
    expect(ids(mergeMessages([msg(1, { client_id: null }), msg(2, { client_id: null })]))).toEqual([
      2, 1,
    ]);
  });
});

describe('history pages and cursors', () => {
  it('flattens pages and finds the newest id', () => {
    const h = history(page([msg(10), msg(9)], true), page([msg(8), msg(7)]));
    expect(ids(flattenHistory(h))).toEqual([10, 9, 8, 7]);
    expect(newestId(h)).toBe(10);
    expect(newestId(undefined)).toBeNull();
  });

  it('uses the oldest id of a page as the next `before` cursor while there is more', () => {
    expect(nextBeforeCursor(page([msg(60), msg(11)], true))).toBe(11);
    expect(nextBeforeCursor(page([msg(60), msg(11)], false))).toBeNull();
    expect(nextBeforeCursor(page([], true))).toBeNull();
  });

  it('adds polled messages to the first page without duplicates', () => {
    const h = history(page([msg(10), msg(9)], true), page([msg(8)]));
    const next = insertMessages(h, [msg(11), msg(10), msg(12)]);
    expect(ids(next!.pages[0].data)).toEqual([12, 11, 10, 9]);
    expect(next!.pages[1]).toBe(h.pages[1]);
  });

  it('updates a known message in the page that holds it (tombstone)', () => {
    const h = history(page([msg(10)]), page([msg(8)]));
    const next = insertMessages(h, [msg(8, { deleted: true, body: null })]);
    expect(next!.pages[1].data[0].deleted).toBe(true);
    expect(next!.pages[0]).toBe(h.pages[0]);
  });

  it('returns the same object when nothing changed, and nothing without a cache', () => {
    const h = history(page([msg(10)]));
    expect(insertMessages(h, [msg(10)])).toBe(h);
    expect(insertMessages(undefined, [msg(1)])).toBeUndefined();
  });

  it('takes the newest page as is when the cache holds no message yet (empty chat)', () => {
    const empty = history(page([]));
    const latest = page([msg(2), msg(1)], true);
    const next = applyLatestPage(empty, latest)!;
    expect(next.pages).toEqual([latest]);
    expect(next.pageParams).toEqual([null]);
    expect(applyLatestPage(empty, page([]))).toBe(empty);
    expect(applyLatestPage(undefined, latest)).toBeUndefined();
  });

  it('merges a refreshed newest page: tombstones by others and new messages', () => {
    const h = history(page([msg(10), msg(9)], true), page([msg(8)]));
    const next = applyLatestPage(
      h,
      page([msg(11), msg(10), msg(9, { deleted: true, body: null })]),
    )!;
    expect(ids(next.pages[0].data)).toEqual([11, 10, 9]);
    expect(next.pages[0].data[2]).toMatchObject({ deleted: true, body: null });
    expect(next.pages[1]).toBe(h.pages[1]);
    expect(applyLatestPage(h, page([msg(10), msg(9)]))).toBe(h);
  });

  it('marks a message deleted everywhere (optimistic delete)', () => {
    const h = history(page([msg(10)]), page([msg(8)]));
    const next = markDeleted(h, 8)!;
    expect(next.pages[1].data[0]).toMatchObject({ id: 8, deleted: true, body: null });
    expect(next.pages[0]).toBe(h.pages[0]);
  });
});

describe('pending (outbox) bubbles', () => {
  const item = (
    clientId: string,
    memberId = 1,
    createdAt = '2026-10-23T12:00:00Z',
  ): OutboxItem => ({
    memberId,
    clientId,
    body: 'hi',
    createdAt,
    status: 'waiting',
  });

  it("shows only the member's own items, newest first", () => {
    const outbox = [
      item('a', 1, '2026-10-23T12:00:00Z'),
      item('b', 2),
      item('c', 1, '2026-10-23T12:05:00Z'),
    ];
    expect(pendingForMember(outbox, 1, []).map((q) => q.clientId)).toEqual(['c', 'a']);
    expect(pendingForMember(outbox, null, [])).toEqual([]);
  });

  it('hides an item once the server copy (same client_id) is in the list', () => {
    expect(pendingForMember([item('c-5')], 1, [msg(5)])).toEqual([]);
  });
});

describe('buildChatRows', () => {
  it('puts pending first, then messages, with a day separator after each day', () => {
    const messages = [
      msg(3, { created_at: '2026-10-23T15:00:00' }),
      msg(2, { created_at: '2026-10-23T09:00:00' }),
      msg(1, { created_at: '2026-10-22T09:00:00' }),
    ];
    const pending: OutboxItem[] = [
      {
        memberId: 1,
        clientId: 'x',
        body: 'hi',
        createdAt: '2026-10-23T16:00:00',
        status: 'failed',
      },
    ];
    const rows = buildChatRows(messages, pending, 1);
    expect(rows.map((r) => r.key)).toEqual([
      'p:x',
      'm:3',
      'm:2',
      'd:2026-10-23',
      'm:1',
      'd:2026-10-22',
    ]);
  });

  it('marks own messages and shows the author once per run of others', () => {
    const messages = [
      msg(4, { member_id: 2, created_at: '2026-10-23T12:03:00' }),
      msg(3, { member_id: 2, created_at: '2026-10-23T12:02:00' }),
      msg(2, { member_id: 1, created_at: '2026-10-23T12:01:00' }),
      msg(1, { member_id: null, nickname: null, created_at: '2026-10-23T12:00:00' }),
    ];
    const rows = buildChatRows(messages, [], 1).filter((r) => r.type === 'message');
    expect(rows.map((r) => (r.type === 'message' ? [r.own, r.showAuthor] : null))).toEqual([
      [false, false], // same author as the message just before it
      [false, true], // first of the run
      [true, false], // own: no author header
      [false, true], // former member
    ]);
  });
});

describe('labels and rules', () => {
  it('words retention in days or whole years', () => {
    expect(retentionText(7, t)).toBe('chat.retentionDays:7');
    expect(retentionText(1, t)).toBe('chat.retentionDays:1');
    expect(retentionText(365, t)).toBe('chat.retentionYears:1');
    expect(retentionText(730, t)).toBe('chat.retentionYears:2');
    expect(retentionText(400, t)).toBe('chat.retentionDays:400');
    expect(retentionText(undefined, t)).toBeNull();
    expect(retentionText(0, t)).toBeNull();
  });

  it('names former members', () => {
    expect(authorName(msg(1), t)).toBe('Sam');
    expect(authorName(msg(1, { member_id: null, nickname: null }), t)).toBe('chat.formerMember');
  });

  it('lets the author or an admin delete, never a tombstone', () => {
    expect(canDeleteMessage(msg(1, { member_id: 5 }), 5, false)).toBe(true);
    expect(canDeleteMessage(msg(1, { member_id: 6 }), 5, false)).toBe(false);
    expect(canDeleteMessage(msg(1, { member_id: 6 }), 5, true)).toBe(true);
    expect(canDeleteMessage(msg(1, { member_id: null }), 5, true)).toBe(true);
    expect(canDeleteMessage(msg(1, { member_id: 5, deleted: true }), 5, true)).toBe(false);
  });

  it('trims bodies and refuses empty or too long ones', () => {
    expect(prepareBody('  hi 👋 \n')).toBe('hi 👋');
    expect(prepareBody('   \n ')).toBeNull();
    expect(prepareBody('a'.repeat(1000))).toHaveLength(1000);
    expect(prepareBody('a'.repeat(1001))).toBeNull();
  });

  it('caps the badge at 99+', () => {
    expect(badgeLabel(0)).toBeUndefined();
    expect(badgeLabel(undefined)).toBeUndefined();
    expect(badgeLabel(3)).toBe('3');
    expect(badgeLabel(150)).toBe('99+');
  });

  it('inserts quick emoji at the cursor, within the limit', () => {
    expect(insertAt('helo', { start: 2, end: 2 }, '🎉')).toEqual({ text: 'he🎉lo', cursor: 4 });
    expect(insertAt('abc', { start: 1, end: 3 }, '👍')).toEqual({ text: 'a👍', cursor: 3 });
    expect(insertAt('a'.repeat(999), { start: 999, end: 999 }, '🎉').text).toHaveLength(999);
  });
});

describe('chat access (chat_disabled)', () => {
  const me = (member: Partial<MePayload['member']> | null, family = true) =>
    ({
      member: member ? { id: 4, ...member } : null,
      family: family ? { id: 1 } : null,
    }) as MePayload;

  it('is on by default and when chat_enabled is true', () => {
    expect(chatAccess(me({}))).toEqual({ memberId: 4, enabled: true });
    expect(chatAccess(me({ chat_enabled: true })).enabled).toBe(true);
  });

  it('is off when a parent turned chat off, or without a family', () => {
    expect(chatAccess(me({ chat_enabled: false }))).toEqual({ memberId: 4, enabled: false });
    expect(chatAccess(me({}, false)).enabled).toBe(false);
    expect(chatAccess(undefined)).toEqual({ memberId: null, enabled: false });
  });
});
