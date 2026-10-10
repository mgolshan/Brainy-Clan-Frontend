import type { Accessibility, Member, Policy } from '@/api/types';
import { classic } from '@/ui/themes/classic';
import { modern } from '@/ui/themes/modern';
import { playful } from '@/ui/themes/playful';
import { sleek } from '@/ui/themes/sleek';
import type { ThemeDefinition, ThemeKey } from '@/ui/themes/types';

export * from '@/ui/themes/types';

export const themes: Record<ThemeKey, ThemeDefinition> = { playful, sleek, modern, classic };

export const DEFAULT_THEME: ThemeKey = 'modern';

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in themes;
}

/**
 * Theme selection: the member's own pick (`accessibility.theme`) overrides the policy default
 * (`ui_theme`, decided by the backend from the age band); signed out / unknown → `modern`.
 * The app never maps ages to themes itself.
 */
export function selectThemeKey(policy?: Policy | null, member?: Member | null): ThemeKey {
  const override = member?.accessibility?.theme;
  if (isThemeKey(override)) return override;
  const fromPolicy = policy?.ui_theme;
  if (isThemeKey(fromPolicy)) return fromPolicy;
  return DEFAULT_THEME;
}

/** Accessibility in effect: member settings, else the policy defaults, else neutral. */
export function selectAccessibility(
  policy?: Policy | null,
  member?: Member | null,
): Omit<Accessibility, 'theme'> {
  const own = member?.accessibility;
  const defaults = policy?.accessibility_defaults;
  return {
    text_scale: own?.text_scale ?? defaults?.text_scale ?? 1,
    reduced_motion: own?.reduced_motion ?? defaults?.reduced_motion ?? false,
    calm_timers: own?.calm_timers ?? defaults?.calm_timers ?? false,
  };
}
