import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Member } from '@/api/types';
import { usePolicy } from '@/features/auth/hooks';
import { TeacherGate } from '@/features/classroom/components';
import { useAddRoster } from '@/features/classroom/hooks';
import {
  addPastedRows,
  checkRoster,
  newRow,
  parseRosterText,
  rosterBody,
  rosterServerErrors,
  seatsLeft,
  type RosterRow,
  type RowIssue,
} from '@/features/classroom/roster';
import { useFamily, useInvites } from '@/features/family/hooks';
import { goBack } from '@/lib/navigation';
import {
  Appear,
  Button,
  Card,
  PressableScale,
  SectionHeader,
  Text,
  TextField,
  Icon,
  useTheme,
} from '@/ui';

const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 4);

function RowEditor({
  row,
  index,
  classYear,
  issue,
  serverError,
  onChange,
  onRemove,
}: {
  row: RosterRow;
  index: number;
  classYear: string;
  issue: RowIssue | undefined;
  serverError: string | undefined;
  onChange: (row: RosterRow) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  // Hints show once something is typed (an empty new row isn't an error yet).
  const showIssue = issue && !(issue === 'empty' && row.nickname === '');
  const message = serverError ?? (showIssue ? t(`classroom.roster.issues.${issue}`) : undefined);
  const name = row.nickname.trim();
  return (
    <View style={[styles.row, { gap: theme.spacing.sm }]}>
      <View style={styles.nickname}>
        <TextField
          label={t('classroom.roster.rowLabel', { index: index + 1 })}
          value={row.nickname}
          onChangeText={(nickname) => onChange({ ...row, nickname })}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="off"
          maxLength={60}
          error={message}
        />
      </View>
      <View style={styles.year}>
        <TextField
          label={t('classroom.roster.rowYear')}
          value={row.birthYear}
          onChangeText={(v) => onChange({ ...row, birthYear: digits(v) })}
          keyboardType="number-pad"
          maxLength={4}
          placeholder={classYear || undefined}
          hint={classYear ? t('classroom.roster.rowYearHint', { year: classYear }) : undefined}
        />
      </View>
      <PressableScale
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={
          name
            ? t('classroom.roster.removeRow', { name })
            : t('classroom.roster.removeEmptyRow', { index: index + 1 })
        }
        style={[styles.remove, { width: theme.touchTarget, height: theme.touchTarget }]}>
        <Icon name="close-circle-outline" color={theme.colors.textMuted} />
      </PressableScale>
    </View>
  );
}

/**
 * Add a whole class at once (`POST /family/classroom/roster`): the class birth year, a paste
 * box (one nickname per line) and editable rows with an optional per-student year. Client
 * hints (1–35 students, 1–40 characters, unique) only guide; the server's 422s are shown on
 * their rows and a 403 `member_limit_reached` names the seats left.
 */
export function RosterScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const policy = usePolicy();
  const family = useFamily();
  const invites = useInvites();
  const add = useAddRoster();
  const [classYear, setClassYear] = useState('');
  const [paste, setPaste] = useState('');
  const [pasted, setPasted] = useState<number | null>(null);
  const [rows, setRows] = useState<RosterRow[]>(() => [newRow()]);
  const [submitted, setSubmitted] = useState<RosterRow[]>([]);
  const [added, setAdded] = useState<Member[] | null>(null);

  const members = family.data?.members;
  const pending = invites.data;
  const existing = useMemo(
    () => [...(members ?? []).map((m) => m.nickname), ...(pending ?? []).map((i) => i.nickname)],
    [members, pending],
  );
  const room = seatsLeft(policy?.limits.max_members, members?.length, pending?.length);
  // Blank rows (nothing typed) are ignored, so the starter row never blocks sending.
  const filled = rows.filter((r) => r.nickname.trim() !== '' || r.birthYear !== '');
  const check = checkRoster({ classYear, rows: filled, existing, room });
  const server = rosterServerErrors(add.error, submitted, t, room);

  const update = (key: string, next: RosterRow) =>
    setRows((prev) => prev.map((r) => (r.key === key ? next : r)));
  const remove = (key: string) =>
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      return next.length > 0 ? next : [newRow()];
    });

  const addPasted = () => {
    const names = parseRosterText(paste);
    if (names.length === 0) return;
    const next = addPastedRows(rows, names);
    // `addPastedRows` keeps the filled rows and appends the new names.
    setPasted(next.length - filled.length);
    setRows(next.length > 0 ? next : [newRow()]);
    setPaste('');
  };

  const submit = () => {
    setSubmitted(filled);
    add.mutate(rosterBody(classYear, filled), {
      onSuccess: (members) => {
        setAdded(members);
        setRows([newRow()]);
        setSubmitted([]);
        setPasted(null);
      },
    });
  };

  const classYearError =
    server.classYear ??
    (classYear.length === 4 && check.list.includes('classYear')
      ? t('classroom.roster.classYearInvalid')
      : undefined);

  return (
    <TeacherGate title={t('classroom.roster.title')}>
      {() =>
        added ? (
          <Appear>
            <Card variant="tinted" tint={theme.colors.success} style={{ gap: theme.spacing.sm }}>
              <Text variant="title" accessibilityLiveRegion="polite">
                {t('classroom.roster.added', { count: added.length })}
              </Text>
              <Text>{t('classroom.roster.addedBody')}</Text>
              <Button
                title={t('classroom.roster.toCodes')}
                icon="key-outline"
                onPress={() => router.replace('/classroom/codes')}
              />
              <Button
                title={t('classroom.roster.addMore')}
                variant="outline"
                onPress={() => {
                  setAdded(null);
                  add.reset();
                }}
              />
              <Button
                title={t('common.done')}
                variant="ghost"
                onPress={() => goBack('/classroom')}
              />
            </Card>
          </Appear>
        ) : (
          <>
            <Text tone="muted">{t('classroom.roster.intro')}</Text>
            <Card padding="lg" style={{ gap: theme.spacing.md }}>
              <TextField
                label={t('classroom.roster.classYear')}
                value={classYear}
                onChangeText={(v) => setClassYear(digits(v))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="2016"
                hint={t('classroom.roster.classYearHint')}
                error={classYearError}
              />
              <TextField
                label={t('classroom.roster.pasteLabel')}
                value={paste}
                onChangeText={setPaste}
                multiline
                minLines={5}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="off"
                placeholder={t('classroom.roster.pastePlaceholder')}
                hint={t('classroom.roster.pasteHint')}
              />
              <Button
                title={t('classroom.roster.pasteAdd')}
                icon="list-outline"
                variant="secondary"
                disabled={parseRosterText(paste).length === 0}
                onPress={addPasted}
              />
              {pasted !== null ? (
                <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
                  {t('classroom.roster.pastedCount', { count: Math.max(0, pasted) })}
                </Text>
              ) : null}
              <Text variant="caption" tone="muted">
                {t('classroom.roster.privacy')}
              </Text>
            </Card>

            <SectionHeader title={t('classroom.roster.listTitle')} />
            <Card padding="lg" style={{ gap: theme.spacing.md }}>
              {rows.map((row, i) => (
                <RowEditor
                  key={row.key}
                  row={row}
                  index={i}
                  classYear={classYear}
                  issue={check.rows[row.key]}
                  serverError={server.rows[row.key]}
                  onChange={(next) => update(row.key, next)}
                  onRemove={() => remove(row.key)}
                />
              ))}
              <Button
                title={t('classroom.roster.addRow')}
                icon="add"
                variant="ghost"
                onPress={() => setRows((prev) => [...prev, newRow()])}
              />
            </Card>

            <View style={{ gap: theme.spacing.xs }} accessibilityLiveRegion="polite">
              <Text weight="medium">
                {filled.length === 0
                  ? t('classroom.roster.empty')
                  : t('classroom.roster.count', { count: filled.length })}
              </Text>
              {room !== null ? (
                <Text variant="caption" tone="muted">
                  {t('classroom.roster.room', { count: room })}
                </Text>
              ) : null}
              {check.list.includes('tooMany') ? (
                <Text tone="danger">{t('classroom.roster.tooMany')}</Text>
              ) : null}
              {check.list.includes('noRoom') && room !== null ? (
                <Text tone="danger">{t('classroom.roster.noRoom', { count: room })}</Text>
              ) : null}
              {server.general ? <Text tone="danger">{server.general}</Text> : null}
            </View>

            <Button
              title={
                filled.length > 0
                  ? t('classroom.roster.submit', { count: filled.length })
                  : t('classroom.roster.submitNone')
              }
              icon="person-add-outline"
              size="lg"
              disabled={!check.ok}
              loading={add.isPending}
              onPress={submit}
            />
          </>
        )
      }
    </TeacherGate>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  nickname: { flexGrow: 3, flexBasis: 180 },
  year: { flexGrow: 1, flexBasis: 110, maxWidth: 160 },
  remove: { alignItems: 'center', justifyContent: 'center', marginTop: 22 },
});
