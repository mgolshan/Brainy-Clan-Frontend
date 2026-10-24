import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { ThemeKey } from '@/api/types';
import { draftKey, useChallengeDrafts } from '@/challenges/drafts';
import { getChallenge, type ChallengeResult } from '@/challenges/registry';
import { BRAIN_GAME_SAMPLES, type BrainGameSample } from '@/features/dev/brainGameSamples';
import { FeedbackPanel } from '@/features/play/components/FeedbackPanel';
import {
  Card,
  Overline,
  Screen,
  Segmented,
  ThemeProvider,
  ToggleRow,
  WORLD_ORDER,
  useTheme,
} from '@/ui';

/** One sample game with a local verdict, the play screen's feedback panel and a reset. */
function GameSample({ sample }: { sample: BrainGameSample }) {
  const theme = useTheme();
  const { item } = sample;
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [round, setRound] = useState(0);
  const def = getChallenge(item.type);
  if (!def || !def.isValidPayload(item.payload)) return null;
  const Challenge = def.component;
  const reset = () => {
    useChallengeDrafts.getState().remove(draftKey(item.type, item.id));
    setResult(null);
    setRound((n) => n + 1);
  };
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Card padding={def.wide ? 'xs' : 'lg'}>
        <Challenge
          key={round}
          item={item}
          result={result}
          onSubmit={(response) => setResult({ ...sample.score(response), submitted: response })}
        />
      </Card>
      {result ? (
        <FeedbackPanel
          isCorrect={result.isCorrect}
          correctText={def.describeCorrect(item.payload, result.correctResponse)}
          explanation={null}
          pointsAwarded={result.isCorrect ? item.points : 0}
          onContinue={reset}
          continueLabel="Reset"
          avatar="fox"
        />
      ) : null}
    </View>
  );
}

function isWorld(value: unknown): value is ThemeKey {
  return typeof value === 'string' && (WORLD_ORDER as readonly string[]).includes(value);
}

/**
 * Dev-only brain games preview (`/dev/games?world=jungle&game=0`): play each sample game in any
 * world, light/dark, with reduced motion and calm timers, scored on the device.
 */
export function GamesPreview({ world, game }: { world?: string; game?: string }) {
  const { t } = useTranslation();
  const [themeKey, setThemeKey] = useState<ThemeKey>(isWorld(world) ? world : 'playful');
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [calmTimers, setCalmTimers] = useState(false);
  const initial = Number(game);
  const [index, setIndex] = useState(
    Number.isInteger(initial) && initial >= 0 && initial < BRAIN_GAME_SAMPLES.length ? initial : 0,
  );
  const sample = BRAIN_GAME_SAMPLES[index];

  return (
    <ThemeProvider
      themeKey={themeKey}
      schemePreference={scheme}
      reducedMotion={reducedMotion}
      calmTimers={calmTimers}>
      <Screen title={t('dev.gamesTitle')} subtitle={t('dev.gamesSubtitle')} back width="wide">
        <Card style={styles.gap}>
          <Overline>{t('dev.theme')}</Overline>
          <Segmented
            value={themeKey}
            onChange={setThemeKey}
            options={WORLD_ORDER.map((k) => ({ value: k, label: t(`appearance.themes.${k}`) }))}
          />
          <Segmented
            value={scheme}
            onChange={setScheme}
            options={[
              { value: 'light', label: t('appearance.light'), icon: 'sunny-outline' },
              { value: 'dark', label: t('appearance.dark'), icon: 'moon-outline' },
            ]}
          />
          <ToggleRow
            label={t('appearance.reducedMotion')}
            value={reducedMotion}
            onValueChange={setReducedMotion}
          />
          <ToggleRow label={t('dev.calmTimers')} value={calmTimers} onValueChange={setCalmTimers} />
          <Segmented
            value={index}
            onChange={setIndex}
            options={BRAIN_GAME_SAMPLES.map((s, i) => ({ value: i, label: s.label }))}
          />
        </Card>
        <GameSample key={`${index}-${themeKey}-${reducedMotion}-${calmTimers}`} sample={sample} />
      </Screen>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
});
