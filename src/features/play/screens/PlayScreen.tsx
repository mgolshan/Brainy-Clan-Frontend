import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text as RNText, View } from 'react-native';

import type { PlaySession } from '@/api/types';
import { getChallenge } from '@/challenges/registry';
import type { AdStage } from '@/features/play/api';
import { FeedbackPanel } from '@/features/play/components/FeedbackPanel';
import { AdError } from '@/features/play/rewardedAdTypes';
import { usePlaySession } from '@/features/play/usePlaySession';
import { askAfterSessionIfUndecided } from '@/features/notifications/usePush';
import { useStartAndOpen } from '@/features/play/useStartAndOpen';
import { errorMessage } from '@/lib/errorMessage';
import {
  Appear,
  Badge,
  Button,
  Card,
  Celebration,
  Confetti,
  EmptyState,
  ErrorState,
  Hearts,
  Icon,
  IconBubble,
  Loading,
  PressableScale,
  ProgressBar,
  Screen,
  Text,
  useTheme,
} from '@/ui';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/play');
}

/** Top bar: close, progress toward the target, lives (or redemption progress). */
function PlayHeader({
  session,
  inRedemption,
  redemption,
}: {
  session: PlaySession;
  inRedemption: boolean;
  redemption: { answered: number; total: number };
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const size = theme.touchTarget - 8;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={styles.headerRow}>
        <PressableScale
          onPress={leave}
          accessibilityRole="button"
          accessibilityLabel={t('play.close')}
          hitSlop={8}
          style={[
            styles.close,
            {
              width: size,
              height: size,
              borderRadius: theme.key === 'classic' ? theme.radius.md : size / 2,
              backgroundColor: theme.colors.surface,
              borderColor:
                theme.key === 'classic' ? theme.colors.borderStrong : theme.colors.border,
              borderWidth: theme.borderWidth,
            },
          ]}>
          <Icon name="close" color={theme.colors.text} />
        </PressableScale>
        <View style={styles.flex}>
          {inRedemption ? (
            <ProgressBar
              value={redemption.total ? redemption.answered / redemption.total : 0}
              color={theme.colors.accent}
              accessibilityLabel={t('play.redemptionProgress', {
                answered: redemption.answered,
                total: redemption.total,
              })}
            />
          ) : (
            <ProgressBar
              value={session.target_points ? session.points / session.target_points : 0}
              accessibilityLabel={t('play.progress', {
                points: session.points,
                target: session.target_points,
              })}
            />
          )}
        </View>
        {inRedemption ? (
          <Badge label={`${redemption.answered}/${redemption.total}`} tone="accent" />
        ) : (
          <Hearts total={session.blunder_cap} lost={session.mistakes} />
        )}
      </View>
      <View style={styles.headerRow}>
        <Text variant="caption" tone="muted" style={styles.flex}>
          {inRedemption
            ? t('play.redemptionBanner')
            : t('play.progress', { points: session.points, target: session.target_points })}
        </Text>
        {theme.key === 'classic' && !inRedemption ? (
          <Text variant="caption" tone="muted">
            {t('play.livesLeft', {
              count: Math.max(0, session.blunder_cap - session.mistakes),
              total: session.blunder_cap,
            })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function CompletedView({
  session,
  onPlayAgain,
  starting,
}: {
  session: PlaySession;
  onPlayAgain: () => void;
  starting: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.center, { gap: theme.spacing.md }]}>
      <Celebration />
      <Text variant="display" align="center">
        {t('play.completed.title')}
      </Text>
      <Text variant="bodyLarge" tone="muted" align="center">
        {t('play.completed.body', { count: session.points })}
      </Text>
      <Card style={styles.stats}>
        <View style={styles.stat}>
          <Text variant="heading">{session.points}</Text>
          <Text variant="caption" tone="muted">
            {t('play.completed.points')}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading">{session.answered}</Text>
          <Text variant="caption" tone="muted">
            {t('play.completed.answered')}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading">{session.mistakes}</Text>
          <Text variant="caption" tone="muted">
            {t('play.completed.mistakes')}
          </Text>
        </View>
      </Card>
      <Button
        title={t('play.playAgain')}
        icon="refresh"
        size="lg"
        onPress={onPlayAgain}
        loading={starting}
      />
      <Button title={t('common.done')} variant="outline" onPress={leave} />
    </View>
  );
}

function FailedView({
  session,
  adAvailable,
  adStage,
  onFree,
  onAd,
  onRedemption,
  onEnd,
  busy,
  error,
  notice,
}: {
  session: PlaySession;
  /** Server allows an ad now and this build can show one. */
  adAvailable: boolean;
  adStage: AdStage | null;
  onFree: () => void;
  onAd: () => void;
  onRedemption: () => void;
  onEnd: () => void;
  busy: 'free' | 'ad' | 'redemption' | 'end' | null;
  error: unknown;
  notice: string | null;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sc = session.second_chance;
  const anyOption = sc.free_remaining_today > 0 || adAvailable || sc.redemption_available;
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Appear style={[styles.center, { gap: theme.spacing.sm }]}>
        <IconBubble size={104} color={theme.colors.danger}>
          {theme.emojiIcons ? (
            <RNText style={styles.bigEmoji}>💔</RNText>
          ) : (
            <Icon name="heart-dislike-outline" size={48} color={theme.colors.danger} />
          )}
        </IconBubble>
        <Text variant="heading" align="center">
          {t('play.failed.title')}
        </Text>
        <Text tone="muted" align="center">
          {t('play.failed.body', { points: session.points, target: session.target_points })}
        </Text>
      </Appear>
      {anyOption ? (
        <Card style={{ gap: theme.spacing.sm }} padding="lg">
          <Text variant="title">{t('play.failed.secondChance')}</Text>
          {sc.free_remaining_today > 0 ? (
            <Button
              title={t('play.failed.free', { count: sc.free_remaining_today })}
              icon="gift-outline"
              variant="success"
              onPress={onFree}
              loading={busy === 'free'}
              disabled={busy !== null}
            />
          ) : null}
          {adAvailable ? (
            <>
              <Button
                title={t('play.failed.ad')}
                icon="play-circle-outline"
                variant="secondary"
                onPress={onAd}
                loading={busy === 'ad'}
                disabled={busy !== null}
              />
              {adStage === 'loading' || adStage === 'checking' ? (
                <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
                  {adStage === 'loading' ? t('play.ad.loading') : t('play.ad.checking')}
                </Text>
              ) : null}
            </>
          ) : null}
          {sc.redemption_available ? (
            <>
              <Button
                title={t('play.failed.redemption')}
                icon="school-outline"
                onPress={onRedemption}
                loading={busy === 'redemption'}
                disabled={busy !== null}
              />
              <Text variant="caption" tone="muted">
                {t('play.failed.redemptionHint')}
              </Text>
            </>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text tone="muted">{t('play.failed.noneLeft')}</Text>
        </Card>
      )}
      {error ? (
        <Text tone="danger">
          {error instanceof AdError ? t(`play.ad.${error.kind}`) : errorMessage(error, t)}
        </Text>
      ) : notice ? (
        <Text tone="muted">{notice}</Text>
      ) : null}
      <Button
        title={t('play.failed.end')}
        variant="ghost"
        onPress={onEnd}
        loading={busy === 'end'}
        disabled={busy !== null && busy !== 'end'}
      />
    </View>
  );
}

/** One play session: questions, feedback, completion and second chances. */
export function PlayScreen({ sessionId }: { sessionId: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const play = usePlaySession(sessionId);
  const again = useStartAndOpen();
  const { session, phase, currentItem, feedback } = play;

  // Haptic verdict (native only).
  useEffect(() => {
    if (!feedback || Platform.OS === 'web') return;
    void Haptics.notificationAsync(
      feedback.result.is_correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  }, [feedback]);

  // A friendly moment to ask for push permission: right after a completed session (asks only
  // while the OS has never asked; no-op on web / Expo Go).
  useEffect(() => {
    if (phase === 'completed') void askAfterSessionIfUndecided().catch(() => undefined);
  }, [phase]);

  if (phase === 'loading') return <Loading />;
  if (phase === 'error' || !session) {
    return (
      <Screen back>
        <ErrorState error={play.query.error} onRetry={() => void play.query.refetch()} />
      </Screen>
    );
  }

  const busy = play.secondChanceState.isPending
    ? 'free'
    : play.adState.isPending
      ? 'ad'
      : play.redemptionState.isPending
        ? 'redemption'
        : play.abandonState.isPending
          ? 'end'
          : null;

  const definition = currentItem ? getChallenge(currentItem.type) : undefined;
  const Challenge = definition?.component;
  const showHeader = phase === 'question' || phase === 'feedback' || phase === 'waitingOffline';

  return (
    <Screen
      plain={phase === 'question' || phase === 'feedback'}
      edges={['top', 'bottom']}
      contentStyle={phase === 'completed' || phase === 'failed' ? styles.centerFill : undefined}>
      {showHeader ? (
        <PlayHeader
          session={session}
          inRedemption={play.inRedemption}
          redemption={play.redemptionProgress}
        />
      ) : null}

      {play.inRedemption && phase === 'question' ? (
        <Card variant="tinted" tint={theme.colors.accent}>
          <Text weight="bold">{t('play.redemptionTitle')}</Text>
          <Text variant="caption" tone="muted">
            {t('play.redemptionBanner')}
          </Text>
        </Card>
      ) : null}

      {(phase === 'question' || phase === 'feedback' || phase === 'waitingOffline') &&
      currentItem &&
      Challenge ? (
        <Card
          padding={definition?.wide ? 'xs' : 'lg'}
          key={currentItem.id}
          style={{ gap: theme.spacing.sm }}>
          {(currentItem.points ?? 1) > 1 ? (
            <View
              style={styles.worth}
              accessible
              accessibilityLabel={t('play.worth', { count: currentItem.points })}>
              <Badge label={`+${currentItem.points}`} tone="accent" icon="star" />
            </View>
          ) : null}
          <Challenge
            item={currentItem}
            onSubmit={(response) => void play.submit(response)}
            pending={play.pending?.itemId === currentItem.id ? play.pending.response : null}
            result={
              feedback && feedback.itemId === currentItem.id
                ? {
                    isCorrect: feedback.result.is_correct,
                    correctResponse: feedback.result.correct_response,
                    submitted: feedback.response,
                  }
                : null
            }
          />
        </Card>
      ) : null}

      {phase === 'question' && play.submitError ? (
        <Text tone="danger">{errorMessage(play.submitError, t)}</Text>
      ) : null}

      {phase === 'feedback' && feedback ? (
        <FeedbackPanel
          isCorrect={feedback.result.is_correct}
          correctText={feedback.correctText}
          explanation={feedback.result.explanation}
          pointsAwarded={feedback.result.points_awarded}
          onContinue={play.next}
          continueLabel={
            session.status === 'completed'
              ? t('play.seeResult')
              : session.status === 'failed'
                ? t('play.seeOptions')
                : undefined
          }
        />
      ) : null}

      {phase === 'waitingOffline' ? (
        <Card variant="tinted" tint={theme.colors.warning} style={{ gap: 8 }}>
          <Text weight="bold">{t('play.offline.title')}</Text>
          <Text variant="caption" tone="muted">
            {t('play.offline.body')}
          </Text>
          <Button
            title={t('common.retry')}
            variant="outline"
            size="sm"
            icon="refresh"
            fullWidth={false}
            onPress={play.retryQueued}
          />
        </Card>
      ) : null}

      {phase === 'completed' ? (
        <CompletedView
          session={session}
          starting={again.isPending}
          onPlayAgain={() => again.open(session.category_id, { replace: true })}
        />
      ) : null}

      {phase === 'failed' ? (
        <FailedView
          session={session}
          adAvailable={play.adAvailable}
          adStage={play.adStage}
          busy={busy}
          error={
            play.secondChanceState.error ??
            play.adState.error ??
            play.redemptionState.error ??
            play.abandonState.error
          }
          notice={
            play.adState.isSuccess && play.adState.data === null ? t('play.ad.notCompleted') : null
          }
          onFree={() => void play.freeSecondChance().catch(() => undefined)}
          onAd={() => void play.watchAd().catch(() => undefined)}
          onRedemption={() => void play.startRedemption().catch(() => undefined)}
          onEnd={() =>
            void play
              .abandon()
              .then(leave)
              .catch(() => undefined)
          }
        />
      ) : null}

      {phase === 'abandoned' ? (
        <EmptyState
          title={t('play.abandoned')}
          emoji="👋"
          icon="exit-outline"
          actionLabel={t('common.done')}
          onAction={leave}
        />
      ) : null}

      {phase === 'outOfItems' ? (
        <EmptyState
          title={t('play.outOfItems.title')}
          body={t('play.outOfItems.body')}
          emoji="📭"
          icon="file-tray-outline"
          actionLabel={t('common.retry')}
          onAction={() => void play.query.refetch()}
        />
      ) : null}

      {play.skippedCount > 0 && showHeader ? (
        <Text variant="caption" tone="subtle" align="center">
          {t('play.skipped', { count: play.skippedCount })}
        </Text>
      ) : null}

      {again.error ? <Text tone="danger">{errorMessage(again.error, t)}</Text> : null}

      {phase === 'completed' && theme.celebration === 'confetti' ? <Confetti /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  centerFill: { justifyContent: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch' },
  stat: { alignItems: 'center', gap: 2 },
  bigEmoji: { fontSize: 52 },
  worth: { flexDirection: 'row', justifyContent: 'flex-end' },
});
