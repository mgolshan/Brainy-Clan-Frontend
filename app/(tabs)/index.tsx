import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { API_URL } from '@/config/env';
import { Screen } from '@/ui/Screen';
import { fontSize, radius, spacing, useThemeColors } from '@/ui/theme';

/** Laravel's built-in health route (`/up`) answers 200 when the app is booted. */
function useBackendHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async ({ signal }) => {
      await api.get<unknown>('/up', { signal, timeoutMs: 5000 });
      return true;
    },
    retry: false,
    refetchInterval: 30_000,
  });
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const health = useBackendHealth();

  const status = health.isPending
    ? { label: t('home.checking'), color: c.textMuted }
    : health.isSuccess
      ? { label: t('home.connected'), color: c.success }
      : { label: t('home.notReachable'), color: c.danger };

  return (
    <Screen title={t('app.title')}>
      <Text style={[styles.body, { color: c.textMuted }]}>{t('app.tagline')}</Text>

      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <Text style={[styles.body, { color: c.text }]}>
          {t('home.backendStatus')}:{' '}
          <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
        </Text>
        <Text selectable style={[styles.small, { color: c.textMuted }]}>
          {t('home.apiUrl', { url: API_URL })}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.md, gap: spacing.xs },
  body: { fontSize: fontSize.body },
  status: { fontWeight: '700' },
  small: { fontSize: 13 },
});
