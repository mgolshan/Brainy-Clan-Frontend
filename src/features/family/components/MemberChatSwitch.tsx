import { useTranslation } from 'react-i18next';

import type { Member } from '@/api/types';
import { useUpdateMember } from '@/features/family/hooks';
import { errorMessage } from '@/lib/errorMessage';
import { Card, SectionHeader, Text, ToggleRow } from '@/ui';

/**
 * Admin: family chat on/off for a member (`PATCH /family/members/{member}` `chat_enabled`).
 * Saved at once, like the notification switches; the server is the source of truth.
 */
export function MemberChatSwitch({ member }: { member: Member }) {
  const { t } = useTranslation();
  const update = useUpdateMember(member.id);
  const saved = member.chat_enabled !== false;
  // Show the pending value while the request runs.
  const value =
    update.isPending && update.variables?.chat_enabled !== undefined
      ? update.variables.chat_enabled
      : saved;

  return (
    <>
      <SectionHeader title={t('chat.title')} />
      <Card padding="sm">
        <ToggleRow
          icon="chatbubbles-outline"
          label={t('member.chatLabel')}
          description={value ? t('member.chatOnHint') : t('member.chatOffHint')}
          value={value}
          disabled={update.isPending}
          onValueChange={(on) => update.mutate({ chat_enabled: on })}
        />
        {update.isError ? (
          <Text variant="caption" tone="danger">
            {errorMessage(update.error, t)}
          </Text>
        ) : null}
      </Card>
    </>
  );
}
