import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Button, Chip, Icon, Text, useTheme, withAlpha, type IconName } from '@/ui';

/**
 * Which games' "How to play" cards were dismissed on this device (game keys, no personal data;
 * kept across sign-outs like other UI preferences).
 */
interface SeenHintsState {
  seen: Record<string, true>;
  markSeen: (game: string) => void;
}

export const useSeenHints = create<SeenHintsState>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (game) => set((s) => (s.seen[game] ? s : { seen: { ...s.seen, [game]: true } })),
    }),
    {
      name: 'brainyclan.seen-hints',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seen: s.seen }),
    },
  ),
);

export interface HowToStep {
  icon: IconName;
  text: string;
}

/**
 * First-time "How to play" card of a game: a few illustrated steps and "Got it". Shown open the
 * first time on this device; afterwards a small "How to play" chip opens it again.
 */
export function HowToPlay({
  game,
  steps,
  hidden,
}: {
  game: string;
  steps: HowToStep[];
  /** After scoring: neither the card nor the chip. */
  hidden?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const seen = useSeenHints((s) => !!s.seen[game]);
  const [open, setOpen] = useState(false);
  if (hidden) return null;

  if (seen && !open) {
    return (
      <View style={styles.chipRow}>
        <Chip
          label={t('challenge.howTo.show')}
          icon="help-circle-outline"
          onPress={() => setOpen(true)}
        />
      </View>
    );
  }

  const close = () => {
    useSeenHints.getState().markSeen(game);
    setOpen(false);
  };
  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.card,
        {
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: withAlpha(c.primary, theme.scheme === 'dark' ? 0.16 : 0.08),
          borderColor: withAlpha(c.primary, 0.35),
        },
      ]}>
      <Text variant="label" weight="bold" accessibilityRole="header">
        {t('challenge.howTo.title')}
      </Text>
      {steps.map((step, i) => (
        <View key={i} style={[styles.step, { gap: theme.spacing.sm }]}>
          <View
            style={[
              styles.bubble,
              {
                width: Math.round(theme.touchTarget * 0.7),
                height: Math.round(theme.touchTarget * 0.7),
                borderRadius: theme.touchTarget,
                backgroundColor: c.surface,
                borderColor: withAlpha(c.primary, 0.4),
              },
            ]}>
            <Icon name={step.icon} size={Math.round(theme.touchTarget * 0.38)} color={c.primary} />
          </View>
          <Text style={styles.flex}>{step.text}</Text>
        </View>
      ))}
      <Button
        title={t('challenge.howTo.gotIt')}
        icon="thumbs-up-outline"
        size="sm"
        variant="secondary"
        fullWidth={false}
        style={styles.gotIt}
        onPress={close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', justifyContent: 'center' },
  card: { borderWidth: 1 },
  step: { flexDirection: 'row', alignItems: 'center' },
  bubble: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  flex: { flex: 1 },
  gotIt: { alignSelf: 'flex-end' },
});
