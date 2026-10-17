import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { SessionPayload } from '@/api/types';
import {
  seedPlaySession,
  useAbandonSession,
  useCategories,
  useCurrentSession,
} from '@/features/play/api';
import { findCategory } from '@/features/play/categoryVisuals';
import { resumeCardModel } from '@/features/play/resume';
import { errorMessage } from '@/lib/errorMessage';
import { Appear, Button, Card, Hearts, ProgressBar, Text, useTheme } from '@/ui';

/** How long the "tap again to end" state waits for the second tap. */
const CONFIRM_MS = 4_000;

function ResumeCard({ payload, compact }: { payload: SessionPayload; compact: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { session } = payload;
  const categories = useCategories();
  const abandon = useAbandonSession(session.id);
  const [confirming, setConfirming] = useState(false);
  const model = resumeCardModel(session, theme.key);
  const name = findCategory(categories.data, session.category_id)?.name ?? t('play.resume.game');

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const onContinue = () => {
    seedPlaySession(payload);
    router.push({ pathname: '/play/[session]', params: { session: String(session.id) } });
  };
  const onEnd = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    abandon.mutate();
  };

  const progressText = t(model.progress.key, model.progress.options);
  const statusText =
    model.status.key === 'play.resume.lives'
      ? t(model.status.key, model.status.options)
      : t(model.status.key);

  return (
    <Appear>
      <Card
        variant="tinted"
        tint={theme.colors.primary}
        padding={compact ? 'md' : 'lg'}
        style={{ gap: theme.spacing.sm }}>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <View style={styles.flex}>
            <Text variant="caption" tone="muted" weight="bold">
              {t(model.title)}
            </Text>
            <Text variant={compact ? 'body' : 'title'} weight="bold" numberOfLines={2}>
              {name}
            </Text>
          </View>
          {!compact && session.status === 'active' ? (
            <Hearts total={session.blunder_cap} lost={session.mistakes ?? 0} />
          ) : null}
        </View>
        <ProgressBar value={model.fraction} accessibilityLabel={progressText} />
        <Text variant="caption" tone="muted">
          {`${progressText} · ${statusText}`}
        </Text>
        <View style={[compact ? styles.buttonsRow : undefined, { gap: theme.spacing.sm }]}>
          <View style={compact ? styles.flex : undefined}>
            <Button
              title={t(model.continueLabel)}
              icon="play"
              size={compact ? 'md' : 'lg'}
              onPress={onContinue}
              disabled={abandon.isPending}
            />
          </View>
          <View style={compact ? styles.flex : undefined}>
            <Button
              title={confirming ? t(model.endConfirmLabel) : t('play.resume.end')}
              icon={confirming ? 'alert-circle-outline' : 'exit-outline'}
              variant={confirming ? 'danger' : 'ghost'}
              size="md"
              onPress={onEnd}
              loading={abandon.isPending}
              accessibilityHint={confirming ? undefined : t('play.resume.endHint')}
            />
          </View>
        </View>
        {abandon.error ? <Text tone="danger">{errorMessage(abandon.error, t)}</Text> : null}
      </Card>
    </Appear>
  );
}

/**
 * "Continue your game": the member's unfinished session (`GET /play/sessions/current`) with
 * Continue and a two-tap End game. Renders nothing when there is none (or on errors).
 */
export function ResumeGameCard({ compact = false }: { compact?: boolean }) {
  const current = useCurrentSession();
  if (!current.data) return null;
  return <ResumeCard key={current.data.session.id} payload={current.data} compact={compact} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  buttonsRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
