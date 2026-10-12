import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useCellFont } from '@/challenges/useCellFont';
import { Icon, PressableScale, Text, type IconName, useTheme, withAlpha } from '@/ui';

export type PadKeyTone = 'default' | 'active' | 'primary' | 'faded';

interface PadKeyProps {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  width: number;
  height?: number;
  tone?: PadKeyTone;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Small text under the label (e.g. "notes"). */
  style?: StyleProp<ViewStyle>;
}

/**
 * One key of an on-screen pad (Sudoku digits, Math Sprint keypad, letter tiles). Sized by the
 * caller from the available width; look follows the theme surface (chunky, glass, soft,
 * outlined).
 */
export function PadKey({
  label,
  icon,
  onPress,
  width,
  height,
  tone = 'default',
  disabled,
  accessibilityLabel,
  style,
}: PadKeyProps) {
  const theme = useTheme();
  const c = theme.colors;
  const h = height ?? Math.max(theme.touchTarget, width * 0.9);
  const chunky = theme.surface === 'chunky';
  const filled = tone === 'active' || tone === 'primary';
  const bg = filled ? c.primary : tone === 'faded' ? c.surfaceAlt : c.surface;
  const fg = filled ? c.onPrimary : tone === 'faded' ? c.textSubtle : c.text;
  const border = filled
    ? c.primaryPressed
    : theme.surface === 'outlined'
      ? c.borderStrong
      : theme.surface === 'glass'
        ? withAlpha(c.primary, 0.35)
        : c.border;
  const cellFont = useCellFont();
  // Grows with the text size, but stays inside the key.
  const fontSize = Math.min(cellFont(h, 0.48, 0.6), theme.type.heading.size * 1.4);

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, selected: tone === 'active' }}
      style={[
        styles.key,
        {
          width,
          height: h,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: theme.surface === 'soft' ? 1 : Math.max(1, theme.borderWidth),
          borderBottomWidth: chunky ? theme.borderWidth + 3 : undefined,
          borderRadius: theme.key === 'classic' ? theme.radius.sm : theme.radius.md,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {icon ? <Icon name={icon} size={Math.min(28, h * 0.45)} color={fg} /> : null}
      {label ? (
        <Text
          variant="heading"
          weight="bold"
          color={fg}
          maxFontSizeMultiplier={1}
          style={{ fontSize, lineHeight: Math.round(fontSize * 1.2) }}>
          {label}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  key: { alignItems: 'center', justifyContent: 'center' },
});
