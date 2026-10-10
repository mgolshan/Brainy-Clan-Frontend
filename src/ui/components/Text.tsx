import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/ui/ThemeProvider';
import type { Theme, ThemeColors, TypeVariant } from '@/ui/themes';

export type TextTone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'primary'
  | 'onPrimary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'accent';

export type TextWeight = 'regular' | 'medium' | 'bold';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  /** Explicit color (e.g. a category tint); wins over `tone`. */
  color?: string;
  weight?: TextWeight;
  align?: TextStyle['textAlign'];
}

type SolidColorKey = {
  [K in keyof ThemeColors]: ThemeColors[K] extends string ? K : never;
}[keyof ThemeColors];

const toneKey: Record<TextTone, SolidColorKey> = {
  default: 'text',
  muted: 'textMuted',
  subtle: 'textSubtle',
  primary: 'primary',
  onPrimary: 'onPrimary',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  accent: 'accent',
};

export function fontFor(theme: Theme, variant: TypeVariant, weight?: TextWeight): string {
  if (variant === 'display') return theme.fonts.display;
  if (variant === 'heading' || variant === 'title') return theme.fonts.heading;
  if (variant === 'quote') return theme.fonts.quote;
  const w = weight ?? (variant === 'label' ? 'medium' : 'regular');
  return w === 'bold'
    ? theme.fonts.bodyBold
    : w === 'medium'
      ? theme.fonts.bodyMedium
      : theme.fonts.body;
}

/** Themed text: font family, size (with the member text scale), line height and color. */
export function Text({
  variant = 'body',
  tone = 'default',
  color,
  weight,
  align,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const t = theme.type[variant];
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      accessibilityRole={variant === 'display' || variant === 'heading' ? 'header' : undefined}
      {...rest}
      style={[
        {
          fontFamily: fontFor(theme, variant, weight),
          fontSize: t.size,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          color: color ?? theme.colors[toneKey[tone]],
          textAlign: align,
        },
        style,
      ]}
    />
  );
}

/** Small section label; uppercase + tracked in themes that use overlines (sleek). */
export function Overline({ children, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <Text
      variant="caption"
      tone="muted"
      weight="bold"
      {...rest}
      style={[
        theme.overlineUppercase && { textTransform: 'uppercase', letterSpacing: 1.4 },
        style,
      ]}>
      {children}
    </Text>
  );
}
