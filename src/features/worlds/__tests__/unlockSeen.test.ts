import AsyncStorage from '@react-native-async-storage/async-storage';

import type { World } from '@/features/worlds/catalog';
import {
  loadSeenState,
  markCelebrated,
  nextSeenState,
  parseSeenState,
  sameSeenState,
  saveSeenState,
  seenStorageKey,
  type WorldSeenState,
} from '@/features/worlds/unlockSeen';

const catalog = (unlocked: Record<string, boolean>): World[] =>
  Object.entries(unlocked).map(([key, isUnlocked]) => ({
    key: key as World['key'],
    unlock: isUnlocked ? { type: 'free' } : { type: 'points', required: 50, progress: 0 },
    unlocked: isUnlocked,
  }));

describe('nextSeenState (newly unlocked detection)', () => {
  it('celebrates nothing on the first look, only records what is locked', () => {
    const state = nextSeenState(null, catalog({ playful: true, jungle: false, sea: false }));
    expect(state).toEqual({ locked: ['jungle', 'sea'], pending: [], celebrated: [] });
  });

  it('queues worlds that flipped from locked to unlocked, in catalog order', () => {
    const first = nextSeenState(null, catalog({ playful: true, jungle: false, sea: false }));
    const next = nextSeenState(first, catalog({ playful: true, sea: true, jungle: true }));
    expect(next.pending).toEqual(['sea', 'jungle']);
    expect(next.locked).toEqual([]);
  });

  it('does not celebrate worlds that were never seen locked (new free worlds)', () => {
    const first = nextSeenState(null, catalog({ playful: true }));
    const next = nextSeenState(first, catalog({ playful: true, nature: true }));
    expect(next.pending).toEqual([]);
  });

  it('keeps pending worlds across refetches until celebrated', () => {
    let state = nextSeenState(null, catalog({ jungle: false }));
    state = nextSeenState(state, catalog({ jungle: true }));
    state = nextSeenState(state, catalog({ jungle: true }));
    expect(state.pending).toEqual(['jungle']);
  });

  it('drops a pending world that locked again before it was shown', () => {
    let state = nextSeenState(null, catalog({ dino: false }));
    state = nextSeenState(state, catalog({ dino: true }));
    state = nextSeenState(state, catalog({ dino: false }));
    expect(state.pending).toEqual([]);
    expect(state.locked).toEqual(['dino']);
  });

  it('celebrates a world only once, even if it locks and unlocks again', () => {
    let state = nextSeenState(null, catalog({ dino: false }));
    state = nextSeenState(state, catalog({ dino: true }));
    state = markCelebrated(state, 'dino');
    expect(state).toEqual({ locked: [], pending: [], celebrated: ['dino'] });
    state = nextSeenState(state, catalog({ dino: false }));
    state = nextSeenState(state, catalog({ dino: true }));
    expect(state.pending).toEqual([]);
  });

  it('compares states by value', () => {
    const a: WorldSeenState = { locked: ['a'], pending: [], celebrated: [] };
    expect(sameSeenState(a, { ...a, locked: ['a'] })).toBe(true);
    expect(sameSeenState(a, { ...a, pending: ['a'] })).toBe(false);
    expect(sameSeenState(null, a)).toBe(false);
  });
});

describe('persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips per member id', async () => {
    const state: WorldSeenState = { locked: ['sea'], pending: ['jungle'], celebrated: ['dino'] };
    await saveSeenState(7, state);
    expect(await loadSeenState(7)).toEqual(state);
    expect(await loadSeenState(8)).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem(seenStorageKey(7)))!)).toEqual(state);
  });

  it('treats malformed stored data as nothing stored', () => {
    expect(parseSeenState(null)).toBeNull();
    expect(parseSeenState('{oops')).toBeNull();
    expect(parseSeenState('[]')).toBeNull();
    expect(parseSeenState('{"locked":["a"],"pending":[1],"celebrated":[]}')).toBeNull();
  });

  it('never throws when storage fails', async () => {
    const get = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('denied'));
    const set = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    await expect(loadSeenState(1)).resolves.toBeNull();
    await expect(
      saveSeenState(1, { locked: [], pending: [], celebrated: [] }),
    ).resolves.toBeUndefined();
    get.mockRestore();
    set.mockRestore();
  });
});
