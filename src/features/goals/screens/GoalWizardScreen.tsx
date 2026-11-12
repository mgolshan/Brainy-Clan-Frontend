import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import type { Category, GoalPlan } from '@/api/types';
import { usePolicy } from '@/features/auth/hooks';
import { useFamily } from '@/features/family/hooks';
import { RewardBanner } from '@/features/goals/components/RewardBanner';
import {
  NEW_GOAL_FORM,
  buildCreateBody,
  buildUpdateBody,
  categoriesValid,
  formFromGoal,
  parseTarget,
  targetStepValid,
  teamMemberIds,
  type GoalFormState,
} from '@/features/goals/goalForm';
import { useCreateGoal, useGoal, useGoals, useUpdateGoal } from '@/features/goals/hooks';
import { GoalLimitHint, isGoalLimitReached } from '@/features/goals/screens/GoalsScreen';
import { startDateOptions } from '@/features/goals/time';
import { useCategories } from '@/features/play/api';
import { categoryColor, categoryVisual } from '@/features/play/categoryVisuals';
import { formatDate } from '@/lib/format';
import { formErrors } from '@/lib/formErrors';
import { goBack } from '@/lib/navigation';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  ErrorState,
  Icon,
  IconBubble,
  type IconName,
  ListRow,
  Loading,
  PressableScale,
  Screen,
  Text,
  TextField,
  ToggleRow,
  useTheme,
} from '@/ui';

const STEPS = ['name', 'categories', 'mode', 'period', 'target', 'reward', 'review'] as const;
type Step = (typeof STEPS)[number];

const NAME_IDEAS = ['goals.ideas.name1', 'goals.ideas.name2', 'goals.ideas.name3'] as const;
const REWARD_IDEAS = [
  'goals.ideas.reward1',
  'goals.ideas.reward2',
  'goals.ideas.reward3',
  'goals.ideas.reward4',
] as const;
const TARGET_PRESETS = [20, 50, 100, 200, 500];

function StepDots({ index }: { index: number }) {
  const theme = useTheme();
  return (
    <View style={styles.dots} accessibilityElementsHidden>
      {STEPS.map((s, i) => (
        <View
          key={s}
          style={{
            height: 6,
            flex: 1,
            borderRadius: 3,
            backgroundColor: i <= index ? theme.colors.primary : theme.colors.surfaceAlt,
          }}
        />
      ))}
    </View>
  );
}

/** A big tappable option card (mode, period). */
function OptionCard({
  selected,
  onPress,
  emoji,
  icon,
  title,
  body,
}: {
  selected: boolean;
  onPress: () => void;
  emoji: string;
  icon: IconName;
  title: string;
  body: string;
}) {
  const theme = useTheme();
  return (
    <Card
      onPress={onPress}
      selected={selected}
      padding="lg"
      accessibilityLabel={`${title}. ${body}`}>
      <View style={styles.optionRow}>
        <IconBubble size={theme.touchTarget}>
          {theme.emojiIcons ? (
            <RNText style={styles.optionEmoji}>{emoji}</RNText>
          ) : (
            <Icon name={icon} color={theme.colors.primary} />
          )}
        </IconBubble>
        <View style={styles.flex}>
          <Text variant="title">{title}</Text>
          <Text tone="muted">{body}</Text>
        </View>
        {selected ? <Icon name="checkmark-circle" color={theme.colors.primary} /> : null}
      </View>
    </Card>
  );
}

/** Tree picker: select categories at any level; drill into sub-scopes; locked ones disabled. */
function CategoryPicker({
  tree,
  selected,
  onToggle,
}: {
  tree: Category[];
  selected: Set<number>;
  onToggle: (id: number) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [path, setPath] = useState<Category[]>([]);
  const level = path.length ? path[path.length - 1].children : tree;
  const ancestorSelected = path.some((c) => selected.has(c.id));

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {path.length > 0 ? (
        <Button
          title={t('goals.wizard.upTo', {
            name: path.length > 1 ? path[path.length - 2].name : t('goals.wizard.allCategories'),
          })}
          icon="chevron-back"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => setPath((p) => p.slice(0, -1))}
        />
      ) : null}
      {path.length > 0 ? <Text variant="title">{path[path.length - 1].name}</Text> : null}
      <Card padding="sm">
        {level.map((cat, i) => {
          const locked = cat.is_locked;
          const included = ancestorSelected;
          const checked = included || selected.has(cat.id);
          const color = categoryColor(theme, cat, i);
          const visual = categoryVisual(cat.icon);
          return (
            <View key={cat.id}>
              {i > 0 ? <Divider /> : null}
              <View style={[styles.catRow, { minHeight: theme.touchTarget + 8 }]}>
                <PressableScale
                  onPress={() => onToggle(cat.id)}
                  disabled={locked || included}
                  haptic
                  accessibilityRole="checkbox"
                  accessibilityLabel={locked ? `${cat.name}, ${t('play.locked')}` : cat.name}
                  accessibilityState={{ checked, disabled: locked || included }}
                  style={[styles.catMain, { opacity: locked ? 0.5 : 1, gap: theme.spacing.sm }]}>
                  <IconBubble color={color} size={40}>
                    {theme.emojiIcons ? (
                      <RNText style={styles.catEmoji}>{locked ? '🔒' : visual.emoji}</RNText>
                    ) : (
                      <Icon
                        name={locked ? 'lock-closed-outline' : visual.icon}
                        color={color}
                        size={20}
                      />
                    )}
                  </IconBubble>
                  <View style={styles.flex}>
                    <Text weight="bold">{cat.name}</Text>
                    {locked ? (
                      <Text variant="caption" tone="muted">
                        {t('play.lockedHint')}
                      </Text>
                    ) : included ? (
                      <Text variant="caption" tone="muted">
                        {t('goals.wizard.includedByParent')}
                      </Text>
                    ) : null}
                  </View>
                  <Icon
                    name={checked ? 'checkbox' : 'square-outline'}
                    color={checked ? theme.colors.primary : theme.colors.textSubtle}
                  />
                </PressableScale>
                {cat.children.length > 0 && !locked ? (
                  <PressableScale
                    onPress={() => setPath((p) => [...p, cat])}
                    accessibilityRole="button"
                    accessibilityLabel={t('goals.wizard.openTopics', { name: cat.name })}
                    style={[styles.drill, { width: theme.touchTarget, height: theme.touchTarget }]}>
                    <Icon name="chevron-forward" color={theme.colors.textMuted} />
                  </PressableScale>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function findName(tree: Category[], id: number): string | undefined {
  for (const c of tree) {
    if (c.id === id) return c.name;
    const n = findName(c.children, id);
    if (n) return n;
  }
  return undefined;
}

/** Own-target field for a member in a race (empty = the plan target). */
function OwnTargetField({
  name,
  value,
  placeholder,
  onChange,
}: {
  name: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <TextField
      label={t('goals.wizard.ownTarget', { name })}
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^0-9]/g, '').slice(0, 5))}
      keyboardType="number-pad"
      placeholder={placeholder}
      hint={t('goals.wizard.ownTargetHint')}
    />
  );
}

interface GoalWizardProps {
  /** Starting form (a new goal, or the plan being edited). */
  initial: GoalFormState;
  /** Set when editing: no start date step, "Save changes", `PATCH`. */
  editing?: GoalPlan;
}

/**
 * Admin: create (`POST /goals`) or edit (`PATCH /goals/{plan}`) a goal plan step by step. The
 * categories step offers "All categories" first; "Who plays" defaults to the whole family
 * (newcomers join automatically) with an option to pick members.
 */
function GoalWizard({ initial, editing }: GoalWizardProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const policy = usePolicy();
  const goals = useGoals();
  const categories = useCategories();
  const family = useFamily();
  const create = useCreateGoal();
  const update = useUpdateGoal(editing?.id ?? 0);
  const save = editing ? update : create;
  const timeZone = family.data?.family.timezone;
  const dates = useMemo(() => startDateOptions(new Date(), timeZone), [timeZone]);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GoalFormState>(initial);
  const [startChoice, setStartChoice] = useState<keyof typeof dates>('today');
  const startsOn = dates[startChoice];
  const errors = formErrors(save.error, t, ['name', 'target_points', 'category_ids', 'starts_on']);
  const set = <K extends keyof GoalFormState>(key: K, value: GoalFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const current: Step = STEPS[step];
  const members = family.data?.members ?? [];
  const memberIds = members.map((m) => m.id);
  const team = new Set(teamMemberIds(form, memberIds));
  const teamMembers = members.filter((m) => team.has(m.id));
  const targetNum = parseTarget(form.target) ?? 0;
  const selected = new Set(form.categoryIds);

  const canNext =
    (current === 'name' && form.name.trim().length > 0) ||
    (current === 'categories' && categoriesValid(form)) ||
    current === 'mode' ||
    current === 'period' ||
    (current === 'target' && targetStepValid(form, memberIds)) ||
    current === 'reward' ||
    current === 'review';

  const toggleCategory = (id: number) =>
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  const toggleMember = (id: number, on: boolean) =>
    setForm((prev) => ({
      ...prev,
      excluded: on ? prev.excluded.filter((m) => m !== id) : [...prev.excluded, id],
    }));
  const setOverride = (id: number, value: string) =>
    setForm((prev) => ({ ...prev, overrides: { ...prev.overrides, [id]: value } }));

  const submit = () => {
    if (editing) {
      update.mutate(buildUpdateBody(form, memberIds), {
        onSuccess: () => goBack({ pathname: '/goals/[id]', params: { id: String(editing.id) } }),
      });
    } else {
      create.mutate(buildCreateBody(form, memberIds, startsOn), {
        onSuccess: (plan) =>
          router.replace({ pathname: '/goals/[id]', params: { id: String(plan.id) } }),
      });
    }
  };

  const footer = (
    <View style={styles.footerRow}>
      {step > 0 ? (
        <Button
          title={t('common.back')}
          variant="outline"
          fullWidth={false}
          icon="chevron-back"
          onPress={() => setStep((s) => s - 1)}
          style={styles.flex}
        />
      ) : null}
      {current === 'review' ? (
        <Button
          title={editing ? t('goals.wizard.save') : t('goals.wizard.create')}
          icon={editing ? 'checkmark' : 'flag'}
          loading={save.isPending}
          onPress={submit}
          style={styles.flex2}
        />
      ) : (
        <Button
          title={t('goals.wizard.next')}
          iconRight="chevron-forward"
          disabled={!canNext}
          onPress={() => setStep((s) => s + 1)}
          style={styles.flex2}
        />
      )}
    </View>
  );

  if (!editing && isGoalLimitReached(policy, goals.data) && !create.isSuccess) {
    return (
      <Screen title={t('goals.create')} back>
        <GoalLimitHint />
      </Screen>
    );
  }

  const categoriesSummary = form.allCategories
    ? t('goals.summary.allCategories')
    : form.categoryIds
        .map((id) => (categories.data && findName(categories.data, id)) ?? id)
        .join(', ');

  return (
    <Screen
      title={t(`goals.wizard.steps.${current}`)}
      subtitle={t('goals.wizard.stepOf', { step: step + 1, total: STEPS.length })}
      back
      footer={footer}>
      <StepDots index={step} />

      {current === 'name' ? (
        <View style={{ gap: theme.spacing.md }}>
          {editing ? (
            <Card variant="tinted" tint={theme.colors.accent}>
              <Text variant="caption">{t('goals.wizard.editNote')}</Text>
            </Card>
          ) : null}
          <Text tone="muted">{t('goals.wizard.nameHelp')}</Text>
          <TextField
            label={t('goals.wizard.nameLabel')}
            value={form.name}
            onChangeText={(v) => set('name', v)}
            maxLength={60}
            placeholder={t('goals.ideas.name1')}
            error={errors.field('name')}
          />
          <View style={styles.wrap}>
            {NAME_IDEAS.map((k) => (
              <Chip
                key={k}
                label={t(k)}
                selected={form.name === t(k)}
                onPress={() => set('name', t(k))}
              />
            ))}
          </View>
        </View>
      ) : null}

      {current === 'categories' ? (
        <View style={{ gap: theme.spacing.md }}>
          <OptionCard
            selected={form.allCategories}
            onPress={() => set('allCategories', true)}
            emoji="🌈"
            icon="apps-outline"
            title={t('goals.wizard.allCategoriesOption')}
            body={t('goals.wizard.allCategoriesHelp')}
          />
          <OptionCard
            selected={!form.allCategories}
            onPress={() => set('allCategories', false)}
            emoji="🎯"
            icon="pricetags-outline"
            title={t('goals.wizard.pickCategoriesOption')}
            body={t('goals.wizard.pickCategoriesHelp')}
          />
          {!form.allCategories ? (
            <>
              <Text tone="muted">{t('goals.wizard.categoriesHelp')}</Text>
              {form.categoryIds.length > 0 && categories.data ? (
                <View style={styles.wrap}>
                  {form.categoryIds.map((id) => (
                    <Chip
                      key={id}
                      label={findName(categories.data, id) ?? String(id)}
                      selected
                      icon="close"
                      onPress={() => toggleCategory(id)}
                    />
                  ))}
                </View>
              ) : null}
              {categories.isPending ? (
                <Loading fill={false} />
              ) : categories.isError ? (
                <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
              ) : (
                <CategoryPicker
                  tree={categories.data}
                  selected={selected}
                  onToggle={toggleCategory}
                />
              )}
            </>
          ) : null}
          {errors.field('category_ids') ? (
            <Text tone="danger">{errors.field('category_ids')}</Text>
          ) : null}
        </View>
      ) : null}

      {current === 'mode' ? (
        <View style={{ gap: theme.spacing.md }}>
          <OptionCard
            selected={form.mode === 'cooperation'}
            onPress={() => set('mode', 'cooperation')}
            emoji="🤝"
            icon="people-outline"
            title={t('goals.mode.cooperation')}
            body={t('goals.modeHelp.cooperation')}
          />
          <OptionCard
            selected={form.mode === 'competition'}
            onPress={() => set('mode', 'competition')}
            emoji="🏁"
            icon="podium-outline"
            title={t('goals.mode.competition')}
            body={t('goals.modeHelp.competition')}
          />
        </View>
      ) : null}

      {current === 'period' ? (
        <View style={{ gap: theme.spacing.md }}>
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <OptionCard
              key={p}
              selected={form.period === p}
              onPress={() => set('period', p)}
              emoji={p === 'daily' ? '☀️' : p === 'weekly' ? '📅' : '🗓️'}
              icon={
                p === 'daily'
                  ? 'sunny-outline'
                  : p === 'weekly'
                    ? 'calendar-outline'
                    : 'calendar-number-outline'
              }
              title={t(`goals.period.${p}`)}
              body={t(`goals.periodHelp.${p}`)}
            />
          ))}
          {editing ? null : (
            <>
              <Text variant="label" tone="muted">
                {t('goals.wizard.startsLabel')}
              </Text>
              <View style={styles.wrap}>
                <Chip
                  label={t('goals.wizard.today')}
                  selected={startChoice === 'today'}
                  onPress={() => setStartChoice('today')}
                />
                <Chip
                  label={t('goals.wizard.tomorrow')}
                  selected={startChoice === 'tomorrow'}
                  onPress={() => setStartChoice('tomorrow')}
                />
                <Chip
                  label={t('goals.wizard.nextMonday')}
                  selected={startChoice === 'nextMonday'}
                  onPress={() => setStartChoice('nextMonday')}
                />
              </View>
            </>
          )}
          {errors.field('starts_on') ? (
            <Text tone="danger">{errors.field('starts_on')}</Text>
          ) : null}
        </View>
      ) : null}

      {current === 'target' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text tone="muted">
            {form.mode === 'cooperation'
              ? t('goals.wizard.targetHelpTeam')
              : t('goals.wizard.targetHelpEach')}
          </Text>
          <TextField
            label={t('goals.wizard.targetLabel')}
            value={form.target}
            onChangeText={(v) => set('target', v.replace(/[^0-9]/g, '').slice(0, 5))}
            keyboardType="number-pad"
            error={
              errors.field('target_points') ??
              (form.target && parseTarget(form.target) === null
                ? t('goals.wizard.targetRange')
                : undefined)
            }
          />
          <View style={styles.wrap}>
            {TARGET_PRESETS.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                selected={form.target === String(n)}
                onPress={() => set('target', String(n))}
              />
            ))}
          </View>
          <Text variant="title">{t('goals.wizard.whoPlays')}</Text>
          <OptionCard
            selected={form.everyone}
            onPress={() => set('everyone', true)}
            emoji="👨‍👩‍👧‍👦"
            icon="people-outline"
            title={t('goals.wizard.everyoneOption')}
            body={t('goals.wizard.everyoneHelp')}
          />
          <OptionCard
            selected={!form.everyone}
            onPress={() => set('everyone', false)}
            emoji="☝️"
            icon="person-add-outline"
            title={t('goals.wizard.pickMembersOption')}
            body={t('goals.wizard.pickMembersHelp')}
          />
          {family.isPending ? (
            <Loading fill={false} />
          ) : !form.everyone ? (
            <Card padding="sm">
              {members.map((m, i) => (
                <View key={m.id} style={{ gap: 6, paddingBottom: 6 }}>
                  {i > 0 ? <Divider /> : null}
                  <ToggleRow
                    label={m.nickname}
                    value={team.has(m.id)}
                    onValueChange={(on) => toggleMember(m.id, on)}
                  />
                  {form.mode === 'competition' && team.has(m.id) ? (
                    <OwnTargetField
                      name={m.nickname}
                      value={form.overrides[m.id] ?? ''}
                      placeholder={form.target || '100'}
                      onChange={(v) => setOverride(m.id, v)}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          ) : form.mode === 'competition' ? (
            <Card padding="sm" style={{ gap: theme.spacing.sm }}>
              <Text variant="label" tone="muted">
                {t('goals.wizard.ownTargets')}
              </Text>
              {members.map((m) => (
                <OwnTargetField
                  key={m.id}
                  name={m.nickname}
                  value={form.overrides[m.id] ?? ''}
                  placeholder={form.target || '100'}
                  onChange={(v) => setOverride(m.id, v)}
                />
              ))}
            </Card>
          ) : null}
        </View>
      ) : null}

      {current === 'reward' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text tone="muted">{t('goals.wizard.rewardHelp')}</Text>
          <TextField
            label={t('goals.wizard.rewardLabel')}
            value={form.reward}
            onChangeText={(v) => set('reward', v)}
            maxLength={120}
            placeholder={t('goals.ideas.reward1')}
          />
          <View style={styles.wrap}>
            {REWARD_IDEAS.map((k) => (
              <Chip
                key={k}
                label={t(k)}
                selected={form.reward === t(k)}
                onPress={() => set('reward', t(k))}
              />
            ))}
          </View>
          {form.reward.trim() ? <RewardBanner reward={form.reward.trim()} /> : null}
        </View>
      ) : null}

      {current === 'review' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Card padding="lg" style={{ gap: 4 }}>
            <Text variant="heading">{form.name.trim()}</Text>
            <View style={styles.wrap}>
              <Badge label={t(`goals.mode.${form.mode}`)} tone="primary" />
              <Badge label={t(`goals.period.${form.period}`)} />
              {editing ? null : (
                <Badge
                  label={t('goals.startsOn', {
                    date: formatDate(`${startsOn}T12:00:00`, i18n.language),
                  })}
                  icon="calendar-outline"
                />
              )}
            </View>
          </Card>
          <Card padding="sm">
            <ListRow
              title={t('goals.wizard.steps.categories')}
              subtitle={categoriesSummary}
              onPress={() => setStep(STEPS.indexOf('categories'))}
            />
            <Divider />
            <ListRow
              title={t('goals.wizard.steps.target')}
              subtitle={
                form.mode === 'cooperation'
                  ? t('goals.wizard.reviewTeamTarget', { count: targetNum })
                  : t('goals.wizard.reviewEachTarget', { count: targetNum })
              }
              onPress={() => setStep(STEPS.indexOf('target'))}
            />
            <Divider />
            <ListRow
              title={t('goals.wizard.whoPlays')}
              subtitle={
                form.everyone
                  ? t('goals.wizard.reviewEveryone')
                  : t('goals.summary.players', { count: teamMembers.length })
              }
              onPress={() => setStep(STEPS.indexOf('target'))}
            />
            <View style={[styles.avatars, { padding: theme.spacing.sm }]}>
              {teamMembers.map((m) => (
                <View key={m.id} style={styles.memberChip}>
                  <Avatar avatar={m.avatar} size={30} />
                  <Text variant="caption">
                    {form.mode === 'competition' && form.overrides[m.id]?.trim()
                      ? `${m.nickname} · ${form.overrides[m.id]}`
                      : m.nickname}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
          {form.reward.trim() ? (
            <RewardBanner reward={form.reward.trim()} />
          ) : (
            <Card variant="tinted" tint={theme.colors.accent}>
              <Text variant="caption" tone="muted">
                {t('goals.wizard.noReward')}
              </Text>
            </Card>
          )}
          {editing ? (
            <Text variant="caption" tone="muted">
              {t('goals.wizard.editNote')}
            </Text>
          ) : null}
          {errors.general ? <Text tone="danger">{errors.general}</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
}

/** Admin: create a goal plan (`/goals/new`). */
export function GoalWizardScreen() {
  return <GoalWizard initial={NEW_GOAL_FORM} />;
}

/** Admin: edit a goal plan (`/goals/edit/[id]`); changes apply from the next period. */
export function GoalEditScreen({ id }: { id: number }) {
  const { t } = useTranslation();
  const goal = useGoal(id);
  const family = useFamily();
  if (goal.isPending || family.isPending) return <Loading />;
  if (goal.isError || family.isError || !goal.data) {
    return (
      <Screen title={t('goals.wizard.editTitle')} back>
        <ErrorState
          error={goal.error ?? family.error}
          onRetry={() => {
            void goal.refetch();
            void family.refetch();
          }}
        />
      </Screen>
    );
  }
  const initial = formFromGoal(
    goal.data,
    family.data.members.map((m) => m.id),
  );
  return <GoalWizard initial={initial} editing={goal.data} />;
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  footerRow: { flexDirection: 'row', gap: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionEmoji: { fontSize: 28 },
  catRow: { flexDirection: 'row', alignItems: 'center' },
  catMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  catEmoji: { fontSize: 20 },
  drill: { alignItems: 'center', justifyContent: 'center' },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
