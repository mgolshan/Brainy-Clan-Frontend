import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { usePolicy } from '@/features/auth/hooks';
import { avatarLabel } from '@/lib/labels';
import {
  type AvatarGroup,
  type AvatarKey,
  groupKeys,
  groupOfKey,
  orderedGroups,
} from '@/ui/avatars';
import { Avatar, PressableScale, Segmented, Text, useTheme } from '@/ui';

interface AvatarPickerProps {
  value: string | null | undefined;
  onChange: (avatar: AvatarKey) => void;
  label?: string;
  /**
   * Policy age band of the member the avatar is for; its group is listed first (ordering only,
   * every character stays pickable). Omitted = the signed-in member's own band; null = unknown.
   */
  ageBand?: string | null;
}

const GAP = 10;

/** The Clan characters in groups (Kids, Teens, Parents, Grandparents) with a responsive grid. */
export function AvatarPicker({ value, onChange, label, ageBand }: AvatarPickerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const ownBand = usePolicy()?.age_band;
  const groups = orderedGroups(ageBand === undefined ? ownBand : ageBand);
  const [picked, setPicked] = useState<AvatarGroup | null>(null);
  const [width, setWidth] = useState(0);
  // Until a tab is tapped, show the current avatar's group, else the suggested one.
  const group = picked ?? groupOfKey(value) ?? groups[0];

  const min = theme.key === 'classic' || theme.key === 'playful' ? 64 : 56;
  const cols = Math.max(4, Math.floor((width + GAP) / (min + GAP)));
  const size = width > 0 ? Math.min(92, Math.floor((width - GAP * (cols - 1)) / cols)) : min;
  const selectedLabel = avatarLabel(t, value);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text variant="label" tone="muted">
          {label ?? t('profile.avatar')}
        </Text>
        {selectedLabel ? (
          <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
            {selectedLabel}
          </Text>
        ) : null}
      </View>
      <Segmented
        accessibilityLabel={t('avatars.groupsLabel')}
        options={groups.map((g) => ({ value: g, label: t(`avatars.groups.${g}`) }))}
        value={group}
        onChange={setPicked}
      />
      <View
        style={[styles.grid, { gap: GAP }]}
        accessibilityRole="radiogroup"
        accessibilityLabel={t(`avatars.groups.${group}`)}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {groupKeys(group).map((key) => (
          <PressableScale
            key={key}
            onPress={() => onChange(key)}
            haptic
            accessibilityRole="radio"
            accessibilityLabel={avatarLabel(t, key) ?? key}
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
  wrap: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: 999 },
});
