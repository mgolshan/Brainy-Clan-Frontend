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
  /**
   * Large background-scene layers (hills, leaves, nebulae, gradient-mesh blobs), back to front.
   * Text may sit on them, so each one (composited over `background`) keeps WCAG AA with
   * `text` / `textMuted` (checked by the contrast test). rgba allowed.
   */
  scene: readonly string[];
  /** Small scene decorations (flowers, planets, stars, grid lines): kept at the screen edges. */
  sceneAccent: readonly string[];
  /** Glow / rim color: neon outlines, porthole rims, glowing buttons. */
  glow: string;
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

/** Background scene behind `Screen` (`src/ui/scenes/`). */
export type SceneKey = 'none' | 'candy' | 'jungle' | 'space' | 'neon' | 'glass';

/**
 * Card look:
 * - `flat`: the theme surface (soft shadow / outlined, see `SurfaceStyle`)
 * - `glass`: frosted translucent panel with a sheen
 * - `sticker`: candy sticker, thick outline + hard drop edge + gloss
 * - `chunky`: wooden plank with a deep bottom edge and a leaf on the corner
 * - `porthole`: round-cornered ship panel with a double rim and rivets
 * - `neon`: dark panel with a glowing outline
 */
export type CardStyle = 'flat' | 'glass' | 'sticker' | 'chunky' | 'porthole' | 'neon';

/** Button look: `flat` (solid/gradient), `press3d` (candy edge that squishes), `glow`. */
export type ButtonStyle = 'flat' | 'press3d' | 'glow';

/** Progress bar look: `bar`, `vine` (grows leaves), `rocket` (flies along), `neon`. */
export type ProgressStyle = 'bar' | 'vine' | 'rocket' | 'neon';

/** The success moment (completed session, goal reached). */
export type CelebrationStyle = 'confetti' | 'stars' | 'bubbles' | 'sprinkles' | 'calm';

/** Sound pack key read by `useSoundEffects` (`src/features/sound`). */
export type SoundPackKey = 'candy' | 'jungle' | 'space' | 'neon' | 'glass' | 'calm';

/**
 * Overall tone shared by worlds, for the few places that differ beyond tokens: `kid` (emoji,
 * pill shapes, big characters), `teen` (restrained, overlines, gradients), `calm` (adults,
 * seniors).
 */
export type ThemeVibe = 'kid' | 'teen' | 'calm';

/** Hint shown in the world picker (a label only: never a rule, any member may pick any world). */
export type WorldAudience = 'kids' | 'teens' | 'everyone';

/** Static definition of one theme (one file per theme in this folder). */
export interface ThemeDefinition {
  key: ThemeKey;
  /** i18n key of the world's name (e.g. `appearance.themes.jungle` → "Jungle Adventure"). */
  displayName: `appearance.themes.${ThemeKey}`;
  /** Picker hint only ("for kids"), never a rule. */
  audience: WorldAudience;
  vibe: ThemeVibe;
  scene: SceneKey;
  card: CardStyle;
  button: ButtonStyle;
  progress: ProgressStyle;
  soundPack: SoundPackKey;
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
