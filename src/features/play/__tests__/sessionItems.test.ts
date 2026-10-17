import type { SessionItem } from '@/api/types';
import { markAnswered, mergeItems } from '@/features/play/sessionItems';

function item(id: number, position: number, answered = false): SessionItem {
  return {
    id,
    position,
    type: 'multiple_choice',
    is_redemption: false,
    points: 1,
    payload: { question: `Q${id}` },
    answered,
  };
}

describe('mergeItems', () => {
  it('adds new items and sorts by position', () => {
    const merged = mergeItems([item(2, 2)], [item(3, 3), item(1, 1)]);
    expect(merged.map((it) => it.id)).toEqual([1, 2, 3]);
  });

  it('takes the server copy of an item', () => {
    const merged = mergeItems([item(1, 1)], [{ ...item(1, 1, true), points: 3 }]);
    expect(merged[0]).toMatchObject({ answered: true, points: 3 });
  });

  it('never turns an answered item back into an unanswered one', () => {
    // Continue from a "current session" payload fetched before the answer was given.
    const local = [item(1, 1, true), item(2, 2)];
    const stale = [item(1, 1, false), item(2, 2, false)];
    expect(mergeItems(local, stale).map((it) => it.answered)).toEqual([true, false]);
  });
});

describe('markAnswered', () => {
  it('marks only the given item', () => {
    const items = [item(1, 1), item(2, 2)];
    expect(markAnswered(items, 2).map((it) => it.answered)).toEqual([false, true]);
    expect(items[1].answered).toBe(false);
  });
});
