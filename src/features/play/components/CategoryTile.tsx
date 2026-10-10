import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import type { Category } from '@/api/types';
import { categoryColor, categoryVisual } from '@/features/play/categoryVisuals';
import { Badge, Card, Icon, IconBubble, Text, useTheme, withAlpha } from '@/ui';

interface CategoryTileProps {
  category: Pick<Category, 'slug' | 'name' | 'icon' | 'is_locked' | 'children'>;
  onPress?: () => void;
  /** Position among siblings (drives the category color). */
  index?: number;
}

/**
 * A category card. Playful: filled with the category's candy color + emoji. Others: theme surface
 * with a tinted icon. Locked categories stay visible with an upgrade hint.
 */
export function CategoryTile({ category, onPress, index }: CategoryTileProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const color = categoryColor(theme, category, index);
  const visual = categoryVisual(category.icon);
  const playful = theme.key === 'playful';
  const subCount = category.children?.length ?? 0;
  const fg = playful ? '#FFFFFF' : theme.colors.text;

  return (
    <Card
      onPress={onPress}
      tint={color}
      padding="md"
      accessibilityLabel={
        category.is_locked ? `${category.name}, ${t('play.locked')}` : category.name
      }
      accessibilityHint={category.is_locked ? t('play.lockedHint') : undefined}
      style={[
        styles.tile,
        playful && {
          backgroundColor: category.is_locked ? theme.colors.surfaceAlt : color,
          borderColor: category.is_locked ? theme.colors.border : withAlpha('#000000', 0.18),
        },
        { minHeight: theme.touchTarget * 2.3, opacity: category.is_locked && !playful ? 0.7 : 1 },
      ]}>
      <View style={styles.top}>
        {playful ? (
          <View style={[styles.emojiBubble, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
            <RNText style={styles.emoji}>{category.is_locked ? '🔒' : visual.emoji}</RNText>
          </View>
        ) : (
          <IconBubble color={color} size={theme.touchTarget - 4}>
            <Icon name={category.is_locked ? 'lock-closed-outline' : visual.icon} color={color} />
          </IconBubble>
        )}
        {category.is_locked ? <Badge label={t('play.locked')} tone="warning" icon="star" /> : null}
      </View>
      <Text
        variant="title"
        color={playful && !category.is_locked ? fg : undefined}
        numberOfLines={2}>
        {category.name}
      </Text>
      {category.is_locked ? (
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {t('play.lockedHint')}
        </Text>
      ) : subCount > 0 ? (
        <Text variant="caption" color={playful ? 'rgba(255,255,255,0.9)' : undefined} tone="muted">
          {t('play.subCategories', { count: subCount })}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: 8, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  emojiBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 30 },
});
