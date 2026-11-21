import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { tipVisible, type TipKey } from '@/features/onboarding/flows';
import { runId, useFtue, useFtueRun, useMarkSteps } from '@/features/onboarding/hooks';
import { Appear, Button, Card, Icon, Text, useTheme, type IconName } from '@/ui';

const TIP_VISUAL: Record<TipKey, { emoji: string; icon: IconName }> = {
  tip_play: { emoji: '🎮', icon: 'game-controller-outline' },
  tip_goals: { emoji: '🎯', icon: 'flag-outline' },
  tip_chat: { emoji: '👋', icon: 'chatbubbles-outline' },
};

function useTipText(tip: TipKey, kid: boolean, classroom: boolean): string {
  const { t } = useTranslation();
  switch (tip) {
    case 'tip_play':
      return kid ? t('onboarding.tips.playKid') : t('onboarding.tips.play');
    case 'tip_goals':
      if (kid) return t('onboarding.tips.goalsKid');
      return classroom ? t('onboarding.tips.goalsClassroom') : t('onboarding.tips.goals');
    case 'tip_chat':
      if (kid) return t('onboarding.tips.chatKid');
      return classroom ? t('onboarding.tips.chatClassroom') : t('onboarding.tips.chat');
  }
}

/**
 * One-time coach mark at the top of Play, Goals and Chat (FTUE). It is marked as seen on the
 * server as soon as it shows (optimistic; a failure never brings it back in this run) and stays
 * on screen until "Got it" or the screen closes. Never blocks: it is a card in the page, not an
 * overlay. Hidden on older servers (404) and while the progress loads.
 */
export function CoachMark({ tip }: { tip: TipKey }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { onboarding, flow, variant, userId } = useFtue();
  const seen = useFtueRun((s) => s.shown.includes(runId(userId, tip)));
  const { mutate } = useMarkSteps();
  // Decided once per mount: once shown it stays until "Got it", even after the cache says done.
  const [showing, setShowing] = useState(false);
  const due = flow !== null && tipVisible(onboarding, tip, seen);
  if (due && !showing) setShowing(true);

  useEffect(() => {
    if (showing) mutate([tip]);
  }, [showing, mutate, tip]);

  const classroom = flow === 'teacher' || flow === 'student';
  const text = useTipText(tip, variant === 'kid', classroom);
  if (!showing) return null;
  const visual = TIP_VISUAL[tip];

  return (
    <Appear>
      <Card variant="tinted" padding="md" accessibilityLabel={text}>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          {theme.emojiIcons ? (
            <RNText style={styles.emoji} accessibilityElementsHidden>
              {visual.emoji}
            </RNText>
          ) : (
            <Icon name={visual.icon} color={theme.colors.primary} />
          )}
          <Text style={styles.flex} accessibilityLiveRegion="polite">
            {text}
          </Text>
        </View>
        <Button
          title={t('onboarding.tips.gotIt')}
          variant="ghost"
          size="sm"
          fullWidth={false}
          style={styles.end}
          onPress={() => setShowing(false)}
        />
      </Card>
    </Appear>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  emoji: { fontSize: 26 },
  end: { alignSelf: 'flex-end' },
});
