import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { GoalPlan, Policy } from '@/api/types';
import { useIsAdmin, useMe, usePolicy } from '@/features/auth/hooks';
import { GoalCard } from '@/features/goals/components/GoalCard';
import { useGoals } from '@/features/goals/hooks';
import {
  Appear,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  SectionHeader,
  Text,
  useTheme,
} from '@/ui';

/** Policy limit reached? `null` = unlimited. The number comes from the server policy. */
export function isGoalLimitReached(policy: Policy | undefined, goals: GoalPlan[] | undefined) {
  const max = policy?.limits.max_active_goals;
  if (max === null || max === undefined) return false;
  return (goals ?? []).filter((g) => g.is_active).length >= max;
}

/** Upgrade hint shown when the policy's `max_active_goals` is used up. */
export function GoalLimitHint() {
  const { t } = useTranslation();
  const theme = useTheme();
  const max = usePolicy()?.limits.max_active_goals ?? 0;
  return (
    <Card variant="tinted" tint={theme.colors.warning} style={{ gap: 4 }}>
      <Text weight="bold">{t('goals.limitTitle')}</Text>
      <Text variant="caption" tone="muted">
        {t('goals.limitBody', { count: max })}
      </Text>
    </Card>
  );
}

function openGoal(id: number) {
  router.push({ pathname: '/goals/[id]', params: { id: String(id) } });
}

/** All family goals; admins can create new ones. */
export function GoalsScreen() {
  const { t } = useTranslation();
  const me = useMe().data;
  const policy = usePolicy();
  const isAdmin = useIsAdmin();
  const goals = useGoals();
  const atLimit = isGoalLimitReached(policy, goals.data);

  const active = goals.data?.filter((g) => g.is_active) ?? [];
  const paused = goals.data?.filter((g) => !g.is_active) ?? [];

  return (
    <Screen
      title={t('goals.title')}
      subtitle={t('goals.subtitle')}
      back
      onRefresh={() => void goals.refetch()}
      refreshing={goals.isRefetching}>
      {goals.isPending ? (
        <Loading fill={false} />
      ) : goals.isError ? (
        <ErrorState error={goals.error} onRetry={() => void goals.refetch()} />
      ) : (
        <>
          {isAdmin ? (
            atLimit ? (
              <GoalLimitHint />
            ) : (
              <Button
                title={t('goals.create')}
                icon="add-circle-outline"
                size="lg"
                onPress={() => router.push('/goals/new')}
              />
            )
          ) : null}
          {active.length === 0 ? (
            <Card>
              <EmptyState
                title={t('goals.emptyTitle')}
                body={isAdmin ? t('goals.emptyAdmin') : t('goals.emptyMember')}
                emoji="🎯"
                icon="flag-outline"
              />
            </Card>
          ) : (
            active.map((g, i) => (
              <Appear key={g.id} index={i}>
                <GoalCard goal={g} meId={me?.member?.id} onPress={() => openGoal(g.id)} />
              </Appear>
            ))
          )}
          {paused.length > 0 ? (
            <>
              <SectionHeader title={t('goals.pausedSection')} />
              {paused.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  meId={me?.member?.id}
                  onPress={() => openGoal(g.id)}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
