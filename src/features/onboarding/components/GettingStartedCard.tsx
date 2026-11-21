import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { OnboardingStepKey } from '@/api/types';
import { useMe } from '@/features/auth/hooks';
import { ChatModeSheet, EndOfYearSheet } from '@/features/onboarding/components/ClassroomSheets';
import { WelcomeSheet } from '@/features/onboarding/components/WelcomeSheet';
import {
  checklistVisible,
  shouldShowWelcome,
  stepAction,
  stepLabelId,
  welcomeMarks,
  welcomeStep,
  type ChecklistItem,
  type CopyVariant,
  type FlowKey,
  type SheetKind,
} from '@/features/onboarding/flows';
import {
  runId,
  useDismissOnboarding,
  useFtue,
  useFtueRun,
  useMarkPending,
} from '@/features/onboarding/hooks';
import {
  Appear,
  Badge,
  Button,
  Card,
  Celebration,
  Confetti,
  Divider,
  Icon,
  ListRow,
  ProgressBar,
  Text,
  useTheme,
} from '@/ui';

function StepRow({
  item,
  flow,
  variant,
  highlighted,
  onOpen,
}: {
  item: ChecklistItem;
  flow: FlowKey;
  variant: CopyVariant;
  highlighted: boolean;
  onOpen: (key: OnboardingStepKey) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const id = stepLabelId(item.key, flow, variant);
  const title = t(`onboarding.steps.${id}`);
  const tappable = !item.done && !item.locked && stepAction(item.key, flow).kind !== 'none';
  const subtitle = item.locked
    ? item.key === 'roster'
      ? t('classroom.stepLocked.students')
      : t('classroom.stepLocked.codes')
    : highlighted && !item.done && variant !== 'kid'
      ? t(`onboarding.hints.${id}`)
      : undefined;
  const state = item.done
    ? t('onboarding.stateDone')
    : item.locked
      ? t('onboarding.stateLocked')
      : t('onboarding.stateTodo');
  return (
    <View accessibilityLabel={`${title}. ${state}`} accessible={!tappable}>
      <ListRow
        title={title}
        subtitle={subtitle}
        leading={
          <Icon
            name={
              item.done
                ? 'checkmark-circle'
                : item.locked
                  ? 'lock-closed-outline'
                  : 'ellipse-outline'
            }
            color={
              item.done
                ? theme.colors.success
                : highlighted
                  ? theme.colors.primary
                  : theme.colors.textSubtle
            }
          />
        }
        trailing={
          !item.required && !item.done ? (
            <Badge label={t('onboarding.optional')} tone="neutral" />
          ) : undefined
        }
        onPress={tappable ? () => onOpen(item.key) : undefined}
        accessibilityHint={tappable ? state : undefined}
      />
    </View>
  );
}

/**
 * Home "Getting started" card (FTUE, `docs/FTUE-CONTRACT.md`): "n of m" with a bar, the next
 * step (each step opens the right screen or sheet), the full list on demand and "Hide". When every
 * required step is done it celebrates (nothing moves with reduced motion); "Close" dismisses it.
 * Also opens the flow's welcome sheet the first time. Hidden on older servers (404) and while
 * loading — it never blocks Home.
 */
export function GettingStartedCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const ftue = useFtue();
  const { onboarding, flow, variant, userId } = ftue;
  const list = ftue.checklist;
  const markPending = useMarkPending();
  const dismiss = useDismissOnboarding();
  const focused = useIsFocused();
  const shown = useFtueRun((s) => s.shown);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [expanded, setExpanded] = useState(false);
  const refetch = ftue.query.refetch;
  // Older server (404 → null): nothing to re-read.
  const live = !!onboarding;

  // Derived steps (first game, first goal, roster…) change on other screens: re-read on focus.
  useFocusEffect(
    useCallback(() => {
      if (live) void refetch();
    }, [live, refetch]),
  );

  if (!checklistVisible(onboarding, flow) || !list || !flow) return null;

  const welcomeKey = welcomeStep(flow);
  const autoWelcome =
    focused &&
    shouldShowWelcome(onboarding, flow) &&
    welcomeKey !== null &&
    !shown.includes(runId(userId, welcomeKey));
  const openSheet: SheetKind | null = sheet ?? (autoWelcome ? 'welcome' : null);

  const open = (key: OnboardingStepKey) => {
    const action = stepAction(key, flow);
    if (action.kind === 'sheet') setSheet(action.sheet);
    else if (action.kind === 'route') {
      if (action.mark) markPending([key]);
      router.push(action.href);
    }
  };
  const closeSheet = (kind: SheetKind) => {
    setSheet(null);
    if (kind === 'welcome') markPending(welcomeMarks(flow, me?.policy.tier));
    else if (kind === 'chatMode') markPending(['chat_mode']);
    else markPending(['end_of_year']);
  };

  const classroom = flow === 'teacher' || flow === 'student';
  const sheets = (
    <>
      {openSheet === 'welcome' && flow !== 'student' ? (
        <WelcomeSheet
          flow={flow}
          variant={variant}
          familyName={me?.family?.name ?? ''}
          onClose={() => closeSheet('welcome')}
        />
      ) : null}
      {openSheet === 'chatMode' && me?.family ? (
        <ChatModeSheet family={me.family} onDone={() => closeSheet('chatMode')} />
      ) : null}
      {openSheet === 'endOfYear' ? <EndOfYearSheet onDone={() => closeSheet('endOfYear')} /> : null}
    </>
  );

  if (list.complete) {
    return (
      <Appear>
        <Card variant="tinted" tint={theme.colors.success} padding="lg" style={styles.clip}>
          <View style={[styles.center, { gap: theme.spacing.sm }]} accessibilityLiveRegion="polite">
            <Celebration size={96} avatar={me?.member?.avatar ?? me?.user.avatar} />
            <Text variant="title" accessibilityRole="header" style={styles.textCenter}>
              {t('onboarding.completeTitle')}
            </Text>
            <Text tone="muted" style={styles.textCenter}>
              {classroom ? t('onboarding.completeBodyClassroom') : t('onboarding.completeBody')}
            </Text>
            <Button
              title={t('onboarding.completeClose')}
              icon="checkmark"
              fullWidth={false}
              onPress={() => dismiss.mutate()}
            />
          </View>
          {/* The world's confetti inside the card (nothing with reduced motion / calm worlds). */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
            <Confetti count={24} />
          </View>
        </Card>
        {sheets}
      </Appear>
    );
  }

  const nextItem = list.items.find((i) => i.key === list.next);
  const visible = expanded ? list.items : nextItem ? [nextItem] : [];
  const title =
    classroom && flow === 'teacher'
      ? t('onboarding.cardTitleClassroom')
      : t('onboarding.cardTitle');
  const progressText = t('onboarding.progress', { count: list.done, total: list.total });

  return (
    <>
      <Card padding="md" style={{ gap: theme.spacing.sm }}>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <Text variant="title" accessibilityRole="header" style={styles.flex}>
            {title}
          </Text>
          <Button
            title={t('onboarding.hide')}
            accessibilityLabel={t('onboarding.hideA11y')}
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => dismiss.mutate()}
          />
        </View>
        <ProgressBar
          value={list.total ? list.done / list.total : 0}
          label={progressText}
          accessibilityLabel={progressText}
        />
        {visible.map((item, i) => (
          <View key={item.key}>
            {i > 0 ? <Divider /> : null}
            <StepRow
              item={item}
              flow={flow}
              variant={variant}
              highlighted={item.key === list.next}
              onOpen={open}
            />
          </View>
        ))}
        <Button
          title={
            expanded
              ? t('onboarding.showLess')
              : t('onboarding.showAll', { count: list.items.length })
          }
          icon={expanded ? 'chevron-up' : 'list-outline'}
          variant="ghost"
          size="sm"
          onPress={() => setExpanded((v) => !v)}
        />
      </Card>
      {sheets}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  clip: { overflow: 'hidden' },
});
