import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { NewYearClear } from '@/api/types';
import { OutcomeLine, TeacherGate } from '@/features/classroom/components';
import { newYearErrorMessage } from '@/features/classroom/errors';
import { useDownloadSummaryCsv, useStartNewYear } from '@/features/classroom/hooks';
import {
  anyClear,
  CLEAR_KEYS,
  confirmNameMatches,
  newYearBody,
  newYearSummary,
  nextNewYearStep,
  NO_CLEAR,
  previousNewYearStep,
  type ClearKey,
  type NewYearStep,
} from '@/features/classroom/newYear';
import { errorMessage } from '@/lib/errorMessage';
import { goBack } from '@/lib/navigation';
import {
  Appear,
  Button,
  Card,
  Divider,
  Text,
  TextField,
  ToggleRow,
  useTheme,
  type IconName,
} from '@/ui';

const FLAG_ICONS: Record<ClearKey, IconName> = {
  students: 'people-outline',
  points: 'trophy-outline',
  chat: 'chatbubbles-outline',
  goals: 'flag-outline',
};

const STEP_INDEX: Record<NewYearStep, number> = { choose: 1, review: 2, confirm: 3 };

/**
 * "Archive & start a new year" (`POST /family/classroom/new-year`), a careful three-step
 * wizard: choose what to clear → review exactly what will happen (and download the summary
 * first) → type the class name to confirm. Clearing points starts a new season; the points
 * history is never erased.
 */
export function NewYearScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const start = useStartNewYear();
  const download = useDownloadSummaryCsv();
  const [step, setStep] = useState<NewYearStep>('choose');
  const [clear, setClear] = useState<NewYearClear>(NO_CLEAR);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);

  return (
    <TeacherGate title={t('classroom.newYear.title')}>
      {(family, classroom) => {
        if (done) {
          return (
            <Appear>
              <Card variant="tinted" tint={theme.colors.success} style={{ gap: theme.spacing.sm }}>
                <Text variant="title" accessibilityLiveRegion="polite">
                  {t('classroom.newYear.doneTitle')}
                </Text>
                <Text>{t('classroom.newYear.doneBody')}</Text>
                <Button
                  title={t('classroom.newYear.addStudents')}
                  icon="person-add-outline"
                  onPress={() => router.replace('/classroom/roster')}
                />
                <Button
                  title={t('classroom.newYear.backToClass')}
                  variant="ghost"
                  onPress={() => goBack('/classroom')}
                />
              </Card>
            </Appear>
          );
        }

        const students = classroom.students_count;
        const lines = newYearSummary(clear, students);
        const back = previousNewYearStep(step);
        const stepLine = (
          <Text variant="label" tone="muted">
            {t('classroom.newYear.stepOf', { index: STEP_INDEX[step] })}
          </Text>
        );

        if (step === 'choose') {
          return (
            <>
              {stepLine}
              <Text>{t('classroom.newYear.intro')}</Text>
              <Card padding="md">
                {CLEAR_KEYS.map((key, i) => (
                  <View key={key}>
                    {i > 0 ? <Divider /> : null}
                    <ToggleRow
                      label={t(`classroom.newYear.flags.${key}`)}
                      description={
                        key === 'students'
                          ? t('classroom.newYear.flags.studentsBody', { count: students })
                          : t(`classroom.newYear.flags.${key}Body`)
                      }
                      value={clear[key]}
                      onValueChange={(on) => setClear((prev) => ({ ...prev, [key]: on }))}
                      icon={FLAG_ICONS[key]}
                    />
                  </View>
                ))}
              </Card>
              {!anyClear(clear) ? (
                <Text variant="caption" tone="muted">
                  {t('classroom.newYear.pickOne')}
                </Text>
              ) : null}
              <Button
                title={t('classroom.newYear.next')}
                iconRight="arrow-forward"
                size="lg"
                disabled={!anyClear(clear)}
                onPress={() => setStep(nextNewYearStep(step))}
              />
            </>
          );
        }

        const cleared = lines.filter((l) => l.tone === 'clear');
        const kept = lines.filter((l) => l.tone === 'keep');
        const review = (
          <Card padding="lg" style={{ gap: theme.spacing.sm }}>
            <Text variant="title">{t('classroom.newYear.reviewTitle')}</Text>
            <Text weight="bold">{t('classroom.newYear.willClear')}</Text>
            {cleared.map((l) => (
              <OutcomeLine
                key={l.key}
                tone="clear"
                text={t(`classroom.newYear.summary.${l.key}`, { count: l.count ?? 0 })}
              />
            ))}
            <Text weight="bold">{t('classroom.newYear.willKeep')}</Text>
            {kept.map((l) => (
              <OutcomeLine
                key={l.key}
                tone="keep"
                text={t(`classroom.newYear.summary.${l.key}`, { count: l.count ?? 0 })}
              />
            ))}
            <Text weight="bold" tone="danger">
              {t('classroom.newYear.cannotUndo')}
            </Text>
          </Card>
        );

        if (step === 'review') {
          return (
            <>
              {stepLine}
              {review}
              <Card variant="tinted" tint={theme.colors.warning} style={{ gap: theme.spacing.sm }}>
                <Text weight="bold">{t('classroom.newYear.exportTitle')}</Text>
                <Text>{t('classroom.newYear.exportBody')}</Text>
                <Button
                  title={t('classroom.summary.downloadCsv')}
                  icon="download-outline"
                  variant="outline"
                  loading={download.isPending}
                  onPress={() => download.mutate({ period: 'all', className: family.name })}
                />
                {download.isSuccess ? (
                  <Text tone="success" accessibilityLiveRegion="polite">
                    {download.data === 'downloaded'
                      ? t('classroom.summary.downloaded')
                      : t('classroom.summary.shared')}
                  </Text>
                ) : null}
                {download.error ? (
                  <Text tone="danger" accessibilityLiveRegion="polite">
                    {errorMessage(download.error, t)}
                  </Text>
                ) : null}
                <Button
                  title={t('classroom.newYear.openSummary')}
                  variant="ghost"
                  icon="stats-chart-outline"
                  onPress={() => router.push('/classroom/summary')}
                />
              </Card>
              <Button
                title={t('classroom.newYear.next')}
                iconRight="arrow-forward"
                size="lg"
                onPress={() => setStep(nextNewYearStep(step))}
              />
              {back ? (
                <Button
                  title={t('classroom.newYear.back')}
                  variant="ghost"
                  onPress={() => setStep(back)}
                />
              ) : null}
            </>
          );
        }

        const matches = confirmNameMatches(typed, family.name);
        return (
          <>
            {stepLine}
            {review}
            <Card padding="lg" style={{ gap: theme.spacing.sm }}>
              <Text variant="title">{t('classroom.newYear.confirmTitle')}</Text>
              <TextField
                label={t('classroom.newYear.typeName', { name: family.name })}
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                placeholder={family.name}
              />
              {start.error ? (
                <Text tone="danger" accessibilityLiveRegion="polite">
                  {newYearErrorMessage(start.error, t)}
                </Text>
              ) : null}
              <Button
                title={t('classroom.newYear.submit')}
                variant="danger"
                icon="refresh-circle-outline"
                disabled={!matches || !anyClear(clear)}
                loading={start.isPending}
                onPress={() =>
                  start.mutate(newYearBody(typed, clear), { onSuccess: () => setDone(true) })
                }
              />
            </Card>
            {back ? (
              <Button
                title={t('classroom.newYear.back')}
                variant="ghost"
                disabled={start.isPending}
                onPress={() => {
                  start.reset();
                  setStep(back);
                }}
              />
            ) : null}
          </>
        );
      }}
    </TeacherGate>
  );
}
