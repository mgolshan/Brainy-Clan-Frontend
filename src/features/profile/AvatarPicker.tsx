import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AVATAR_KEYS, type AvatarKey } from '@/api/types';
import { Avatar, PressableScale, Text, useTheme } from '@/ui';

interface AvatarPickerProps {
  value: string | null | undefined;
  onChange: (avatar: AvatarKey) => void;
  label?: string;
}

/** Grid of the fixed avatar set from the API contract. */
export function AvatarPicker({ value, onChange, label }: AvatarPickerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const size = theme.key === 'classic' ? 56 : theme.key === 'playful' ? 58 : 50;
  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="muted">
        {label ?? t('profile.avatar')}
      </Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {AVATAR_KEYS.map((key) => (
          <PressableScale
            key={key}
            onPress={() => onChange(key)}
            haptic
            accessibilityRole="radio"
            accessibilityLabel={t(`avatars.${key}`)}
            accessibilityState={{ checked: value === key }}
            style={styles.cell}>
            <Avatar avatar={key} size={size} ring={value === key} />
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { borderRadius: 999 },
});
