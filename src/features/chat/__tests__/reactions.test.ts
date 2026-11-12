import type { ChatMessage, ChatReaction, ChatReactionChange } from '@/api/types';
import { insertMessages, markDeleted, type ChatHistory } from '@/features/chat/messages';
import {
  REACTION_PAGE_SIZE,
  applyOwnReaction,
  collectReactionChanges,
  findReactions,
  myReaction,
  patchReactions,
  reactionIntent,
  reactionUpdates,
  reactorNames,
  sameReactions,
  visibleReactions,
} from '@/features/chat/reactions';

const ME = 7;
const r = (key: string, member_ids: number[], mine = member_ids.includes(ME)): ChatReaction => ({
  key,
  count: member_ids.length,
  mine,
  member_ids,
});

const msg = (id: number, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  member_id: 3,
  nickname: 'Sam',
  avatar: null,
  body: `m${id}`,
  deleted: false,
  client_id: null,
  created_at: '2026-11-11T10:00:00Z',
  reactions: [],
  ...over,
});

const history = (...pages: ChatMessage[][]): ChatHistory => ({
  pages: pages.map((data) => ({
    data,
    meta: { has_more: false, retention_days: 7, last_read_id: null, unread: 0 },
  })),
  pageParams: pages.map(() => null),
});

describe('visibleReactions', () => {
  it('skips unknown keys and empty counts, in the fixed order', () => {
    const message = msg(1, {
      reactions: [r('star', [3]), r('rocket', [4]), r('heart', [5]), { ...r('wow', []) }],
    });
    expect(visibleReactions(message).map((x) => x.key)).toEqual(['heart', 'star']);
  });

  it('shows nothing on a deleted message', () => {
    expect(visibleReactions(msg(1, { deleted: true, reactions: [r('heart', [3])] }))).toEqual([]);
  });
});

describe('toggle', () => {
  it('tapping your own reaction removes it; another key replaces it', () => {
    const reactions = [r('heart', [3, ME])];
    expect(myReaction(reactions)).toBe('heart');
    expect(reactionIntent(reactions, 'heart')).toEqual({ action: 'remove' });
    expect(reactionIntent(reactions, 'party')).toEqual({ action: 'set', key: 'party' });
    expect(reactionIntent([], 'heart')).toEqual({ action: 'set', key: 'heart' });
  });

  it('adds a new reaction in the fixed order', () => {
    expect(applyOwnReaction([r('star', [3])], 'heart', ME)).toEqual([
      r('heart', [ME]),
      r('star', [3]),
    ]);
  });

  it('joins an existing key (count + 1, mine)', () => {
    expect(applyOwnReaction([r('heart', [3])], 'heart', ME)).toEqual([r('heart', [3, ME])]);
  });

  it('replaces your earlier reaction (one per member)', () => {
    expect(applyOwnReaction([r('heart', [3, ME]), r('star', [4])], 'star', ME)).toEqual([
      r('heart', [3]),
      r('star', [4, ME]),
    ]);
  });

  it('removes yours and drops an emptied key', () => {
    expect(applyOwnReaction([r('heart', [ME]), r('wow', [3])], null, ME)).toEqual([r('wow', [3])]);
  });
});

describe('patchReactions', () => {
  it('updates only the changed message and keeps other objects', () => {
    const a = msg(1);
    const b = msg(2);
    const c = msg(3);
    const h = history([b, a], [c]);
    const next = patchReactions(h, new Map([[2, [r('heart', [3])]]]))!;
    expect(next).not.toBe(h);
    expect(next.pages[0].data[0].reactions).toEqual([r('heart', [3])]);
    expect(next.pages[0].data[1]).toBe(a);
    expect(next.pages[1]).toBe(h.pages[1]);
  });

  it('returns the same history when nothing changed or the message is not cached', () => {
    const h = history([msg(1, { reactions: [r('heart', [3])] })]);
    expect(patchReactions(h, new Map([[1, [r('heart', [3])]]]))).toBe(h);
    expect(patchReactions(h, new Map([[99, [r('heart', [3])]]]))).toBe(h);
    expect(patchReactions(undefined, new Map([[1, []]]))).toBeUndefined();
  });

  it('keeps tombstones without reactions', () => {
    const h = history([msg(1, { deleted: true, body: null })]);
    expect(patchReactions(h, new Map([[1, [r('heart', [3])]]]))).toBe(h);
  });

  it('findReactions reads the cached reactions', () => {
    const h = history([msg(1)], [msg(2, { reactions: [r('star', [3])] })]);
    expect(findReactions(h, 2)).toEqual([r('star', [3])]);
    expect(findReactions(h, 9)).toBeUndefined();
  });
});

describe('message merges carry reactions', () => {
  it('insertMessages picks up a reaction change on a known message', () => {
    const h = history([msg(1)]);
    const next = insertMessages(h, [msg(1, { reactions: [r('party', [3])] })])!;
    expect(next).not.toBe(h);
    expect(next.pages[0].data[0].reactions).toEqual([r('party', [3])]);
  });

  it('markDeleted clears reactions', () => {
    const h = history([msg(1, { reactions: [r('party', [3])] })]);
    expect(markDeleted(h, 1)!.pages[0].data[0].reactions).toEqual([]);
  });

  it('sameReactions compares keys, counts, mine and members', () => {
    expect(sameReactions([r('heart', [3])], [r('heart', [3])])).toBe(true);
    expect(sameReactions([r('heart', [3])], [r('heart', [4])])).toBe(false);
    expect(sameReactions(undefined, [])).toBe(true);
  });
});

describe('reaction polling (cursor)', () => {
  const change = (message_id: number, reactions: ChatReaction[] = []): ChatReactionChange => ({
    message_id,
    reactions,
  });

  it('later rows win', () => {
    const updates = reactionUpdates([change(1, [r('heart', [3])]), change(1, [])]);
    expect(updates.get(1)).toEqual([]);
  });

  it('stops after a short page and keeps the new cursor', async () => {
    const fetchPage = jest.fn(async (since: string | null) => ({
      data: [change(1, [r('heart', [3])])],
      meta: { cursor: `${since}+1` },
    }));
    const result = await collectReactionChanges(fetchPage, 'c0');
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith('c0');
    expect(result.cursor).toBe('c0+1');
    expect(result.updates.get(1)).toEqual([r('heart', [3])]);
  });

  it('calls again while pages are full (200 rows)', async () => {
    const full = Array.from({ length: REACTION_PAGE_SIZE }, (_, i) => change(i + 1));
    const pages = [
      { data: full, meta: { cursor: 'c1' } },
      { data: [change(5, [r('star', [3])])], meta: { cursor: 'c2' } },
    ];
    const fetchPage = jest.fn(async () => pages.shift()!);
    const result = await collectReactionChanges(fetchPage, 'c0');
    expect(fetchPage.mock.calls).toEqual([['c0'], ['c1']]);
    expect(result.cursor).toBe('c2');
    expect(result.updates.size).toBe(REACTION_PAGE_SIZE);
    expect(result.updates.get(5)).toEqual([r('star', [3])]);
  });

  it('stops after maxPages', async () => {
    const full = Array.from({ length: REACTION_PAGE_SIZE }, (_, i) => change(i + 1));
    let n = 0;
    const fetchPage = jest.fn(async () => ({ data: full, meta: { cursor: `c${++n}` } }));
    const result = await collectReactionChanges(fetchPage, 'c0', 3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(result.cursor).toBe('c3');
  });
});

describe('reactorNames', () => {
  it('maps member ids to nicknames and skips unknown ids', () => {
    const shown = visibleReactions(msg(1, { reactions: [r('heart', [3, 99, ME])] }));
    expect(
      reactorNames(shown, [
        { id: 3, nickname: 'Sam' },
        { id: ME, nickname: 'Moe' },
      ]),
    ).toEqual([{ key: 'heart', emoji: '❤️', names: ['Sam', 'Moe'] }]);
    expect(reactorNames(shown, undefined)[0].names).toEqual([]);
  });
});
