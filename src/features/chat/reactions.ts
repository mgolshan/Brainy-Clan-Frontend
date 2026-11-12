import type { ChatHistory } from '@/features/chat/messages';
import type { ChatMessage, ChatReaction, ChatReactionChange, ChatReactionKey } from '@/api/types';

/**
 * Pure chat-reaction logic (contract 2026-11-11): the fixed set, the optimistic toggle, and
 * patching reactions into the cached history pages (mutation results and the
 * `GET /family/chat/reactions?since=` poll). Unknown keys are skipped everywhere.
 */

/** The fixed set, in display order. Kid-safe; the server rejects anything else (422). */
export const REACTION_KEYS: readonly ChatReactionKey[] = [
  'heart',
  'thumbs_up',
  'laugh',
  'wow',
  'party',
  'star',
];

export const REACTION_EMOJI: Record<ChatReactionKey, string> = {
  heart: '❤️',
  thumbs_up: '👍',
  laugh: '😂',
  wow: '😮',
  party: '🎉',
  star: '⭐',
};

/** `GET /family/chat/reactions` returns at most this many rows; a full page means "call again". */
export const REACTION_PAGE_SIZE = 200;

export function isReactionKey(key: string): key is ChatReactionKey {
  return (REACTION_KEYS as readonly string[]).includes(key);
}

export interface ShownReaction extends ChatReaction {
  key: ChatReactionKey;
}

/** Reactions to show under a message: known keys with a count, in the fixed order; none on tombstones. */
export function visibleReactions(message: Pick<ChatMessage, 'deleted' | 'reactions'>) {
  if (message.deleted) return [];
  const list = (message.reactions ?? []).filter(
    (r): r is ShownReaction => isReactionKey(r.key) && r.count > 0,
  );
  return list.sort((a, b) => REACTION_KEYS.indexOf(a.key) - REACTION_KEYS.indexOf(b.key));
}

/** The viewer's own reaction key on a message, if any. */
export function myReaction(reactions: readonly ChatReaction[] | undefined): ChatReactionKey | null {
  const mine = (reactions ?? []).find((r) => r.mine && isReactionKey(r.key));
  return mine ? (mine.key as ChatReactionKey) : null;
}

/**
 * What tapping `key` does: tapping your own reaction removes it (`DELETE`), any other key sets
 * it, replacing your earlier one (`PUT`).
 */
export function reactionIntent(
  reactions: readonly ChatReaction[] | undefined,
  key: ChatReactionKey,
): { action: 'set'; key: ChatReactionKey } | { action: 'remove' } {
  return myReaction(reactions) === key ? { action: 'remove' } : { action: 'set', key };
}

/**
 * Reactions after the viewer sets `key` (or removes theirs with `null`): one reaction per member,
 * counts updated, empty keys dropped, fixed order. Used for the optimistic update.
 */
export function applyOwnReaction(
  reactions: readonly ChatReaction[] | undefined,
  key: ChatReactionKey | null,
  memberId: number | null,
): ChatReaction[] {
  const out: ChatReaction[] = [];
  for (const r of reactions ?? []) {
    if (!r.mine) {
      out.push(r);
      continue;
    }
    const ids = memberId === null ? r.member_ids : r.member_ids.filter((id) => id !== memberId);
    const count = Math.max(0, r.count - 1);
    if (count > 0) out.push({ ...r, count, mine: false, member_ids: ids });
  }
  if (key !== null) {
    const existing = out.find((r) => r.key === key);
    const ids = memberId === null ? [] : [memberId];
    if (existing) {
      const i = out.indexOf(existing);
      out[i] = {
        ...existing,
        count: existing.count + 1,
        mine: true,
        member_ids: [...existing.member_ids, ...ids],
      };
    } else {
      out.push({ key, count: 1, mine: true, member_ids: ids });
    }
  }
  const order = (k: string) => {
    const i = REACTION_KEYS.indexOf(k as ChatReactionKey);
    return i < 0 ? REACTION_KEYS.length : i;
  };
  return out.sort((a, b) => order(a.key) - order(b.key));
}

/** Same reactions (key, count, mine, members) in the same order. */
export function sameReactions(
  a: readonly ChatReaction[] | undefined,
  b: readonly ChatReaction[] | undefined,
): boolean {
  const x = a ?? [];
  const y = b ?? [];
  if (x.length !== y.length) return false;
  return x.every((r, i) => {
    const s = y[i];
    return (
      r.key === s.key &&
      r.count === s.count &&
      r.mine === s.mine &&
      r.member_ids.length === s.member_ids.length &&
      r.member_ids.every((id, j) => id === s.member_ids[j])
    );
  });
}

/**
 * Puts reactions into the cached pages: `updates` maps message id → reactions. Only messages that
 * changed get a new object (so only their bubbles re-render); tombstones keep `[]`. Returns the
 * same history object when nothing changed.
 */
export function patchReactions(
  history: ChatHistory | undefined,
  updates: ReadonlyMap<number, readonly ChatReaction[]>,
): ChatHistory | undefined {
  if (!history || updates.size === 0) return history;
  let changed = false;
  const pages = history.pages.map((page) => {
    let pageChanged = false;
    const data = page.data.map((m) => {
      const next = updates.get(m.id);
      if (next === undefined) return m;
      const reactions = m.deleted ? [] : [...next];
      if (sameReactions(m.reactions, reactions)) return m;
      pageChanged = true;
      return { ...m, reactions };
    });
    if (!pageChanged) return page;
    changed = true;
    return { ...page, data };
  });
  return changed ? { ...history, pages } : history;
}

/** Rows of `GET /family/chat/reactions` (oldest change first) → id → latest reactions. */
export function reactionUpdates(
  changes: readonly ChatReactionChange[],
): Map<number, ChatReaction[]> {
  const map = new Map<number, ChatReaction[]>();
  for (const change of changes) map.set(change.message_id, change.reactions ?? []);
  return map;
}

/** The cached reactions of one message (for the optimistic update and its rollback). */
export function findReactions(
  history: ChatHistory | undefined,
  messageId: number,
): ChatReaction[] | undefined {
  for (const page of history?.pages ?? []) {
    const m = page.data.find((x) => x.id === messageId);
    if (m) return m.reactions ?? [];
  }
  return undefined;
}

/**
 * Who reacted, per shown reaction: nicknames from the family members (ids of members not found,
 * e.g. not loaded yet, are skipped).
 */
export function reactorNames(
  reactions: readonly ShownReaction[],
  members: readonly { id: number; nickname: string }[] | undefined,
): { key: ChatReactionKey; emoji: string; names: string[] }[] {
  const byId = new Map((members ?? []).map((m) => [m.id, m.nickname]));
  return reactions.map((r) => ({
    key: r.key,
    emoji: REACTION_EMOJI[r.key],
    names: r.member_ids.map((id) => byId.get(id)).filter((n): n is string => !!n),
  }));
}

/** One page of `GET /family/chat/reactions` (`since` omitted → `data: []` and the current cursor). */
export type FetchReactionChanges = (
  since: string | null,
) => Promise<{ data: ChatReactionChange[]; meta: { cursor: string } }>;

/**
 * Reads every reaction change after `cursor`: calls again with the new cursor while a page is
 * full (200 rows), at most `maxPages` times. Later rows win. Returns the merged updates and the
 * cursor to use next time.
 */
export async function collectReactionChanges(
  fetchPage: FetchReactionChanges,
  cursor: string,
  maxPages = 10,
): Promise<{ updates: Map<number, ChatReaction[]>; cursor: string }> {
  const updates = new Map<number, ChatReaction[]>();
  let next = cursor;
  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(next);
    for (const [id, reactions] of reactionUpdates(result.data)) updates.set(id, reactions);
    if (result.meta.cursor) next = result.meta.cursor;
    if (result.data.length < REACTION_PAGE_SIZE) break;
  }
  return { updates, cursor: next };
}
