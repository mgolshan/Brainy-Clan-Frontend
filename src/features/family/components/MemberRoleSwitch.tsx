import { useTranslation } from 'react-i18next';

import type { Member } from '@/api/types';
import { canBeAdmin, roleErrorMessage } from '@/features/family/adults';
import { useUpdateMember } from '@/features/family/hooks';
import { Card, SectionHeader, Text, ToggleRow } from '@/ui';

/**
 * Admin: make a member admin or not (`PATCH /family/members/{member}` `role`), saved at once like
 * the chat switch. Only adults may become admins (a child or teen gets 422 on `role`): for them
 * the switch is disabled with a hint, but an existing child admin can still be turned back into
 * a member. The owner is always admin, and an admin doesn't demote themself here.
 */
export function MemberRoleSwitch({
  member,
  isOwner,
  isSelf,
}: {
  member: Member;
  isOwner: boolean;
  isSelf: boolean;
}) {
  const { t } = useTranslation();
  const update = useUpdateMember(member.id);
  const saved = member.role === 'admin';
  // Show the pending value while the request runs.
  const value =
    update.isPending && update.variables?.role !== undefined
      ? update.variables.role === 'admin'
      : saved;

  const adultsOnly = !saved && !canBeAdmin(member);
  let hint = value ? t('member.adminOnHint') : t('member.adminOffHint');
  if (isOwner) hint = t('member.adminOwnerHint');
  else if (isSelf) hint = t('member.adminSelfHint');
  else if (adultsOnly) hint = t('member.adminAdultsOnly');

  return (
    <>
      <SectionHeader title={t('member.roleTitle')} />
      <Card padding="sm">
        <ToggleRow
          icon="shield-checkmark-outline"
          label={t('member.adminLabel')}
          description={hint}
          value={value}
          disabled={update.isPending || isOwner || isSelf || adultsOnly}
          onValueChange={(on) => update.mutate({ role: on ? 'admin' : 'member' })}
        />
        {update.isError ? (
          <Text variant="caption" tone="danger">
            {roleErrorMessage(update.error, t)}
          </Text>
        ) : null}
      </Card>
    </>
  );
}
