import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import { Loading, useTheme } from '@/ui';

/**
 * Web redirect target of the Google/Facebook popup (`<origin>/oauth-callback`). The root layout
 * already handed the result to the opener (`maybeCompleteAuthSession`) and the popup closes; if
 * the page was opened directly, go home.
 */
export function OAuthCallbackScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isPopup = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.opener;
  if (!isPopup) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Loading label={t('common.loading')} />
    </View>
  );
}
