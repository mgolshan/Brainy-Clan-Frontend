import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import type { ClassroomSummaryPeriod, ClassroomSummaryRow } from '@/api/types';
import { TeacherGate } from '@/features/classroom/components';
import {
  useClassroom,
  useClassroomSummary,
  useDownloadSummaryCsv,
} from '@/features/classroom/hooks';
import { canPrint, printHtml } from '@/features/classroom/print';
import { SUMMARY_COLUMNS, summaryHtml, type SummaryLabels } from '@/features/classroom/printDocs';
import { parsePeriod } from '@/features/classroom/summary';
import { errorMessage } from '@/lib/errorMessage';
import { formatDate, formatNumber } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  ListRow,
  Loading,
  Segmented,
  Text,
  useTheme,
} from '@/ui';

function SummaryRowView({
  row,
  avatar,
  labels,
}: {
  row: ClassroomSummaryRow;
  avatar: string | null | undefined;
  labels: Pick<SummaryLabels, 'lastPlayed' | 'number'>;
}) {
  const { t } = useTranslation();
  const accuracy =
    row.accuracy_percent === null || row.accuracy_percent === undefined
      ? t('classroom.summary.accuracyNone')
      : t('classroom.summary.accuracy', { value: labels.number(row.accuracy_percent) });
  const subtitle = t('classroom.summary.row', {
    count: row.games,
    points: labels.number(row.points),
    accuracy,
  });
  const details = `${t('classroom.summary.streak', {
    current: labels.number(row.current_streak),
    longest: labels.number(row.longest_streak),
  })} · ${labels.lastPlayed(row.last_played_at)}`;
  return (
    <ListRow
      title={row.nickname}
      subtitle={subtitle}
      leading={<Avatar avatar={avatar} size={44} />}
      trailing={
        row.role === 'admin' ? (
          <Badge label={t('classroom.summary.teacher')} tone="primary" />
        ) : undefined
      }
      below={
        <Text variant="caption" tone="muted">
          {details}
        </Text>
      }
      chevron={false}
    />
  );
}

/**
 * Class summary (`GET /family/classroom/summary?period=season|all`): one row per member, a
 * period toggle, "Download CSV" (`summary.csv`, fetched with the Bearer token and saved as a
 * file) and, on web, print / save as PDF.
 */
export function SummaryScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<ClassroomSummaryPeriod>(() => parsePeriod(params.period));
  const { family, classroom } = useClassroom();
  const summary = useClassroomSummary(period, !!classroom);
  const download = useDownloadSummaryCsv();
  const [printError, setPrintError] = useState(false);

  const lang = i18n.language;
  const tz = family.data?.family.timezone;
  const className = family.data?.family.name ?? '';
  const avatars = new Map((family.data?.members ?? []).map((m) => [m.id, m.avatar]));
  const labels: SummaryLabels = {
    title: t('classroom.summary.printTitle', { name: className }),
    subtitle: '',
    columns: Object.fromEntries(
      SUMMARY_COLUMNS.map((c) => [c, t(`classroom.summary.columns.${c}`)]),
    ) as SummaryLabels['columns'],
    lastPlayed: (iso) =>
      iso
        ? t('classroom.summary.lastPlayed', { date: formatDate(iso, lang, tz) })
        : t('classroom.summary.neverPlayed'),
    number: (value) => formatNumber(value, lang),
    lang,
  };

  return (
    <TeacherGate title={t('classroom.summary.title')}>
      {() => {
        const data = summary.data;
        const generated = data ? formatDate(data.generated_at, lang, tz) : '';
        const periodHint =
          period === 'all'
            ? t('classroom.summary.allHint')
            : data?.season_started_at
              ? t('classroom.summary.seasonSince', {
                  date: formatDate(data.season_started_at, lang, tz),
                })
              : t('classroom.summary.seasonNone');
        return (
          <>
            <Segmented
              accessibilityLabel={t('classroom.summary.period')}
              value={period}
              onChange={(next) => {
                setPeriod(next);
                download.reset();
                router.setParams({ period: next });
              }}
              options={[
                { value: 'season', label: t('classroom.summary.season') },
                { value: 'all', label: t('classroom.summary.all') },
              ]}
            />
            <Text variant="caption" tone="muted">
              {periodHint}
            </Text>

            {summary.isError ? (
              <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
            ) : !data ? (
              <Loading fill={false} />
            ) : data.rows.length === 0 ? (
              <Card>
                <EmptyState
                  title={t('classroom.summary.empty')}
                  body={t('classroom.summary.emptyBody')}
                  icon="people-outline"
                  emoji="📋"
                  actionLabel={t('classroom.tools.roster')}
                  onAction={() => router.push('/classroom/roster')}
                />
              </Card>
            ) : (
              <>
                <Card padding="sm">
                  {data.rows.map((row, i) => (
                    <View key={row.member_id}>
                      {i > 0 ? <Divider /> : null}
                      <SummaryRowView
                        row={row}
                        avatar={avatars.get(row.member_id)}
                        labels={labels}
                      />
                    </View>
                  ))}
                </Card>
                <Text variant="caption" tone="muted">
                  {t('classroom.summary.generated', { date: generated })}
                </Text>
              </>
            )}

            <Card padding="lg" style={{ gap: theme.spacing.sm }}>
              <Button
                title={t('classroom.summary.downloadCsv')}
                icon="download-outline"
                loading={download.isPending}
                onPress={() =>
                  download.mutate({ period, className, generatedAt: data?.generated_at })
                }
              />
              <Text variant="caption" tone="muted">
                {t('classroom.summary.csvHint')}
              </Text>
              {download.isSuccess ? (
                <Text tone="success" accessibilityLiveRegion="polite">
                  {download.data === 'downloaded'
                    ? t('classroom.summary.downloaded')
                    : t('classroom.summary.shared')}
                </Text>
              ) : null}
              {download.error ? (
                <Text tone="danger" accessibilityLiveRegion="polite">
                  {download.error instanceof ApiError
                    ? errorMessage(download.error, t)
                    : t('classroom.summary.saveFailed')}
                </Text>
              ) : null}
              {canPrint ? (
                <Button
                  title={t('classroom.summary.print')}
                  icon="print-outline"
                  variant="outline"
                  disabled={!data || data.rows.length === 0}
                  onPress={() => {
                    if (!data) return;
                    setPrintError(false);
                    const subtitle =
                      period === 'all'
                        ? t('classroom.summary.printSubtitleAll', { date: generated })
                        : t('classroom.summary.printSubtitleSeason', { date: generated });
                    printHtml(summaryHtml(data.rows, { ...labels, subtitle })).catch(() =>
                      setPrintError(true),
                    );
                  }}
                />
              ) : (
                <Text variant="caption" tone="muted">
                  {t('classroom.summary.noPrintHint')}
                </Text>
              )}
              {printError ? (
                <Text tone="danger" accessibilityLiveRegion="polite">
                  {t('classroom.summary.printFailed')}
                </Text>
              ) : null}
            </Card>
          </>
        );
      }}
    </TeacherGate>
  );
}
