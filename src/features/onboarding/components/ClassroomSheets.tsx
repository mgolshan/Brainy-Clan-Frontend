import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { Family } from '@/api/types';
import { normalizeChatMode } from '@/features/chat/modes';
import { ChatSafetySettings } from '@/features/family/components/ChatSafetySettings';
import { useUpdateFamily } from '@/features/family/hooks';
import { FeatureRow, FtueSheet } from '@/features/onboarding/components/FtueSheet';
import { Button, Text } from '@/ui';

/**
 * Teacher FTUE "Choose a chat mode": the family's chat safety settings (filter + mode cards,
 * saved at once), with "Announcements only" suggested. "Done" marks the step.
 */
export function ChatModeSheet({ family, onDone }: { family: Family; onDone: () => void }) {
  const { t } = useTranslation();
  const update = useUpdateFamily();
  const suggested = normalizeChatMode(family.chat_mode) === 'announcements';
  return (
    <FtueSheet
      title={t('onboarding.chatMode.title')}
      onClose={onDone}
      footer={
        <>
          {suggested ? null : (
            <Button
              title={t('onboarding.chatMode.useSuggested')}
              icon="megaphone-outline"
              variant="outline"
              loading={update.isPending}
              onPress={() => update.mutate({ chat_mode: 'announcements' })}
            />
          )}
          <Button title={t('onboarding.chatMode.done')} icon="checkmark" onPress={onDone} />
        </>
      }>
      <Text tone="muted">{t('onboarding.chatMode.body')}</Text>
      <ChatSafetySettings family={family} />
    </FtueSheet>
  );
}

/**
 * Teacher FTUE "How the end of the year works": export the class summary first, then "Archive &
 * start new year" (it can't be undone). Closing it marks the step.
 */
export function EndOfYearSheet({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  return (
    <FtueSheet
      title={t('onboarding.endOfYear.title')}
      onClose={onDone}
      footer={
        <>
          <Button
            title={t('onboarding.endOfYear.open')}
            icon="school-outline"
            variant="outline"
            onPress={() => {
              onDone();
              router.push('/classroom');
            }}
          />
          <Button title={t('onboarding.endOfYear.gotIt')} icon="checkmark" onPress={onDone} />
        </>
      }>
      <Text tone="muted">{t('onboarding.endOfYear.intro')}</Text>
      <FeatureRow
        emoji="📊"
        icon="document-text-outline"
        title={t('onboarding.endOfYear.exportTitle')}
        body={t('onboarding.endOfYear.exportBody')}
      />
      <FeatureRow
        emoji="🗂️"
        icon="archive-outline"
        title={t('onboarding.endOfYear.archiveTitle')}
        body={t('onboarding.endOfYear.archiveBody')}
      />
      <FeatureRow
        emoji="🌱"
        icon="leaf-outline"
        title={t('onboarding.endOfYear.keepTitle')}
        body={t('onboarding.endOfYear.keepBody')}
      />
    </FtueSheet>
  );
}
