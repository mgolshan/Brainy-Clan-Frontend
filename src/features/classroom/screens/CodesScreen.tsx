import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';

import type { ClassroomCodeCard, Member } from '@/api/types';
import { TeacherGate } from '@/features/classroom/components';
import { codesErrorMessage } from '@/features/classroom/errors';
import { studentsOf } from '@/features/classroom/model';
import { useIssueClassroomCodes } from '@/features/classroom/hooks';
import { canPrint, printHtml } from '@/features/classroom/print';
import { codeCardsHtml, codeCardsText } from '@/features/classroom/printDocs';
import { useFamily } from '@/features/family/hooks';
import { groupCode } from '@/lib/code';
import { formatDate } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { clanSvg } from '@/ui/avatars';
import {
  Appear,
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  EmptyState,
  Text,
  ToggleRow,
  useTheme,
} from '@/ui';

function CodeCardView({ card, expires }: { card: ClassroomCodeCard; expires: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const grouped = groupCode(card.code);
  return (
    <Card
      padding="md"
      style={[styles.card, { gap: theme.spacing.xs }]}
      accessibilityLabel={t('classroom.codes.cardA11y', {
        name: card.nickname,
        code: card.code.split('').join(' '),
        date: expires,
      })}>
      <Avatar avatar={card.avatar} size={52} />
      <Text weight="bold" align="center">
        {card.nickname}
      </Text>
      <Text
        variant="title"
        align="center"
        selectable
        style={{ fontFamily: theme.fonts.display, letterSpacing: 3 }}>
        {grouped}
      </Text>
      <Text variant="caption" tone="muted" align="center">
        {t('classroom.codes.expires', { date: expires })}
      </Text>
      <Text variant="caption" align="center">
        {t('classroom.codes.howTo')}
      </Text>
    </Card>
  );
}

/**
 * Code cards (`POST /family/classroom/sign-in-codes`): pick all students or some, make the
 * codes (older ones stop working), then print them as cut-out cards (web: print / save as PDF)
 * or share / copy them as text. The codes live only in this screen's state: never cached,
 * persisted, logged or put in a URL. 10 issues per hour per family (429).
 */
export function CodesScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const family = useFamily();
  const issue = useIssueClassroomCodes();
  // `null` = all students (sends no ids, so students added meanwhile are included).
  const [picked, setPicked] = useState<Set<number> | null>(null);
  const [cards, setCards] = useState<ClassroomCodeCard[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [printError, setPrintError] = useState(false);

  const lang = i18n.language;
  const tz = family.data?.family.timezone;
  const expires = (iso: string) => formatDate(iso, lang, tz);
  const className = family.data?.family.name ?? '';
  const labels = {
    title: t('classroom.codes.printTitle', { name: className }),
    subtitle: t('classroom.codes.printSubtitle'),
    howTo: t('classroom.codes.howTo'),
    expires: (iso: string) => t('classroom.codes.expires', { date: expires(iso) }),
    lang,
  };

  const make = (students: Member[]) => {
    const ids = picked === null ? null : students.filter((s) => picked.has(s.id)).map((s) => s.id);
    setCopied(false);
    setPrintError(false);
    issue.mutate(ids, { onSuccess: (result) => setCards(result) });
  };

  const print = (list: ClassroomCodeCard[]) => {
    setPrintError(false);
    printHtml(codeCardsHtml(list, labels, clanSvg)).catch(() => setPrintError(true));
  };

  return (
    <TeacherGate title={t('classroom.codes.title')} width={cards ? 'wide' : undefined}>
      {() => {
        const students = studentsOf(family.data?.members ?? []);

        if (cards) {
          return (
            <>
              <Appear>
                <Card
                  variant="tinted"
                  tint={theme.colors.warning}
                  style={{ gap: theme.spacing.xs }}>
                  <Text weight="bold" accessibilityLiveRegion="polite">
                    {t('classroom.codes.ready', { count: cards.length })}
                  </Text>
                  <Text>{t('classroom.codes.showOnce')}</Text>
                </Card>
              </Appear>
              {canPrint ? (
                <Button
                  title={t('classroom.codes.print')}
                  icon="print-outline"
                  size="lg"
                  disabled={cards.length === 0}
                  onPress={() => print(cards)}
                />
              ) : (
                <Text variant="caption" tone="muted">
                  {t('classroom.codes.noPrintHint')}
                </Text>
              )}
              {printError ? (
                <Text tone="danger" accessibilityLiveRegion="polite">
                  {t('classroom.codes.printFailed')}
                </Text>
              ) : null}
              <View style={[styles.actions, { gap: theme.spacing.sm }]}>
                <Button
                  title={t('classroom.codes.share')}
                  icon="share-outline"
                  variant={canPrint ? 'outline' : 'primary'}
                  fullWidth={false}
                  onPress={() =>
                    void Share.share({ message: codeCardsText(cards, labels) }).catch(
                      () => undefined,
                    )
                  }
                />
                <Button
                  title={copied ? t('classroom.codes.copied') : t('classroom.codes.copy')}
                  icon={copied ? 'checkmark' : 'copy-outline'}
                  variant="outline"
                  fullWidth={false}
                  onPress={() =>
                    void Clipboard.setStringAsync(codeCardsText(cards, labels)).then(() =>
                      setCopied(true),
                    )
                  }
                />
              </View>
              <View style={[styles.grid, { gap: theme.spacing.sm }]}>
                {cards.map((card) => (
                  <CodeCardView
                    key={card.member_id}
                    card={card}
                    expires={expires(card.expires_at)}
                  />
                ))}
              </View>
              <Button
                title={t('classroom.codes.makeAgain')}
                variant="ghost"
                icon="refresh-outline"
                onPress={() => {
                  setCards(null);
                  issue.reset();
                }}
              />
              <Button
                title={t('common.done')}
                variant="ghost"
                onPress={() => goBack('/classroom')}
              />
            </>
          );
        }

        if (students.length === 0) {
          return (
            <Card>
              <EmptyState
                title={t('classroom.codes.noStudents')}
                body={t('classroom.codes.noStudentsBody')}
                icon="people-outline"
                emoji="🎒"
                actionLabel={t('classroom.codes.addStudents')}
                onAction={() => router.replace('/classroom/roster')}
              />
            </Card>
          );
        }

        const count = picked === null ? students.length : picked.size;
        const toggle = (id: number, on: boolean) => {
          const next = new Set(picked ?? students.map((s) => s.id));
          if (on) next.add(id);
          else next.delete(id);
          setPicked(next.size === students.length ? null : next);
        };

        return (
          <>
            <Text tone="muted">{t('classroom.codes.intro')}</Text>
            <Card variant="tinted" tint={theme.colors.warning}>
              <Text>{t('classroom.codes.replaceWarning')}</Text>
            </Card>
            <Card padding="md">
              <ToggleRow
                label={t('classroom.codes.selectAll')}
                description={t('classroom.codes.selectedCount', { count })}
                value={picked === null}
                onValueChange={(all) => setPicked(all ? null : new Set())}
                icon="people-outline"
              />
              {students.map((s) => (
                <View key={s.id}>
                  <Divider />
                  <Checkbox
                    label={s.nickname}
                    checked={picked === null || picked.has(s.id)}
                    onChange={(on) => toggle(s.id, on)}
                  />
                </View>
              ))}
            </Card>
            {issue.error ? (
              <Text tone="danger" accessibilityLiveRegion="polite">
                {codesErrorMessage(issue.error, t)}
              </Text>
            ) : null}
            <Button
              title={
                count > 0 ? t('classroom.codes.make', { count }) : t('classroom.codes.makeNone')
              }
              icon="key-outline"
              size="lg"
              disabled={count === 0}
              loading={issue.isPending}
              onPress={() => make(students)}
            />
          </>
        );
      }}
    </TeacherGate>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { alignItems: 'center', flexGrow: 1, flexBasis: 220, maxWidth: 320 },
});
