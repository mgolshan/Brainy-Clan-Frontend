import type { ThemeKey } from '@/api/types';
import type { ThemeLayout } from '@/ui/themes/layout';

export type { ThemeKey };
export type ColorScheme = 'light' | 'dark';

/** Semantic color tokens. Components never use raw hex values, only these. */
export interface ThemeColors {
  /** Screen background. */
  background: string;
  /** Second background tone (header bands, gradient end). */
  backgroundAlt: string;
  /** Cards, sheets. */
  surface: string;
  /** Inputs, chips, pressed rows, tracks. */
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  /** Pressed state / 3D edge of chunky buttons. */
  primaryPressed: string;
  onPrimary: string;
  /** Tinted background for selected states. */
  primarySoft: string;
  secondary: string;
  secondaryPressed: string;
  onSecondary: string;
  accent: string;
  success: string;
  successSoft: string;
  onSuccess: string;
  danger: string;
  dangerSoft: string;
  onDanger: string;
  warning: string;
  warningSoft: string;
  /** Lives / hearts in the play screen. */
  heart: string;
  tabBar: string;
  shadow: string;
  /** Modal backdrops. */
  overlay: string;
  /** Accent gradient (sleek buttons, hero bands, progress fills). At least two stops. */
  gradient: readonly [string, string, ...string[]];
  /** Per-category tints; a category picks one by a stable hash of its slug. */
  categories: readonly string[];
  /** Confetti piece colors. */
  confetti: readonly string[];
}

/** Font family names (keys loaded in `fonts.ts`). One family per weight: Android ignores fontWeight on custom fonts. */
export interface ThemeFonts {
  display: string;
  heading: string;
  body: string;
  bodyMedium: string;
  bodyBold: string;
  /** Wisdom-card quotes. */
  quote: string;
}

export interface TypeStyle {
  size: number;
  lineHeight: number;
  letterSpacing: number;
}

export type TypeVariant =
  'display' | 'heading' | 'title' | 'bodyLarge' | 'body' | 'label' | 'caption' | 'quote';

export interface ThemeRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
}

export interface ThemeSpacing {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

/**
 * How cards and buttons get depth:
 * - `chunky`: candy look, thick border + hard bottom edge (playful)
 * - `glass`: hairline border, translucent surface, gradient sheen (sleek)
 * - `soft`: soft drop shadow (modern)
 * - `outlined`: flat with a clear border, high contrast (classic)
 */
export type SurfaceStyle = 'chunky' | 'glass' | 'soft' | 'outlined';

/** Entering animation flavour for content. */
export type EnterStyle = 'bounce' | 'rise' | 'fade' | 'none';

export interface ThemeMotion {
  /** Scale applied while a button is pressed (1 = no scale). */
  pressScale: number;
  spring: { damping: number; stiffness: number; mass: number };
  /** Base duration for timing animations (ms). */
  duration: number;
  enter: EnterStyle;
}

/** What happens when a session is completed. */
export type CelebrationStyle = 'confetti' | 'glow' | 'check' | 'calm';

/** Static definition of one theme (one file per theme in this folder). */
export interface ThemeDefinition {
  key: ThemeKey;
  colors: Record<ColorScheme, ThemeColors>;
  /** Used when the color-scheme preference is "system" (sleek is dark-first). */
  preferredScheme?: ColorScheme;
  fonts: ThemeFonts;
  type: Record<TypeVariant, TypeStyle>;
  radius: ThemeRadius;
  spacing: ThemeSpacing;
  /** Minimum height/width of anything tappable. */
  touchTarget: number;
  borderWidth: number;
  surface: SurfaceStyle;
  motion: ThemeMotion;
  celebration: CelebrationStyle;
  /** Category tiles show emoji instead of line icons. */
  emojiIcons: boolean;
  /** Heading text transform for small labels (e.g. sleek uses uppercase overlines). */
  overlineUppercase: boolean;
}

/** The resolved theme components receive from `useTheme()`. */
export interface Theme extends Omit<ThemeDefinition, 'colors'> {
  scheme: ColorScheme;
  colors: ThemeColors;
  /** Member text scale (accessibility), already applied to `type`. */
  textScale: number;
  /** Member setting or OS "reduce motion": animations must be skipped. */
  reducedMotion: boolean;
  calmTimers: boolean;
  /** Max content widths (centered column on tablets / desktop web), see `layout.ts`. */
  layout: ThemeLayout;
}
