import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TeacherGate } from '@/features/classroom/components';
import { consentErrorMessage } from '@/features/classroom/errors';
import { useAcceptClassroomConsent, useClassroom } from '@/features/classroom/hooks';
import { consentAccepted } from '@/features/classroom/model';
import { openLegalPage } from '@/features/legal/hooks';
import { formatDate } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { Appear, Button, Card, Checkbox, ErrorState, Loading, Text, useTheme } from '@/ui';

/**
 * Classroom consent statement (B12 step 3): the teacher confirms they may add the students
 * (`POST /family/classroom/consent` with the current `GET /legal` `classroom_consent.version`).
 * Every 409 `classroom_consent_required` opens this screen; after confirming, the teacher goes
 * back to where they were.
 */
export function ConsentScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { consent, legal } = useClassroom();
  const accept = useAcceptClassroomConsent();
  const [checked, setChecked] = useState(false);

  return (
    <TeacherGate title={t('classroom.consent.title')}>
      {(family, classroom) => {
        const done = consentAccepted(classroom, consent?.version);
        // The statement text shows even without `GET /legal`; only the version (needed to
        // confirm) and the full page link come from it.
        return (
          <>
            <Text tone="muted">{t('classroom.consent.intro')}</Text>
            <Card padding="lg" style={{ gap: theme.spacing.md }}>
              <Text variant="bodyLarge" weight="medium">
                {t('classroom.consent.statement')}
              </Text>
              {consent ? (
                <>
                  <Text variant="caption" tone="muted">
                    {t('classroom.consent.version', { version: consent.version })}
                  </Text>
                  <Button
                    title={t('classroom.consent.readFull')}
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    icon="document-text-outline"
                    accessibilityHint={t('legal.opensBrowser')}
                    onPress={() => openLegalPage(consent.text_url)}
                  />
                </>
              ) : null}
            </Card>

            {done ? (
              <Appear>
                <Card
                  variant="tinted"
                  tint={theme.colors.success}
                  style={{ gap: theme.spacing.sm }}>
                  <Text weight="bold">{t('classroom.consent.acceptedTitle')}</Text>
                  {classroom.consent_accepted_at ? (
                    <Text>
                      {t('classroom.consent.accepted', {
                        date: formatDate(
                          classroom.consent_accepted_at,
                          i18n.language,
                          family.timezone,
                        ),
                      })}
                    </Text>
                  ) : null}
                  <Button title={t('common.done')} onPress={() => goBack('/classroom')} />
                </Card>
              </Appear>
            ) : legal.isPending ? (
              <Loading fill={false} />
            ) : !consent ? (
              legal.isError ? (
                <ErrorState error={legal.error} onRetry={() => void legal.refetch()} />
              ) : (
                <Card variant="tinted" tint={theme.colors.warning}>
                  <Text>{t('classroom.consent.unavailable')}</Text>
                  <Button
                    title={t('common.retry')}
                    variant="ghost"
                    onPress={() => void legal.refetch()}
                  />
                </Card>
              )
            ) : (
              <Card padding="lg" style={{ gap: theme.spacing.sm }}>
                <Checkbox
                  label={t('classroom.consent.checkbox')}
                  checked={checked}
                  onChange={setChecked}
                />
                {accept.error ? (
                  <Text tone="danger" accessibilityLiveRegion="polite">
                    {consentErrorMessage(accept.error, t)}
                  </Text>
                ) : null}
                <Button
                  title={t('classroom.consent.accept')}
                  icon="checkmark-circle-outline"
                  size="lg"
                  disabled={!checked}
                  loading={accept.isPending}
                  onPress={() =>
                    accept.mutate(consent.version, {
                      onSuccess: () => goBack('/classroom'),
                      // A stale version: the statement changed, re-read it.
                      onError: () => void legal.refetch(),
                    })
                  }
                />
              </Card>
            )}
          </>
        );
      }}
    </TeacherGate>
  );
}
