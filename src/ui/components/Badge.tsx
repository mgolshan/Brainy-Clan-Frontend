import { StyleSheet, View } from 'react-native';

import { withAlpha } from '@/ui/components/Card';
import { Icon, type IconName } from '@/ui/components/Icon';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';
import type { Theme } from '@/ui/themes';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'accent';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  /** Custom tint (category color). */
  color?: string;
  /**
   * Die-cut sticker look in kid worlds (thick white outline, tilt, hard shadow) for rewards and
   * highlights; a normal pill elsewhere.
   */
  sticker?: boolean;
  /** Sticker tilt in degrees (default -4). */
  tilt?: number;
}

/** Sticker fill and label colors: solid for tones with a tested on-color, soft otherwise. */
function stickerColors(theme: Theme, tone: BadgeTone): { bg: string; fg: string; icon: string } {
  const c = theme.colors;
  switch (tone) {
    case 'primary':
      return { bg: c.primary, fg: c.onPrimary, icon: c.onPrimary };
    case 'success':
      return { bg: c.success, fg: c.onSuccess, icon: c.onSuccess };
    case 'danger':
      return { bg: c.danger, fg: c.onDanger, icon: c.onDanger };
    case 'warning':
      return { bg: c.warningSoft, fg: c.text, icon: c.warning };
    case 'accent':
      return { bg: withAlpha(c.accent, 0.35), fg: c.text, icon: c.text };
    case 'neutral':
      return { bg: c.surfaceAlt, fg: c.text, icon: c.textMuted };
  }
}

/** Kid worlds' sticker badge: a tilted die-cut sticker. */
function StickerBadge({ label, tone = 'accent', icon, tilt = -4 }: BadgeProps) {
  const theme = useTheme();
  const c = theme.colors;
  const { bg, fg, icon: iconColor } = stickerColors(theme, tone);
  return (
    <View
      style={[
        styles.sticker,
        {
          transform: [{ rotate: theme.reducedMotion ? '0deg' : `${tilt}deg` }],
          backgroundColor: c.surface,
          borderRadius: theme.radius.pill,
          shadowColor: c.shadow,
          shadowOpacity: theme.scheme === 'dark' ? 0.6 : 0.28,
          shadowRadius: 0,
          shadowOffset: { width: 2, height: 3 },
          elevation: 3,
        },
      ]}>
      <View
        style={[
          styles.stickerFace,
          {
            backgroundColor: bg,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.sm + 2,
          },
        ]}>
        {icon ? <Icon name={icon} size={theme.type.label.size + 2} color={iconColor} /> : null}
        <Text variant="label" weight="bold" color={fg} numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Small status pill (or a sticker in kid worlds when `sticker` is set). */
export function Badge(props: BadgeProps) {
  const { label, tone = 'neutral', icon, color, sticker } = props;
  const theme = useTheme();
  if (sticker && theme.vibe === 'kid' && !color) return <StickerBadge {...props} />;
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
  // The accent is decorative (often a light yellow / cyan): its label uses the text color.
  const textColor = tone === 'accent' && !color ? c.text : fg;
  const bg =
    tone === 'neutral' && !color
      ? c.surfaceAlt
      : withAlpha(fg, theme.scheme === 'dark' ? 0.2 : tone === 'accent' ? 0.22 : 0.13);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderRadius: theme.surface === 'outlined' ? theme.radius.sm : theme.radius.pill,
          paddingHorizontal: theme.spacing.sm,
          borderWidth: theme.surface === 'outlined' || theme.card === 'neon' ? 1 : 0,
          borderColor: theme.card === 'neon' ? withAlpha(fg, 0.6) : fg,
        },
      ]}>
      {icon ? <Icon name={icon} size={theme.type.caption.size + 2} color={fg} /> : null}
      <Text
        variant="caption"
        weight="bold"
        color={textColor}
        numberOfLines={1}
        style={styles.label}>
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
    // Never wider than its container: a long label (French, large text) ellipsizes instead.
    maxWidth: '100%',
  },
  label: { flexShrink: 1 },
  sticker: { padding: 3, alignSelf: 'flex-start', maxWidth: '100%' },
  stickerFace: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
});
