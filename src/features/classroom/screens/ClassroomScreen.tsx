import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Stat, TeacherGate } from '@/features/classroom/components';
import { useClassroom } from '@/features/classroom/hooks';
import {
  consentAccepted,
  consentOutdated,
  nextSetupStep,
  setupSteps,
  type SetupStepKey,
} from '@/features/classroom/model';
import { formatDate, formatNumber } from '@/lib/format';
import {
  Card,
  Divider,
  Icon,
  IconBubble,
  ListRow,
  SectionHeader,
  Text,
  useTheme,
  type IconName,
} from '@/ui';

const STEP_ROUTES: Record<SetupStepKey, Href> = {
  consent: '/classroom/consent',
  students: '/classroom/roster',
  codes: '/classroom/codes',
};

/**
 * Teacher hub of a Classroom: setup steps (consent → students → code cards), the class
 * numbers, and the tools (roster, cards, summary, new year).
 */
export function ClassroomScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { consent } = useClassroom();
  const lang = i18n.language;

  return (
    <TeacherGate title={t('classroom.title')}>
      {(family, classroom) => {
        const steps = setupSteps(classroom, consent?.version);
        const next = nextSetupStep(steps);
        const accepted = consentAccepted(classroom, consent?.version);
        const outdated = consentOutdated(classroom, consent?.version);
        const tz = family.timezone;

        const tool = (
          title: string,
          hint: string,
          icon: IconName,
          href: Href,
          needsConsent = true,
        ) => {
          const locked = needsConsent && !accepted;
          return (
            <ListRow
              title={title}
              subtitle={locked ? t('classroom.tools.locked') : hint}
              leading={
                <Icon name={icon} color={locked ? theme.colors.textMuted : theme.colors.primary} />
              }
              onPress={locked ? undefined : () => router.push(href)}
              chevron={!locked}
            />
          );
        };

        return (
          <>
            {outdated ? (
              <Card variant="tinted" tint={theme.colors.warning} padding="md">
                <ListRow
                  title={t('classroom.consentOutdated')}
                  leading={<Icon name="document-text-outline" color={theme.colors.warning} />}
                  onPress={() => router.push('/classroom/consent')}
                />
              </Card>
            ) : null}

            <Card padding="lg">
              <View style={[styles.stats, { gap: theme.spacing.md }]}>
                <Stat
                  label={t('classroom.stats.students')}
                  value={formatNumber(classroom.students_count, lang)}
                />
                <Stat
                  label={t('classroom.stats.codes')}
                  value={
                    classroom.codes_issued_at
                      ? formatDate(classroom.codes_issued_at, lang, tz)
                      : t('classroom.stats.codesNever')
                  }
                />
                <Stat
                  label={t('classroom.stats.season')}
                  value={
                    classroom.season_started_at
                      ? formatDate(classroom.season_started_at, lang, tz)
                      : t('classroom.stats.seasonNone')
                  }
                />
              </View>
            </Card>

            <SectionHeader title={t('classroom.setupTitle')} />
            <Card padding="sm">
              {steps.map((step, i) => {
                const title = t(`classroom.steps.${step.key}`);
                const locked = !step.enabled;
                const subtitle = step.done
                  ? step.key === 'consent' && classroom.consent_accepted_at
                    ? t('classroom.consent.accepted', {
                        date: formatDate(classroom.consent_accepted_at, lang, tz),
                      })
                    : t('classroom.stepDone')
                  : locked && step.key !== 'consent'
                    ? t(`classroom.stepLocked.${step.key}`)
                    : undefined;
                return (
                  <View key={step.key}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow
                      title={title}
                      subtitle={subtitle}
                      leading={
                        <IconBubble
                          size={36}
                          color={step.done ? theme.colors.success : theme.colors.primary}>
                          {step.done ? (
                            <Icon name="checkmark" size={20} color={theme.colors.success} />
                          ) : (
                            <Text
                              weight="bold"
                              color={locked ? theme.colors.textMuted : theme.colors.primary}>
                              {i + 1}
                            </Text>
                          )}
                        </IconBubble>
                      }
                      trailing={
                        next === step.key && step.enabled ? (
                          <Icon name="arrow-forward" color={theme.colors.primary} />
                        ) : undefined
                      }
                      chevron={!locked && next !== step.key}
                      onPress={locked ? undefined : () => router.push(STEP_ROUTES[step.key])}
                    />
                  </View>
                );
              })}
            </Card>
            {next === null ? (
              <Text variant="caption" tone="muted">
                {t('classroom.setupDone')}
              </Text>
            ) : null}

            <SectionHeader title={t('classroom.toolsTitle')} />
            <Card padding="sm">
              {tool(
                t('classroom.tools.roster'),
                t('classroom.tools.rosterHint'),
                'people-outline',
                '/classroom/roster',
              )}
              <Divider />
              {tool(
                t('classroom.tools.codes'),
                t('classroom.tools.codesHint'),
                'key-outline',
                '/classroom/codes',
              )}
              <Divider />
              {tool(
                t('classroom.tools.summary'),
                t('classroom.tools.summaryHint'),
                'stats-chart-outline',
                '/classroom/summary',
              )}
              <Divider />
              {tool(
                t('classroom.tools.newYear'),
                t('classroom.tools.newYearHint'),
                'calendar-outline',
                '/classroom/new-year',
              )}
            </Card>
          </>
        );
      }}
    </TeacherGate>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap' },
});
