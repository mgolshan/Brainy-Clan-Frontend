import type { TFunction } from 'i18next';

import type { Policy } from '@/api/types';
import {
  canPurchaseFamilyPlan,
  formatWorldHint,
  howToUnlockText,
  isWorldSelectable,
  parseWorldCatalog,
  pickerWorlds,
  worldHint,
  worldTapAction,
  type World,
} from '@/features/worlds/catalog';
import i18n from '@/i18n';

let en: TFunction;
let fr: TFunction;

beforeAll(async () => {
  await i18n.changeLanguage('en');
  en = i18n.getFixedT('en');
  fr = i18n.getFixedT('fr');
});

const contractExample = [
  { key: 'playful', unlock: { type: 'free' }, unlocked: true },
  { key: 'jungle', unlock: { type: 'points', required: 50, progress: 23 }, unlocked: false },
  { key: 'sea', unlock: { type: 'streak', required: 3, progress: 2 }, unlocked: false },
  { key: 'dino', unlock: { type: 'family_plan' }, unlocked: false },
];

const world = (overrides: Partial<World>): World => ({
  key: 'jungle',
  unlock: { type: 'free' },
  unlocked: true,
  ...overrides,
});

describe('parseWorldCatalog', () => {
  it('keeps the contract example in server order', () => {
    expect(parseWorldCatalog(contractExample)).toEqual([
      { key: 'playful', unlock: { type: 'free' }, unlocked: true },
      { key: 'jungle', unlock: { type: 'points', required: 50, progress: 23 }, unlocked: false },
      { key: 'sea', unlock: { type: 'streak', required: 3, progress: 2 }, unlocked: false },
      { key: 'dino', unlock: { type: 'family_plan' }, unlocked: false },
    ]);
  });

  it('skips unknown (future) worlds, duplicates and malformed entries', () => {
    const parsed = parseWorldCatalog([
      { key: 'volcano-island', unlock: { type: 'free' }, unlocked: true },
      null,
      'modern',
      { key: 'constructor', unlock: { type: 'free' }, unlocked: true },
      { key: 'modern', unlock: { type: 'free' }, unlocked: true },
      { key: 'modern', unlock: { type: 'free' }, unlocked: false },
      { unlock: { type: 'free' }, unlocked: true },
    ]);
    expect(parsed.map((w) => w.key)).toEqual(['modern']);
    expect(parsed[0]?.unlocked).toBe(true);
  });

  it('never treats a missing or odd `unlocked` as unlocked', () => {
    const parsed = parseWorldCatalog([
      { key: 'space', unlock: { type: 'points', required: 150, progress: 10 } },
      { key: 'neon', unlock: { type: 'family_plan' }, unlocked: 'yes' },
    ]);
    expect(parsed.every((w) => !w.unlocked)).toBe(true);
  });

  it('maps unknown or incomplete unlock types to "other" and tidies numbers', () => {
    const parsed = parseWorldCatalog([
      { key: 'space', unlock: { type: 'achievement', id: 4 }, unlocked: false },
      { key: 'neon', unlock: { type: 'points' }, unlocked: false },
      { key: 'sea', unlock: { type: 'streak', required: 3.7, progress: -2 }, unlocked: false },
      { key: 'lofi', unlock: { type: 'streak', required: 7 }, unlocked: false },
      { key: 'nature', unlocked: true },
    ]);
    expect(parsed.map((w) => w.unlock)).toEqual([
      { type: 'other' },
      { type: 'other' },
      { type: 'streak', required: 3, progress: 0 },
      { type: 'streak', required: 7, progress: 0 },
      { type: 'other' },
    ]);
  });

  it('returns an empty list for anything that is not an array', () => {
    expect(parseWorldCatalog(null)).toEqual([]);
    expect(parseWorldCatalog({ data: [] })).toEqual([]);
  });
});

describe('pickerWorlds', () => {
  const appOrder = ['playful', 'jungle', 'modern'] as const;

  it('uses the server order and only worlds the app knows', () => {
    const catalog = parseWorldCatalog([
      { key: 'modern', unlock: { type: 'free' }, unlocked: true },
      { key: 'future-world', unlock: { type: 'free' }, unlocked: true },
      { key: 'jungle', unlock: { type: 'points', required: 50, progress: 0 }, unlocked: false },
    ]);
    expect(pickerWorlds(catalog, appOrder).map((w) => w.key)).toEqual(['modern', 'jungle']);
  });

  it('falls back to every app world, unlocked, without a catalog', () => {
    for (const missing of [null, undefined]) {
      const list = pickerWorlds(missing, appOrder);
      expect(list.map((w) => w.key)).toEqual(['playful', 'jungle', 'modern']);
      expect(list.every((w) => w.unlocked)).toBe(true);
    }
  });
});

describe('gating', () => {
  const worlds = parseWorldCatalog(contractExample);

  it('only unlocked worlds (and automatic) are selectable', () => {
    expect(isWorldSelectable(null, worlds)).toBe(true);
    expect(isWorldSelectable('playful', worlds)).toBe(true);
    expect(isWorldSelectable('jungle', worlds)).toBe(false);
    expect(isWorldSelectable('dino', worlds)).toBe(false);
    // Not in the catalog at all: not selectable.
    expect(isWorldSelectable('classic', worlds)).toBe(false);
  });

  it('decides what a tap does', () => {
    const [free, points, streak, plan] = worlds as [World, World, World, World];
    expect(worldTapAction(free, false)).toBe('select');
    expect(worldTapAction(points, true)).toBe('howTo');
    expect(worldTapAction(streak, true)).toBe('howTo');
    expect(worldTapAction(plan, true)).toBe('paywall');
    expect(worldTapAction(plan, false)).toBe('askParent');
    expect(worldTapAction({ ...plan, unlocked: true }, false)).toBe('select');
    expect(worldTapAction(world({ unlock: { type: 'other' }, unlocked: false }), true)).toBe(
      'howTo',
    );
  });

  it('lets only adult admins whose policy allows purchases buy the plan', () => {
    const policy = (p: Partial<Policy>) =>
      ({ purchases_allowed: true, is_child: false, ...p }) as Policy;
    expect(canPurchaseFamilyPlan(policy({}), true)).toBe(true);
    expect(canPurchaseFamilyPlan(policy({}), false)).toBe(false);
    expect(canPurchaseFamilyPlan(policy({ purchases_allowed: false }), true)).toBe(false);
    expect(canPurchaseFamilyPlan(policy({ is_child: true }), true)).toBe(false);
    expect(canPurchaseFamilyPlan(null, true)).toBe(false);
  });
});

describe('hints', () => {
  it('has no hint for unlocked worlds', () => {
    expect(worldHint(world({ unlocked: true }))).toBeNull();
  });

  it('formats points, streak and family plan hints', () => {
    const [, points, streak, plan] = parseWorldCatalog(contractExample) as [
      World,
      World,
      World,
      World,
    ];
    const pointsHint = worldHint(points)!;
    expect(pointsHint).toMatchObject({ kind: 'progress', progress: 23, required: 50 });
    expect(pointsHint.kind === 'progress' ? pointsHint.ratio : 0).toBeCloseTo(0.46);
    expect(formatWorldHint(pointsHint, en)).toBe('23 / 50 points');
    expect(formatWorldHint(worldHint(streak)!, en)).toBe('2 / 3-day streak');
    expect(formatWorldHint(worldHint(plan)!, en)).toBe('Family plan');
    expect(formatWorldHint(worldHint(plan)!, fr)).toBe('Formule Famille');
    expect(formatWorldHint(pointsHint, fr)).toBe('23 / 50 points');
  });

  it('caps progress at the threshold and handles a zero threshold', () => {
    const over = worldHint(
      world({ unlock: { type: 'points', required: 50, progress: 80 }, unlocked: false }),
    );
    expect(over).toMatchObject({ progress: 50, ratio: 1 });
    const zero = worldHint(
      world({ unlock: { type: 'streak', required: 0, progress: 0 }, unlocked: false }),
    );
    expect(zero).toMatchObject({ ratio: 1 });
  });

  it('says "Locked" for unlock types the app does not know', () => {
    const hint = worldHint(world({ unlock: { type: 'other' }, unlocked: false }))!;
    expect(formatWorldHint(hint, en)).toBe('Locked');
  });

  it('explains how to unlock with the server numbers', () => {
    const points = world({
      unlock: { type: 'points', required: 50, progress: 23 },
      unlocked: false,
    });
    expect(howToUnlockText(points, 'Jungle Adventure', en)).toBe(
      'Earn 27 more points to unlock Jungle Adventure. You have 23 of 50.',
    );
    const one = world({ unlock: { type: 'points', required: 50, progress: 49 }, unlocked: false });
    expect(howToUnlockText(one, 'Jungle Adventure', en)).toMatch(/^Earn 1 more point to/);
    const streak = world({ unlock: { type: 'streak', required: 3, progress: 2 }, unlocked: false });
    expect(howToUnlockText(streak, 'Under the Sea', en)).toBe(
      'Play 3 days in a row to unlock Under the Sea. Your best streak so far: 2.',
    );
    const plan = world({ unlock: { type: 'family_plan' }, unlocked: false });
    expect(howToUnlockText(plan, 'Dino Valley', en)).toBe('Ask a parent to get the Family plan');
  });
});
