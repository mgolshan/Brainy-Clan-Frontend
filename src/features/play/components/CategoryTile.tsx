import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Category } from '@/api/types';
import { categoryColor } from '@/features/play/categoryVisuals';
import { Badge, Card, Icon, Text, useTheme, withAlpha } from '@/ui';
import { CategoryArt } from '@/ui/illustrations';

interface CategoryTileProps {
  category: Pick<Category, 'slug' | 'name' | 'icon' | 'is_locked' | 'children'>;
  onPress?: () => void;
  /** Position among siblings (drives the category color). */
  index?: number;
  /** Top-level ancestor's slug for sub-categories (their illustration). */
  parentSlug?: string;
}

/**
 * A category card in the world's card style (sticker, plank, porthole, glass, neon, flat) with
 * the category's Clan illustration in a tinted window. Locked categories stay visible, dimmed,
 * with a lock and an upgrade hint.
 */
export function CategoryTile({ category, onPress, index, parentSlug }: CategoryTileProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const color = categoryColor(theme, category, index);
  const subCount = category.children?.length ?? 0;
  const kid = theme.vibe === 'kid';
  const art = kid ? 104 : 88;
  const dark = theme.scheme === 'dark';

  return (
    <Card
      onPress={onPress}
      tint={color}
      padding="sm"
      accessibilityLabel={
        category.is_locked ? `${category.name}, ${t('play.locked')}` : category.name
      }
      accessibilityHint={category.is_locked ? t('play.lockedHint') : undefined}
      style={[styles.tile, { minHeight: theme.touchTarget * 2.3, gap: theme.spacing.sm }]}>
      <View
        style={[
          styles.well,
          {
            height: art + theme.spacing.sm,
            borderRadius: Math.max(6, theme.radius.lg - theme.spacing.sm),
            backgroundColor: withAlpha(color, dark ? 0.22 : 0.16),
            borderWidth: theme.card === 'neon' ? 1 : 0,
            borderColor: withAlpha(color, 0.5),
          },
        ]}>
        <View style={category.is_locked ? styles.dim : undefined}>
          <CategoryArt slug={category.slug} parentSlug={parentSlug} size={art} />
        </View>
        {category.is_locked ? (
          <View
            style={[
              styles.lock,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}>
            <Icon name="lock-closed" size={18} color={theme.colors.text} />
          </View>
        ) : null}
      </View>
      <View style={[styles.body, { paddingHorizontal: theme.spacing.xs }]}>
        <Text variant="title" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
          {category.name}
        </Text>
        {category.is_locked ? (
          <Badge label={t('play.locked')} tone="warning" icon="star" sticker tilt={-3} />
        ) : subCount > 0 ? (
          <Text variant="caption" tone="muted">
            {t('play.subCategories', { count: subCount })}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1 },
  well: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dim: { opacity: 0.45 },
  lock: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { gap: 4, paddingBottom: 4 },
});
