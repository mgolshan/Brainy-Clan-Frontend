import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useFtue, useFtueRun, useRestoreOnboarding } from '@/features/onboarding/hooks';
import { Divider, Icon, ListRow, useTheme } from '@/ui';

/**
 * Profile row "Show the getting started checklist": only while FTUE is available (server has it,
 * the member has a flow) and the checklist was hidden. Restores it optimistically and goes Home,
 * where the card is. Hidden for this run when the server has no restore route (404).
 */
export function RestoreChecklistRow() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { onboarding, flow } = useFtue();
  const restoreMissing = useFtueRun((s) => s.restoreMissing);
  const restore = useRestoreOnboarding();
  if (!onboarding || !flow || !onboarding.dismissed_at || restoreMissing) return null;
  return (
    <>
      <ListRow
        title={t(flow === 'teacher' ? 'onboarding.restoreClassroom' : 'onboarding.restore')}
        subtitle={t('onboarding.restoreHint')}
        leading={<Icon name="list-outline" color={theme.colors.primary} />}
        onPress={() => {
          restore.mutate();
          router.navigate('/');
        }}
      />
      <Divider />
    </>
  );
}
