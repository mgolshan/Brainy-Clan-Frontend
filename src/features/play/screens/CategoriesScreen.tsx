import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Category } from '@/api/types';
import { useMeasuredWidth } from '@/challenges/useMeasuredWidth';
import { useCategories, useCurrentSession } from '@/features/play/api';
import { findCategory, findRootSlug } from '@/features/play/categoryVisuals';
import { CategoryTile } from '@/features/play/components/CategoryTile';
import { ResumeGameCard } from '@/features/play/components/ResumeGameCard';
import { useStartAndOpen } from '@/features/play/useStartAndOpen';
import { errorMessage } from '@/lib/errorMessage';
import {
  Appear,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  Text,
  contentWidth,
  gridColumns,
  useTheme,
} from '@/ui';

/** Narrowest category tile; wider windows get more columns (2 on phones, up to 4 on iPad). */
const MIN_TILE = 150;
const GRID_GAP = 12;

interface CategoryGridProps {
  categories: Category[];
  onSelect: (category: Category) => void;
  /** Top-level ancestor's slug when showing sub-categories (their illustration). */
  parentSlug?: string;
}

function CategoryGrid({ categories, onSelect, parentSlug }: CategoryGridProps) {
  const theme = useTheme();
  const window = useWindowDimensions();
  const [measured, onLayout] = useMeasuredWidth();
  // The measured width is exact (scrollbars, safe areas); the window estimate covers the first frame.
  const available = measured || contentWidth(window.width, 'wide', theme.spacing.lg, theme.layout);
  const columns = gridColumns(available, MIN_TILE, GRID_GAP);
  const basis = Math.floor((available - GRID_GAP * (columns - 1)) / columns);
  return (
    <View style={styles.grid} onLayout={onLayout}>
      {categories.map((cat, i) => (
        <Appear key={cat.id} index={i} style={[styles.cell, { flexBasis: basis }]}>
          <CategoryTile
            category={cat}
            index={i}
            parentSlug={parentSlug}
            onPress={() => onSelect(cat)}
          />
        </Appear>
      ))}
    </View>
  );
}

/** Shared selection logic: locked → upgrade hint, has sub-scopes → drill down, else play. */
function useCategorySelection() {
  const { open, isPending, error, variables } = useStartAndOpen();
  const [lockedName, setLockedName] = useState<string | null>(null);
  const select = (cat: Category) => {
    if (cat.is_locked) {
      setLockedName(cat.name);
      return;
    }
    setLockedName(null);
    if (cat.children.length > 0) {
      router.push({ pathname: '/category/[id]', params: { id: String(cat.id) } });
    } else {
      open(cat.id);
    }
  };
  return { select, open, isPending, error, startingId: isPending ? variables : null, lockedName };
}

function StatusLines({
  lockedName,
  error,
  starting,
}: {
  lockedName: string | null;
  error: unknown;
  starting: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <>
      {starting ? <Loading fill={false} label={t('play.starting')} /> : null}
      {error ? <Text tone="danger">{errorMessage(error, t)}</Text> : null}
      {lockedName ? (
        <Card variant="tinted" tint={theme.colors.warning}>
          <Text weight="bold">{t('play.lockedTitle', { name: lockedName })}</Text>
          <Text variant="caption" tone="muted">
            {t('play.lockedHint')}
          </Text>
        </Card>
      ) : null}
    </>
  );
}

/** Play tab: the category tree visible to the member (`GET /categories`). */
export function CategoriesScreen() {
  const { t } = useTranslation();
  const categories = useCategories();
  const current = useCurrentSession();
  const selection = useCategorySelection();

  return (
    <Screen
      width="wide"
      title={t('play.title')}
      subtitle={t('play.subtitle')}
      onRefresh={() => {
        void categories.refetch();
        void current.refetch();
      }}
      refreshing={categories.isRefetching}>
      <ResumeGameCard />
      {categories.isPending ? (
        <Loading fill={false} />
      ) : categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : categories.data.length === 0 ? (
        <EmptyState title={t('play.noCategories')} emoji="🧭" icon="compass-outline" />
      ) : (
        <>
          <StatusLines
            lockedName={selection.lockedName}
            error={selection.error}
            starting={selection.isPending}
          />
          <CategoryGrid categories={categories.data} onSelect={selection.select} />
        </>
      )}
    </Screen>
  );
}

/** Drill-down into a category's sub-scopes; "play all" plays the whole subtree. */
export function CategoryScreen({ id }: { id: number }) {
  const { t } = useTranslation();
  const categories = useCategories();
  const selection = useCategorySelection();
  const category = findCategory(categories.data, id);

  if (categories.isPending) return <Loading />;
  if (!category) {
    return (
      <Screen back>
        {categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
        ) : (
          <EmptyState title={t('errors.notFound')} emoji="🔍" icon="search-outline" />
        )}
      </Screen>
    );
  }

  return (
    <Screen title={category.name} subtitle={t('play.pickTopic')} back width="wide">
      <Button
        title={t('play.playAll', { name: category.name })}
        icon="play"
        size="lg"
        loading={selection.isPending && selection.startingId === category.id}
        onPress={() => selection.open(category.id)}
      />
      <StatusLines lockedName={selection.lockedName} error={selection.error} starting={false} />
      <CategoryGrid
        categories={category.children}
        onSelect={selection.select}
        parentSlug={findRootSlug(categories.data, category.id)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  cell: { flexGrow: 1 },
});
