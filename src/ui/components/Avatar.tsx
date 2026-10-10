import { StyleSheet, Text as RNText, View } from 'react-native';

import { AVATAR_KEYS, type AvatarKey } from '@/api/types';
import { withAlpha } from '@/ui/components/Card';
import { useTheme } from '@/ui/ThemeProvider';

/** The fixed avatar set from the API contract, rendered as emoji. */
export const AVATAR_EMOJI: Record<AvatarKey, string> = {
  fox: '🦊',
  owl: '🦉',
  panda: '🐼',
  lion: '🦁',
  koala: '🐨',
  penguin: '🐧',
  tiger: '🐯',
  rabbit: '🐰',
  bear: '🐻',
  frog: '🐸',
  cat: '🐱',
  dog: '🐶',
  unicorn: '🦄',
  dragon: '🐲',
  turtle: '🐢',
  octopus: '🐙',
};

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === 'string' && (AVATAR_KEYS as readonly string[]).includes(value);
}

export function avatarEmoji(key: string | null | undefined): string {
  return isAvatarKey(key) ? AVATAR_EMOJI[key] : '🙂';
}

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

/** Round avatar bubble with the member's animal; the bubble tint comes from the theme palette. */
export function Avatar({ avatar, size = 48, ring, accessibilityLabel }: AvatarProps) {
  const theme = useTheme();
  const palette = theme.colors.categories;
  const tint = palette[hash(avatar ?? 'none') % palette.length];
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
      <RNText style={{ fontSize: size * 0.56, lineHeight: size * 0.72 }} allowFontScaling={false}>
        {avatarEmoji(avatar)}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
