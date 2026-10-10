import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { ColorSchemePreference } from '@/store/preferences';
import {
  DEFAULT_THEME,
  themes,
  type ColorScheme,
  type Theme,
  type ThemeKey,
  type TypeStyle,
  type TypeVariant,
} from '@/ui/themes';

const MIN_TEXT_SCALE = 0.8;
const MAX_TEXT_SCALE = 1.6;

export interface ThemeSelection {
  themeKey: ThemeKey;
  /** Device preference; "system" follows the OS (or the theme's preferred scheme). */
  schemePreference?: ColorSchemePreference;
  /**
   * Member `accessibility.text_scale` (0.8–1.6), multiplied onto the theme's own type scale.
   * Policy defaults are 1.0 for every band (classic's larger type is in the theme), so nothing
   * else compounds.
   */
  textScale?: number;
  /** Member `accessibility.reduced_motion`; the OS setting is always honoured as well. */
  reducedMotion?: boolean;
  calmTimers?: boolean;
}

export function resolveTheme(
  selection: ThemeSelection,
  systemScheme: ColorScheme,
  osReducedMotion: boolean,
): Theme {
  const def = themes[selection.themeKey] ?? themes[DEFAULT_THEME];
  const pref = selection.schemePreference ?? 'system';
  const scheme: ColorScheme = pref === 'system' ? (def.preferredScheme ?? systemScheme) : pref;

  const textScale = Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, selection.textScale ?? 1));
  const type = {} as Record<TypeVariant, TypeStyle>;
  for (const variant of Object.keys(def.type) as TypeVariant[]) {
    const base = def.type[variant];
    type[variant] = {
      size: Math.round(base.size * textScale),
      lineHeight: Math.round(base.lineHeight * textScale),
      letterSpacing: base.letterSpacing,
    };
  }

  const reducedMotion = osReducedMotion || selection.reducedMotion === true;

  return {
    ...def,
    scheme,
    colors: def.colors[scheme],
    type,
    // Larger text needs larger targets too.
    touchTarget: Math.round(def.touchTarget * Math.max(1, textScale * 0.9)),
    motion: reducedMotion ? { ...def.motion, pressScale: 1, enter: 'none' } : def.motion,
    textScale,
    reducedMotion,
    calmTimers: selection.calmTimers === true,
  };
}

const ThemeContext = createContext<Theme | null>(null);

interface ThemeProviderProps extends ThemeSelection {
  children: ReactNode;
}

/**
 * Provides the resolved theme. Nest a second provider to preview another theme locally
 * (the dev theme preview screen does this).
 */
export function ThemeProvider({
  children,
  themeKey,
  schemePreference,
  textScale,
  reducedMotion,
  calmTimers,
}: ThemeProviderProps) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const osReducedMotion = useReducedMotion();

  const theme = useMemo(
    () =>
      resolveTheme(
        { themeKey, schemePreference, textScale, reducedMotion, calmTimers },
        system,
        osReducedMotion,
      ),
    [themeKey, schemePreference, textScale, reducedMotion, calmTimers, system, osReducedMotion],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** The active theme. Components read colors, type, radius, spacing and motion only from here. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

/**
 * Memoised themed styles: `const useStyles = makeStyles((t) => StyleSheet.create({...}))`.
 */
export function makeStyles<T>(factory: (theme: Theme) => T): () => T {
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => factory(theme), [theme]);
  };
}
