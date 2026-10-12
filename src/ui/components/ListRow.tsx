import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/ui/components/Icon';
import { PressableScale } from '@/ui/components/PressableScale';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';

interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Shown under the subtitle (e.g. a row action that would squeeze the text as `trailing`). */
  below?: ReactNode;
  onPress?: () => void;
  /** Show a chevron (default when pressable). */
  chevron?: boolean;
  accessibilityHint?: string;
}

/** A row inside a Card: leading visual, title/subtitle, trailing element. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  below,
  onPress,
  chevron,
  accessibilityHint,
}: ListRowProps) {
  const theme = useTheme();
  const body = (
    <>
      {leading}
      <View style={styles.flex}>
        <Text weight="bold" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
        {below ? (
          <View style={[styles.below, { marginTop: theme.spacing.xs }]}>{below}</View>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
      {(chevron ?? !!onPress) ? (
        <Icon name="chevron-forward" color={theme.colors.textSubtle} />
      ) : null}
    </>
  );
  const style = [
    styles.row,
    { minHeight: theme.touchTarget + 8, gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  ];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      style={style}>
      {body}
    </PressableScale>
  );
}

export function Divider() {
  const theme = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth * (theme.key === 'classic' ? 2 : 1),
        backgroundColor: theme.colors.border,
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  below: { alignSelf: 'flex-start' },
});
