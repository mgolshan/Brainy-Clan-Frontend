import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import type { Category, CreateGoalBody, GoalMode, GoalPeriodType } from '@/api/types';
import { usePolicy } from '@/features/auth/hooks';
import { useFamily } from '@/features/family/hooks';
import { RewardBanner } from '@/features/goals/components/RewardBanner';
import { useCreateGoal, useGoals } from '@/features/goals/hooks';
import { GoalLimitHint, isGoalLimitReached } from '@/features/goals/screens/GoalsScreen';
import { startDateOptions } from '@/features/goals/time';
import { useCategories } from '@/features/play/api';
import { categoryColor, categoryVisual } from '@/features/play/categoryVisuals';
import { formatDate } from '@/lib/format';
import { formErrors } from '@/lib/formErrors';
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

/** Admin: create a goal plan step by step (`POST /goals`). */
export function GoalWizardScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const policy = usePolicy();
  const goals = useGoals();
  const categories = useCategories();
  const family = useFamily();
  const create = useCreateGoal();
  const dates = useMemo(() => startDateOptions(), []);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<GoalMode>('cooperation');
  const [period, setPeriod] = useState<GoalPeriodType>('weekly');
  const [startsOn, setStartsOn] = useState(dates.today);
  const [target, setTarget] = useState('100');
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [reward, setReward] = useState('');
  const errors = formErrors(create.error, t, [
    'name',
    'target_points',
    'category_ids',
    'starts_on',
  ]);

  const current: Step = STEPS[step];
  const targetNum = Number(target);
  const targetValid = Number.isInteger(targetNum) && targetNum >= 1 && targetNum <= 10000;
  const members = family.data?.members ?? [];
  const includedMembers = members.filter((m) => !excluded.has(m.id));

  const canNext =
    (current === 'name' && name.trim().length > 0) ||
    (current === 'categories' && selected.size > 0) ||
    current === 'mode' ||
    current === 'period' ||
    (current === 'target' && targetValid && includedMembers.length > 0) ||
    current === 'reward' ||
    current === 'review';

  if (isGoalLimitReached(policy, goals.data) && !create.isSuccess) {
    return (
      <Screen title={t('goals.create')} back>
        <GoalLimitHint />
      </Screen>
    );
  }

  const toggleCategory = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const buildBody = (): CreateGoalBody => {
    const customMembers =
      excluded.size > 0 ||
      (mode === 'competition' && Object.values(overrides).some((v) => v.trim()));
    return {
      name: name.trim(),
      mode,
      period_type: period,
      target_points: targetNum,
      ...(reward.trim() ? { reward_text: reward.trim() } : {}),
      starts_on: startsOn,
      category_ids: [...selected],
      ...(customMembers
        ? {
            members: includedMembers.map((m) => {
              const o = Number(overrides[m.id]);
              return mode === 'competition' && overrides[m.id]?.trim() && o >= 1
                ? { member_id: m.id, target_override: o }
                : { member_id: m.id };
            }),
          }
        : {}),
    };
  };

  const submit = () =>
    create.mutate(buildBody(), {
      onSuccess: (plan) =>
        router.replace({ pathname: '/goals/[id]', params: { id: String(plan.id) } }),
    });

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
          title={t('goals.wizard.create')}
          icon="flag"
          loading={create.isPending}
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

  return (
    <Screen
      title={t(`goals.wizard.steps.${current}`)}
      subtitle={t('goals.wizard.stepOf', { step: step + 1, total: STEPS.length })}
      back
      footer={footer}>
      <StepDots index={step} />

      {current === 'name' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text tone="muted">{t('goals.wizard.nameHelp')}</Text>
          <TextField
            label={t('goals.wizard.nameLabel')}
            value={name}
            onChangeText={setName}
            maxLength={60}
            placeholder={t('goals.ideas.name1')}
            error={errors.field('name')}
          />
          <View style={styles.wrap}>
            {NAME_IDEAS.map((k) => (
              <Chip key={k} label={t(k)} selected={name === t(k)} onPress={() => setName(t(k))} />
            ))}
          </View>
        </View>
      ) : null}

      {current === 'categories' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text tone="muted">{t('goals.wizard.categoriesHelp')}</Text>
          {selected.size > 0 && categories.data ? (
            <View style={styles.wrap}>
              {[...selected].map((id) => (
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
            <CategoryPicker tree={categories.data} selected={selected} onToggle={toggleCategory} />
          )}
          {errors.field('category_ids') ? (
            <Text tone="danger">{errors.field('category_ids')}</Text>
          ) : null}
        </View>
      ) : null}

      {current === 'mode' ? (
        <View style={{ gap: theme.spacing.md }}>
          <OptionCard
            selected={mode === 'cooperation'}
            onPress={() => setMode('cooperation')}
            emoji="🤝"
            icon="people-outline"
            title={t('goals.mode.cooperation')}
            body={t('goals.modeHelp.cooperation')}
          />
          <OptionCard
            selected={mode === 'competition'}
            onPress={() => setMode('competition')}
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
              selected={period === p}
              onPress={() => setPeriod(p)}
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
          <Text variant="label" tone="muted">
            {t('goals.wizard.startsLabel')}
          </Text>
          <View style={styles.wrap}>
            <Chip
              label={t('goals.wizard.today')}
              selected={startsOn === dates.today}
              onPress={() => setStartsOn(dates.today)}
            />
            <Chip
              label={t('goals.wizard.tomorrow')}
              selected={startsOn === dates.tomorrow}
              onPress={() => setStartsOn(dates.tomorrow)}
            />
            <Chip
              label={t('goals.wizard.nextMonday')}
              selected={startsOn === dates.nextMonday}
              onPress={() => setStartsOn(dates.nextMonday)}
            />
          </View>
          {errors.field('starts_on') ? (
            <Text tone="danger">{errors.field('starts_on')}</Text>
          ) : null}
        </View>
      ) : null}

      {current === 'target' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text tone="muted">
            {mode === 'cooperation'
              ? t('goals.wizard.targetHelpTeam')
              : t('goals.wizard.targetHelpEach')}
          </Text>
          <TextField
            label={t('goals.wizard.targetLabel')}
            value={target}
            onChangeText={(v) => setTarget(v.replace(/[^0-9]/g, '').slice(0, 5))}
            keyboardType="number-pad"
            error={
              errors.field('target_points') ??
              (target && !targetValid ? t('goals.wizard.targetRange') : undefined)
            }
          />
          <View style={styles.wrap}>
            {TARGET_PRESETS.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                selected={target === String(n)}
                onPress={() => setTarget(String(n))}
              />
            ))}
          </View>
          <Text variant="title">{t('goals.wizard.whoPlays')}</Text>
          {family.isPending ? (
            <Loading fill={false} />
          ) : (
            <Card padding="sm">
              {members.map((m, i) => (
                <View key={m.id} style={{ gap: 6, paddingBottom: 6 }}>
                  {i > 0 ? <Divider /> : null}
                  <ToggleRow
                    label={m.nickname}
                    value={!excluded.has(m.id)}
                    onValueChange={(on) =>
                      setExcluded((prev) => {
                        const next = new Set(prev);
                        if (on) next.delete(m.id);
                        else next.add(m.id);
                        return next;
                      })
                    }
                  />
                  {mode === 'competition' && !excluded.has(m.id) ? (
                    <TextField
                      label={t('goals.wizard.ownTarget', { name: m.nickname })}
                      value={overrides[m.id] ?? ''}
                      onChangeText={(v) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [m.id]: v.replace(/[^0-9]/g, '').slice(0, 5),
                        }))
                      }
                      keyboardType="number-pad"
                      placeholder={target || '100'}
                      hint={t('goals.wizard.ownTargetHint')}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          )}
        </View>
      ) : null}

      {current === 'reward' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text tone="muted">{t('goals.wizard.rewardHelp')}</Text>
          <TextField
            label={t('goals.wizard.rewardLabel')}
            value={reward}
            onChangeText={setReward}
            maxLength={120}
            placeholder={t('goals.ideas.reward1')}
          />
          <View style={styles.wrap}>
            {REWARD_IDEAS.map((k) => (
              <Chip
                key={k}
                label={t(k)}
                selected={reward === t(k)}
                onPress={() => setReward(t(k))}
              />
            ))}
          </View>
          {reward.trim() ? <RewardBanner reward={reward.trim()} /> : null}
        </View>
      ) : null}

      {current === 'review' ? (
        <View style={{ gap: theme.spacing.md }}>
          <Card padding="lg" style={{ gap: 4 }}>
            <Text variant="heading">{name.trim()}</Text>
            <View style={styles.wrap}>
              <Badge label={t(`goals.mode.${mode}`)} tone="primary" />
              <Badge label={t(`goals.period.${period}`)} />
              <Badge
                label={t('goals.startsOn', {
                  date: formatDate(`${startsOn}T12:00:00`, i18n.language),
                })}
                icon="calendar-outline"
              />
            </View>
          </Card>
          <Card padding="sm">
            <ListRow
              title={t('goals.wizard.steps.categories')}
              subtitle={[...selected]
                .map((id) => (categories.data && findName(categories.data, id)) ?? id)
                .join(', ')}
              onPress={() => setStep(1)}
            />
            <Divider />
            <ListRow
              title={t('goals.wizard.steps.target')}
              subtitle={
                mode === 'cooperation'
                  ? t('goals.wizard.reviewTeamTarget', { count: targetNum })
                  : t('goals.wizard.reviewEachTarget', { count: targetNum })
              }
              onPress={() => setStep(4)}
            />
            <Divider />
            <View style={[styles.avatars, { padding: theme.spacing.sm }]}>
              {includedMembers.map((m) => (
                <View key={m.id} style={styles.memberChip}>
                  <Avatar avatar={m.avatar} size={30} />
                  <Text variant="caption">
                    {mode === 'competition' && overrides[m.id]?.trim()
                      ? `${m.nickname} · ${overrides[m.id]}`
                      : m.nickname}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
          {reward.trim() ? (
            <RewardBanner reward={reward.trim()} />
          ) : (
            <Card variant="tinted" tint={theme.colors.accent}>
              <Text variant="caption" tone="muted">
                {t('goals.wizard.noReward')}
              </Text>
            </Card>
          )}
          {errors.general ? <Text tone="danger">{errors.general}</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
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
