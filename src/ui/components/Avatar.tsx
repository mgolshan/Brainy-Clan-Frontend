import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { clanSvg, parseAvatarKey } from '@/ui/avatars';
import { withAlpha } from '@/ui/components/Card';
import { Icon } from '@/ui/components/Icon';
import { useTheme } from '@/ui/ThemeProvider';

export { isAvatarKey } from '@/ui/avatars';

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface AvatarProps {
  avatar: string | null | undefined;
  size?: number;
  /** Ring in the accent color (current member, selection). */
  ring?: boolean;
  accessibilityLabel?: string;
}

/**
 * Round avatar bubble with the member's Clan character (generated SVG art, see
 * scripts/clan). The bubble tint comes from the theme palette (one tint per species, so a
 * family of tigers shares it). Unknown or missing keys show a neutral person placeholder.
 */
export const Avatar = memo(function Avatar({
  avatar,
  size = 48,
  ring,
  accessibilityLabel,
}: AvatarProps) {
  const theme = useTheme();
  const palette = theme.colors.categories;
  const xml = clanSvg(avatar);
  const species = parseAvatarKey(avatar)?.species;
  const tint = species ? palette[hash(species) % palette.length] : theme.colors.textMuted;
  const isClassic = theme.surface === 'outlined';

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: withAlpha(tint, theme.scheme === 'dark' ? 0.28 : 0.18),
          borderWidth: ring
            ? Math.max(2, size / 18)
            : isClassic
              ? 1.5
              : theme.surface === 'chunky'
                ? 2
                : 0,
          borderColor: ring
            ? theme.colors.primary
            : isClassic
              ? theme.colors.borderStrong
              : withAlpha(tint, 0.6),
        },
      ]}>
      {xml ? (
        <SvgXml xml={xml} width={size} height={size} />
      ) : (
        <Icon name="person" size={size * 0.52} color={theme.colors.textMuted} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
