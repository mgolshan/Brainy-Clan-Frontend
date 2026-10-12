import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import {
  AVATAR_KEYS,
  THEME_KEYS,
  type ChoiceResponse,
  type MultipleChoicePayload,
  type SessionItem,
  type ThemeKey,
  type WisdomCardPayload,
} from '@/api/types';
import { getChallenge, type ChallengeResult } from '@/challenges/registry';
import { useChallengeDrafts, draftKey } from '@/challenges/drafts';
import { MultipleChoice } from '@/challenges/MultipleChoice';
import { WisdomCard } from '@/challenges/WisdomCard';
import { SocialButton } from '@/features/auth/social/SocialButton';
import { OrDivider } from '@/features/auth/social/SocialSignIn';
import { CHALLENGE_SAMPLES, scoreSample } from '@/features/dev/challengeSamples';
import { CategoryTile } from '@/features/play/components/CategoryTile';
import { FeedbackPanel } from '@/features/play/components/FeedbackPanel';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Celebration,
  Chip,
  Confetti,
  Divider,
  EmptyState,
  ErrorState,
  Hearts,
  ListRow,
  Loading,
  Overline,
  ProgressBar,
  Screen,
  SectionHeader,
  Segmented,
  Stepper,
  Text,
  TextField,
  ThemeProvider,
  ToggleRow,
  useTheme,
} from '@/ui';

const SAMPLE_MC: SessionItem<MultipleChoicePayload> = {
  id: 1,
  position: 1,
  type: 'multiple_choice',
  is_redemption: false,
  points: 1,
  answered: false,
  payload: {
    question: 'What is the capital of Peru?',
    image_url: null,
    choices: [
      { id: 'a', text: 'Lima' },
      { id: 'b', text: 'Quito' },
      { id: 'c', text: 'Bogotá' },
      { id: 'd', text: 'La Paz' },
    ],
  },
};

const SAMPLE_WISDOM: SessionItem<WisdomCardPayload> = {
  id: 2,
  position: 2,
  type: 'wisdom_card',
  is_redemption: false,
  points: 1,
  answered: false,
  payload: {
    card: {
      text: 'We suffer more often in imagination than in reality.',
      author: 'Seneca',
      source: 'Letters to Lucilius',
    },
    question: 'What is the main idea?',
    choices: [
      { id: 'a', text: 'Worry is usually bigger than the real problem' },
      { id: 'b', text: 'Imagination is dangerous' },
      { id: 'c', text: 'Reality is always painful' },
    ],
  },
};

const SAMPLE_CATEGORIES = [
  {
    slug: 'world-geography',
    name: 'World Geography',
    icon: 'globe',
    is_locked: false,
    children: [{}, {}, {}],
  },
  { slug: 'math-sprint', name: 'Math Sprint', icon: 'calculator', is_locked: false, children: [] },
  {
    slug: 'wisdom-cards',
    name: 'Wisdom Cards',
    icon: 'quote',
    is_locked: false,
    children: [{}, {}],
  },
  { slug: 'history', name: 'History', icon: 'landmark', is_locked: true, children: [] },
] as const;

/** One F5 challenge sample with a local verdict, feedback and reset. */
function ChallengeSample({ item }: { item: SessionItem }) {
  const theme = useTheme();
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
          onSubmit={(response) => {
            const verdict = scoreSample(item, response);
            setResult({ ...verdict, submitted: response });
          }}
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
        />
      ) : null}
    </View>
  );
}

/** The preview content, rendered inside a nested ThemeProvider. */
function PreviewBody({ controls }: { controls: ReactNode }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mcResult, setMcResult] = useState<ChallengeResult<ChoiceResponse> | null>(null);
  const [wisdomResult, setWisdomResult] = useState<ChallengeResult<ChoiceResponse> | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [sample, setSample] = useState(0);
  const [lives, setLives] = useState(1);
  const [toggle, setToggle] = useState(true);
  const [stepper, setStepper] = useState<number | null>(4);
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');

  return (
    <Screen title={t('dev.themesTitle')} subtitle={t('dev.themesSubtitle')} back>
      {controls}

      <SectionHeader title={t('dev.typography')} />
      <Card style={styles.gap}>
        <Overline>{`${theme.key} · ${theme.scheme}`}</Overline>
        <Text variant="display">Brainy Clan</Text>
        <Text variant="heading">Family Brain Challenges</Text>
        <Text variant="title">Pizza night at 50 points</Text>
        <Text variant="bodyLarge">Learn and play together as a family.</Text>
        <Text>Body text: the quick brown fox jumps over the lazy dog.</Text>
        <Text variant="caption" tone="muted">
          Caption · muted
        </Text>
        <Text variant="quote">“Well begun is half done.”</Text>
      </Card>

      <SectionHeader title={t('dev.buttons')} />
      <View style={styles.gap}>
        <Button title="Play now" icon="play" />
        <Button title="Secondary" variant="secondary" />
        <Button title="Outline" variant="outline" icon="people-outline" />
        <Button title="Ghost" variant="ghost" />
        <View style={styles.row}>
          <Button title="Danger" variant="danger" size="sm" fullWidth={false} />
          <Button title="Success" variant="success" size="sm" fullWidth={false} />
          <Button title="Loading" loading size="sm" fullWidth={false} />
        </View>
        <Button title="Disabled" disabled />
        <OrDivider />
        <SocialButton provider="google" onPress={() => undefined} />
        <SocialButton provider="facebook" onPress={() => undefined} />
        <SocialButton provider="google" loading onPress={() => undefined} />
      </View>

      <SectionHeader title={t('dev.cards')} />
      <Card variant="hero" padding="lg" style={styles.gap}>
        <Text variant="caption" tone="onPrimary" weight="bold">
          THIS WEEK
        </Text>
        <Text variant="display" tone="onPrimary">
          23 pts
        </Text>
        <Text tone="onPrimary">🔥 3-day streak</Text>
      </Card>
      <View style={styles.grid}>
        {SAMPLE_CATEGORIES.map((cat, i) => (
          <View key={cat.slug} style={styles.half}>
            <CategoryTile
              category={{ ...cat, children: cat.children as never }}
              onPress={() => undefined}
              index={i}
            />
          </View>
        ))}
      </View>
      <Card>
        <ListRow
          title="Sam"
          subtitle="Child · Member"
          leading={<Avatar avatar="fox" size={44} />}
          onPress={() => undefined}
        />
        <Divider />
        <ListRow
          title="Mom"
          subtitle="Adult · Admin"
          leading={<Avatar avatar="owl" size={44} ring />}
          trailing={<Badge label="Admin" tone="primary" />}
        />
      </Card>

      <SectionHeader title={t('dev.inputs')} />
      <Card style={styles.gap}>
        <TextField label="Email" placeholder="mom@example.com" keyboardType="email-address" />
        <TextField
          label="Password"
          password
          placeholder="••••••••"
          error="The password must be at least 8 characters."
        />
        <TextField label="Invite code" large placeholder="K7QM4XPA" autoCapitalize="characters" />
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'a', label: 'Today' },
            { value: 'b', label: 'Week' },
            { value: 'c', label: 'Month' },
          ]}
        />
        <ToggleRow
          label="Reduced motion"
          description="Fewer animations"
          value={toggle}
          onValueChange={setToggle}
        />
        <Stepper label="Difficulty" value={stepper} min={1} max={10} onChange={setStepper} />
      </Card>

      <SectionHeader title={t('dev.avatars')} />
      <Card>
        <View style={styles.avatars}>
          {AVATAR_KEYS.map((key, i) => (
            <Avatar key={key} avatar={key} size={52} ring={i === 0} />
          ))}
        </View>
      </Card>

      <SectionHeader title={t('dev.progress')} />
      <Card style={styles.gap}>
        <ProgressBar value={0.6} label="Target" valueLabel="6 / 10" />
        <View style={styles.rowBetween}>
          <Hearts total={3} lost={lives} />
          <Button
            title="−1 ♥"
            size="sm"
            variant="outline"
            fullWidth={false}
            onPress={() => setLives((l) => (l >= 3 ? 0 : l + 1))}
          />
        </View>
        <View style={styles.row}>
          <Badge label="Neutral" />
          <Badge label="Correct" tone="success" icon="checkmark" />
          <Badge label="Wrong" tone="danger" icon="close" />
          <Badge label="Locked" tone="warning" icon="star" />
          <Chip label="Chip" />
          <Chip label="Selected" selected />
        </View>
      </Card>

      <SectionHeader title={t('dev.play')} />
      <Card padding="lg">
        <MultipleChoice
          item={SAMPLE_MC}
          result={mcResult}
          onSubmit={(response) =>
            setMcResult({
              isCorrect: response.choice_id === 'a',
              correctResponse: { choice_id: 'a' },
              submitted: response,
            })
          }
        />
      </Card>
      {mcResult ? (
        <FeedbackPanel
          isCorrect={mcResult.isCorrect}
          correctText="Lima"
          explanation={null}
          pointsAwarded={mcResult.isCorrect ? 1 : 0}
          onContinue={() => setMcResult(null)}
        />
      ) : null}
      <Card padding="lg">
        <WisdomCard
          item={SAMPLE_WISDOM}
          result={wisdomResult}
          onSubmit={(response) =>
            setWisdomResult({
              isCorrect: response.choice_id === 'a',
              correctResponse: { choice_id: 'a' },
              submitted: response,
            })
          }
        />
      </Card>
      {wisdomResult ? (
        <Button title="Reset" variant="ghost" onPress={() => setWisdomResult(null)} />
      ) : null}
      <Segmented
        options={CHALLENGE_SAMPLES.map((sample, i) => ({
          value: i,
          label: `${sample.type.replace('_', ' ')}${
            (sample.payload as { variant?: string; size?: number }).variant
              ? ` · ${(sample.payload as { variant: string }).variant}`
              : (sample.payload as { size?: number }).size
                ? ` ${(sample.payload as { size: number }).size}×`
                : ''
          }`,
        }))}
        value={sample}
        onChange={setSample}
      />
      <ChallengeSample key={sample} item={CHALLENGE_SAMPLES[sample]} />

      <SectionHeader title={t('dev.celebration')} />
      <Card style={styles.center}>
        <Celebration key={celebrate} />
        <Text variant="heading" align="center">
          Target reached!
        </Text>
        <Button
          title="Replay"
          icon="refresh"
          fullWidth={false}
          onPress={() => setCelebrate((n) => n + 1)}
        />
      </Card>

      <SectionHeader title={t('dev.states')} />
      <Card>
        <Loading fill={false} label="Loading…" />
      </Card>
      <Card>
        <EmptyState
          title="No invites yet"
          body="Invite your family to play together."
          emoji="💌"
          icon="mail-outline"
        />
      </Card>
      <Card>
        <ErrorState error={new ApiError(0, 'offline', 'network_error')} onRetry={() => undefined} />
      </Card>

      {celebrate > 0 && theme.celebration === 'confetti' ? (
        <Confetti key={`c${celebrate}`} />
      ) : null}
    </Screen>
  );
}

/**
 * Dev-only theme preview (`/dev/themes`): flip theme, light/dark, text size and reduced motion
 * to judge every base component and the play visuals.
 */
export function ThemePreview() {
  const { t } = useTranslation();
  const [themeKey, setThemeKey] = useState<ThemeKey>('playful');
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');
  const [textScale, setTextScale] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  const controls = (
    <Card style={styles.gap}>
      <Overline>{t('dev.theme')}</Overline>
      <Segmented
        value={themeKey}
        onChange={setThemeKey}
        options={THEME_KEYS.map((k) => ({ value: k, label: t(`appearance.themes.${k}`) }))}
      />
      <Segmented
        value={scheme}
        onChange={setScheme}
        options={[
          { value: 'light', label: t('appearance.light'), icon: 'sunny-outline' },
          { value: 'dark', label: t('appearance.dark'), icon: 'moon-outline' },
        ]}
      />
      <Stepper
        label={t('appearance.textSize')}
        value={textScale}
        min={0.8}
        max={1.6}
        step={0.1}
        onChange={setTextScale}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <ToggleRow
        label={t('appearance.reducedMotion')}
        value={reducedMotion}
        onValueChange={setReducedMotion}
      />
    </Card>
  );

  return (
    <ThemeProvider
      themeKey={themeKey}
      schemePreference={scheme}
      textScale={textScale}
      reducedMotion={reducedMotion}>
      <PreviewBody key={`${themeKey}-${reducedMotion}`} controls={controls} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flexBasis: '46%', flexGrow: 1 },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  center: { alignItems: 'center', gap: 12 },
});
