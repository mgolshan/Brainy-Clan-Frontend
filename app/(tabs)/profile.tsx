import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { Screen } from '@/ui/Screen';
import { useThemeColors } from '@/ui/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <Screen title={t('tabs.profile')}>
      <Text style={{ color: c.textMuted }}>{t('common.comingSoon')}</Text>
      <Link href="/join" style={{ color: c.brand }}>
        {t('auth.joinTitle')}
      </Link>
    </Screen>
  );
}
