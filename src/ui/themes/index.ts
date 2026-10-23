import type { Accessibility, Member, Policy } from '@/api/types';
import { classic } from '@/ui/themes/classic';
import { dino } from '@/ui/themes/dino';
import { jungle } from '@/ui/themes/jungle';
import { lofi } from '@/ui/themes/lofi';
import { midnight } from '@/ui/themes/midnight';
import { modern } from '@/ui/themes/modern';
import { nature } from '@/ui/themes/nature';
import { neon } from '@/ui/themes/neon';
import { playful } from '@/ui/themes/playful';
import { sea } from '@/ui/themes/sea';
import { sleek } from '@/ui/themes/sleek';
import { space } from '@/ui/themes/space';
import { sticker } from '@/ui/themes/sticker';
import type { ThemeDefinition, ThemeKey } from '@/ui/themes/types';

export * from '@/ui/themes/types';
export * from '@/ui/themes/layout';

/** Every world (picker order: kids' worlds, teens' worlds, then the calm ones). */
export const themes: Record<ThemeKey, ThemeDefinition> = {
  playful,
  jungle,
  space,
  sea,
  dino,
  sleek,
  neon,
  sticker,
  lofi,
  modern,
  classic,
  nature,
  midnight,
};

/** Picker / preview order. */
export const WORLD_ORDER: readonly ThemeKey[] = [
  'playful',
  'jungle',
  'space',
  'sea',
  'dino',
  'sleek',
  'neon',
  'sticker',
  'lofi',
  'modern',
  'classic',
  'nature',
  'midnight',
];

export const DEFAULT_THEME: ThemeKey = 'modern';

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(themes, value);
}

/**
 * Theme selection: the member's own pick (`accessibility.theme`) overrides the policy default
 * (`ui_theme`, decided by the backend from the age band); signed out / unknown → `modern`.
 * The app never maps ages to themes itself. When the stored pick is no longer unlocked
 * (`theme_unlocked: false`, e.g. the family plan ended) the member's `default_ui_theme` shows
 * instead; the stored pick comes back when the world unlocks again.
 */
export function selectThemeKey(policy?: Policy | null, member?: Member | null): ThemeKey {
  const override = member?.accessibility?.theme;
  if (member?.theme_unlocked === false) {
    if (isThemeKey(member.default_ui_theme)) return member.default_ui_theme;
  } else if (isThemeKey(override)) {
    return override;
  }
  const fromPolicy = policy?.ui_theme;
  if (isThemeKey(fromPolicy)) return fromPolicy;
  return DEFAULT_THEME;
}

/** Accessibility in effect: member settings, else the policy defaults, else neutral. */
export function selectAccessibility(
  policy?: Policy | null,
  member?: Member | null,
): Omit<Accessibility, 'theme' | 'sound_effects'> & { sound_effects: boolean } {
  const own = member?.accessibility;
  const defaults = policy?.accessibility_defaults;
  return {
    text_scale: own?.text_scale ?? defaults?.text_scale ?? 1,
    reduced_motion: own?.reduced_motion ?? defaults?.reduced_motion ?? false,
    calm_timers: own?.calm_timers ?? defaults?.calm_timers ?? false,
    sound_effects: own?.sound_effects ?? defaults?.sound_effects ?? false,
  };
}
