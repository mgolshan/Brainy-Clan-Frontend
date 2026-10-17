import type { SessionItem } from '@/api/types';

/**
 * Merge items by id and sort by position. `GET`, `second-chance` and `redemption` return all
 * session items; merging (rather than replacing) keeps answers recorded locally before a refetch.
 * `answered` never goes back to false: an older copy (e.g. the cached "Continue your game"
 * payload) must not reopen an item the member already answered.
 */
export function mergeItems(current: SessionItem[], incoming: SessionItem[]): SessionItem[] {
  const byId = new Map<number, SessionItem>();
  for (const item of current) byId.set(item.id, item);
  for (const item of incoming) {
    const known = byId.get(item.id);
    byId.set(item.id, { ...known, ...item, answered: Boolean(known?.answered || item.answered) });
  }
  return [...byId.values()].sort((a, b) => a.position - b.position);
}

/** The items with `itemId` marked as answered. */
export function markAnswered(items: SessionItem[], itemId: number): SessionItem[] {
  return items.map((it) => (it.id === itemId ? { ...it, answered: true } : it));
}
