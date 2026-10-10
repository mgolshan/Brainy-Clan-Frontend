import { StyleSheet, View } from 'react-native';

import { withAlpha } from '@/ui/components/Card';
import { Icon, type IconName } from '@/ui/components/Icon';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'accent';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  /** Custom tint (category color). */
  color?: string;
}

/** Small status pill. */
export function Badge({ label, tone = 'neutral', icon, color }: BadgeProps) {
  const theme = useTheme();
  const c = theme.colors;
  const fg =
    color ??
    {
      neutral: c.textMuted,
      primary: c.primary,
      success: c.success,
      danger: c.danger,
      warning: c.warning,
      accent: c.accent,
    }[tone];
  const bg =
    tone === 'neutral' && !color
      ? c.surfaceAlt
      : withAlpha(fg, theme.scheme === 'dark' ? 0.2 : 0.13);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderRadius: theme.surface === 'outlined' ? theme.radius.sm : theme.radius.pill,
          paddingHorizontal: theme.spacing.sm,
          borderWidth: theme.surface === 'outlined' ? 1 : 0,
          borderColor: fg,
        },
      ]}>
      {icon ? <Icon name={icon} size={theme.type.caption.size + 2} color={fg} /> : null}
      <Text variant="caption" weight="bold" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
});
