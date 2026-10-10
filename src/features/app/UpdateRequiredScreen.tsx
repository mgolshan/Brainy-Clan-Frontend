import { useTranslation } from 'react-i18next';
import { Linking, Platform, StyleSheet, Text as RNText, View } from 'react-native';

import { useHealth } from '@/features/app/useHealth';
import { APP_VERSION } from '@/config/env';
import { Button, Card, Icon, IconBubble, Screen, Text, useTheme } from '@/ui';
import { useAppStatus } from '@/store/appStatus';

/** Shown when the API answers 426 or reports a newer `min_app_version`. */
export function UpdateRequiredScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const health = useHealth();

  const openStore = () => {
    if (Platform.OS === 'web') {
      window.location.reload();
      return;
    }
    // Store listings don't exist yet (F7); the stores' own app pages open the update flow.
    void Linking.openURL(
      Platform.OS === 'ios' ? 'itms-apps://apps.apple.com' : 'market://details?id=app.brainyclan',
    ).catch(() => undefined);
  };

  return (
    <Screen scroll contentStyle={styles.fill}>
      <View style={styles.center}>
        <IconBubble size={112}>
          {theme.emojiIcons ? (
            <RNText style={styles.emoji}>🚀</RNText>
          ) : (
            <Icon name="cloud-download-outline" size={52} color={theme.colors.primary} />
          )}
        </IconBubble>
        <Text variant="heading" align="center">
          {t('update.title')}
        </Text>
        <Text tone="muted" align="center">
          {t('update.body')}
        </Text>
      </View>
      <Card>
        <Text variant="caption" tone="muted">
          {t('update.versions', {
            current: APP_VERSION,
            required: health.data?.min_app_version ?? '?',
          })}
        </Text>
      </Card>
      <Button
        title={Platform.OS === 'web' ? t('update.reload') : t('update.button')}
        icon="arrow-up-circle-outline"
        onPress={openStore}
      />
      <Button
        title={t('update.checkAgain')}
        variant="ghost"
        onPress={() => {
          useAppStatus.getState().setUpdateRequired(false);
          void health.refetch();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { justifyContent: 'center' },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  emoji: { fontSize: 56 },
});
