import type { TFunction } from 'i18next';

import type { Policy, WorldUnlock } from '@/api/types';
import { isThemeKey, type ThemeKey } from '@/ui/themes';

/**
 * How a world unlocks, as the app understands it. `other` = an unlock type this app version
 * doesn't know yet (shown as plainly "locked" while locked).
 */
export type ParsedUnlock = WorldUnlock | { type: 'other' };

/** A world of the server catalog that this app can render (unknown keys are dropped). */
export interface World {
  key: ThemeKey;
  unlock: ParsedUnlock;
  unlocked: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;

function parseUnlock(raw: unknown): ParsedUnlock {
  if (!isRecord(raw)) return { type: 'other' };
  switch (raw.type) {
    case 'free':
      return { type: 'free' };
    case 'family_plan':
      return { type: 'family_plan' };
    case 'points':
    case 'streak': {
      const required = toCount(raw.required);
      if (required === null) return { type: 'other' };
      return { type: raw.type, required, progress: toCount(raw.progress) ?? 0 };
    }
    default:
      return { type: 'other' };
  }
}

/**
 * `GET /me/worlds` (or the admin member variant) → the worlds this app knows, in the server's
 * display order. Unknown keys (future worlds), duplicates and malformed entries are skipped.
 * `unlocked` is the server's verdict; the app never re-checks thresholds.
 */
export function parseWorldCatalog(raw: unknown): World[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<ThemeKey>();
  const worlds: World[] = [];
  for (const entry of raw) {
    if (!isRecord(entry) || !isThemeKey(entry.key) || seen.has(entry.key)) continue;
    seen.add(entry.key);
    worlds.push({
      key: entry.key,
      unlock: parseUnlock(entry.unlock),
      unlocked: entry.unlocked === true,
    });
  }
  return worlds;
}

/**
 * The worlds the picker shows. With a catalog: its order, only known worlds (already parsed).
 * Without one (still loading, or a backend without `/me/worlds`): every app world, unlocked —
 * the server still rejects a locked pick (403 `world_locked`).
 */
export function pickerWorlds(
  catalog: readonly World[] | null | undefined,
  appOrder: readonly ThemeKey[],
): World[] {
  if (catalog) return [...catalog];
  return appOrder.map((key) => ({ key, unlock: { type: 'free' }, unlocked: true }));
}

/** Whether a picker choice may be selected (`null` = automatic, always allowed). */
export function isWorldSelectable(key: ThemeKey | null, worlds: readonly World[]): boolean {
  if (key === null) return true;
  return worlds.find((w) => w.key === key)?.unlocked === true;
}

/** The lock hint under a locked world. `null` when unlocked. */
export type WorldHint =
  | {
      kind: 'progress';
      type: 'points' | 'streak';
      progress: number;
      required: number;
      ratio: number;
    }
  | { kind: 'familyPlan' }
  | { kind: 'locked' };

export function worldHint(world: World): WorldHint | null {
  if (world.unlocked) return null;
  const { unlock } = world;
  switch (unlock.type) {
    case 'points':
    case 'streak': {
      const progress = Math.min(unlock.progress, unlock.required);
      const ratio = unlock.required > 0 ? progress / unlock.required : 1;
      return { kind: 'progress', type: unlock.type, progress, required: unlock.required, ratio };
    }
    case 'family_plan':
      return { kind: 'familyPlan' };
    default:
      return { kind: 'locked' };
  }
}

/** "23 / 50 points", "2 / 3-day streak", "Family plan", "Locked". */
export function formatWorldHint(hint: WorldHint, t: TFunction): string {
  switch (hint.kind) {
    case 'progress':
      return hint.type === 'points'
        ? t('worlds.hint.points', {
            count: hint.required,
            progress: hint.progress,
            required: hint.required,
          })
        : t('worlds.hint.streak', {
            count: hint.required,
            progress: hint.progress,
            required: hint.required,
          });
    case 'familyPlan':
      return t('worlds.hint.familyPlan');
    default:
      return t('worlds.hint.locked');
  }
}

/** Same rule as the paywall screen: adult admins whose policy allows purchases. */
export function canPurchaseFamilyPlan(policy: Policy | null | undefined, isAdmin: boolean) {
  return !!policy && policy.purchases_allowed && !policy.is_child && isAdmin;
}

/**
 * What tapping a world in the picker does: select it (unlocked), open the paywall (Family plan
 * world, member may buy), ask a parent (Family plan world, may not buy), or explain how to
 * unlock it (points / streak / unknown).
 */
export type WorldTapAction = 'select' | 'paywall' | 'askParent' | 'howTo';

export function worldTapAction(world: World, canPurchase: boolean): WorldTapAction {
  if (world.unlocked) return 'select';
  if (world.unlock.type === 'family_plan') return canPurchase ? 'paywall' : 'askParent';
  return 'howTo';
}

/** Longer "how to unlock" text for a locked points / streak / unknown world. */
export function howToUnlockText(world: World, worldName: string, t: TFunction): string {
  const { unlock } = world;
  if (unlock.type === 'points' || unlock.type === 'streak') {
    const remaining = Math.max(0, unlock.required - unlock.progress);
    // Points: "Earn 27 more points…" (plural on what's left); streak: "Play 3 days in a row…".
    return t(unlock.type === 'points' ? 'worlds.howTo.points' : 'worlds.howTo.streak', {
      count: unlock.type === 'points' ? remaining : unlock.required,
      required: unlock.required,
      progress: Math.min(unlock.progress, unlock.required),
      remaining,
      name: worldName,
    });
  }
  if (unlock.type === 'family_plan') return t('worlds.askParent');
  return t('worlds.howTo.other', { name: worldName });
}
