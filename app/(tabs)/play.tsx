import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { Screen } from '@/ui/Screen';
import { useThemeColors } from '@/ui/theme';

export default function PlayScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <Screen title={t('tabs.play')}>
      <Text style={{ color: c.textMuted }}>{t('common.comingSoon')}</Text>
    </Screen>
  );
}
