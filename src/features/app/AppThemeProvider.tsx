import type { ReactNode } from 'react';

import { useMe } from '@/features/auth/hooks';
import { usePreferences } from '@/store/preferences';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { selectAccessibility, selectThemeKey } from '@/ui/themes';

/**
 * Feeds the app-wide ThemeProvider from server state: theme = member override → policy
 * `ui_theme` → `modern`; accessibility from the member (or policy defaults). Signed-out screens
 * get `modern`. The light/dark preference is device-local.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const me = useMe().data;
  const schemePreference = usePreferences((s) => s.colorScheme);
  const themeKey = selectThemeKey(me?.policy, me?.member);
  const a11y = selectAccessibility(me?.policy, me?.member);

  return (
    <ThemeProvider
      themeKey={themeKey}
      schemePreference={schemePreference}
      textScale={a11y.text_scale}
      reducedMotion={a11y.reduced_motion}
      calmTimers={a11y.calm_timers}>
      {children}
    </ThemeProvider>
  );
}
