import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ProgressBar, SceneView, Text, useTheme } from '@/ui';

export const WORLD_PREVIEW_H = 120;

/**
 * Live miniature of the active (nested) world: its scene, a card and a button. Static. Wrap it
 * in a `ThemeProvider` for the world to show.
 */
export const WorldThumbnail = memo(function WorldThumbnail({
  width,
  height = WORLD_PREVIEW_H,
}: {
  width: number;
  height?: number;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.thumb,
        {
          height,
          backgroundColor: theme.colors.background,
          borderRadius: Math.max(8, theme.radius.md - 2),
        },
      ]}>
      <SceneView width={width} height={height} animated={false} />
      <View style={styles.thumbContent}>
        <Card padding="xs" plain style={styles.thumbCard}>
          <Text variant="caption" weight="bold" numberOfLines={1}>
            {t('appearance.previewTitle')}
          </Text>
          <ProgressBar value={0.6} />
        </Card>
        <Button
          title={t('appearance.previewButton')}
          size="sm"
          icon="play"
          fullWidth={false}
          tapSound={false}
          accessibilityLabel=""
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  thumb: { overflow: 'hidden' },
  thumbContent: { flex: 1, padding: 10, justifyContent: 'center', gap: 8 },
  thumbCard: { gap: 6 },
});
