import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useMe } from '@/features/auth/hooks';
import { useUpdateAccessibility } from '@/features/profile/hooks';
import { useSoundEffects } from '@/features/sound';
import type { World } from '@/features/worlds/catalog';
import { useMyWorlds } from '@/features/worlds/hooks';
import {
  loadSeenState,
  markCelebrated,
  nextSeenState,
  saveSeenState,
  sameSeenState,
  type WorldSeenState,
} from '@/features/worlds/unlockSeen';
import { WorldThumbnail } from '@/features/worlds/WorldThumbnail';
import { usePreferences } from '@/store/preferences';
import {
  Button,
  Card,
  Confetti,
  Text,
  ThemeProvider,
  isThemeKey,
  themes,
  useTheme,
  type ThemeKey,
} from '@/ui';

interface SheetProps {
  worldKey: ThemeKey;
  onTry: () => void;
  onLater: () => void;
}

/** "New world unlocked!": the world's live mini preview, its name, "Try it" and "Later". */
function WorldUnlockedSheet({ worldKey, onTry, onLater }: SheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const schemePreference = usePreferences((s) => s.colorScheme);
  const { play } = useSoundEffects();
  const [width, setWidth] = useState(0);
  const name = t(themes[worldKey].displayName);

  useEffect(() => {
    play('unlock');
  }, [play, worldKey]);

  return (
    <Modal
      visible
      transparent
      animationType={theme.reducedMotion ? 'none' : 'fade'}
      onRequestClose={onLater}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card padding="lg" style={styles.sheet}>
            <Text variant="title" accessibilityRole="header" style={styles.center}>
              {t('worlds.unlockedTitle')}
            </Text>
            <View
              onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none">
              <ThemeProvider themeKey={worldKey} schemePreference={schemePreference} reducedMotion>
                <WorldThumbnail width={width} height={150} />
              </ThemeProvider>
            </View>
            <Text variant="heading" weight="bold" style={styles.center}>
              {name}
            </Text>
            <Text tone="muted" style={styles.center}>
              {t('worlds.unlockedBody', { name })}
            </Text>
            <Button title={t('worlds.tryIt')} icon="sparkles" onPress={onTry} />
            <Button title={t('worlds.later')} variant="ghost" onPress={onLater} />
          </Card>
        </ScrollView>
        {/* The new world's own celebration (nothing with reduced motion or calm worlds). */}
        <ThemeProvider
          themeKey={worldKey}
          schemePreference={schemePreference}
          reducedMotion={theme.reducedMotion}>
          <Confetti />
        </ThemeProvider>
      </View>
    </Modal>
  );
}

/**
 * Celebrates a world that flipped from locked to unlocked for the signed-in member, once.
 * Mounted in the tabs layout: the catalog refetches after play (invalidated when a session ends
 * or points change) and on app focus; the sheet only shows while the tabs are on screen, so
 * never in the middle of a question.
 */
export function WorldUnlockWatcher() {
  const memberId = useMe().data?.member?.id ?? null;
  const worlds = useMyWorlds().data;
  const focused = useIsFocused();
  const updateA11y = useUpdateAccessibility();
  // Seen state tagged with its member, so a member switch never mixes two members' data.
  const [seen, setSeen] = useState<{ memberId: number; value: WorldSeenState | null } | null>(null);

  useEffect(() => {
    if (memberId === null) return;
    let live = true;
    void loadSeenState(memberId).then((value) => {
      if (live) setSeen({ memberId, value });
    });
    return () => {
      live = false;
    };
  }, [memberId]);

  const loaded = seen !== null && seen.memberId === memberId;
  const state = loaded ? seen.value : null;

  // Fold each fresh catalog into the seen state once (state adjusted during render, not in an
  // effect: https://react.dev/learn/you-might-not-need-an-effect).
  const [foldedFor, setFoldedFor] = useState<readonly World[] | null>(null);
  if (loaded && memberId !== null && worlds && worlds !== foldedFor) {
    setFoldedFor(worlds);
    const next = nextSeenState(state, worlds);
    if (!sameSeenState(state, next)) setSeen({ memberId, value: next });
  }

  // Persist every change (UI convenience only; never throws).
  useEffect(() => {
    if (seen?.value) void saveSeenState(seen.memberId, seen.value);
  }, [seen]);

  // Only worlds this app version can render are celebrated.
  const pendingKey = state?.pending.find(isThemeKey) ?? null;
  if (!focused || !pendingKey || memberId === null || !state) return null;

  const dismiss = () => {
    setSeen({ memberId, value: markCelebrated(state, pendingKey) });
  };

  return (
    <WorldUnlockedSheet
      key={pendingKey}
      worldKey={pendingKey}
      onTry={() => {
        updateA11y.mutate({ theme: pendingKey });
        dismiss();
      }}
      onLater={dismiss}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  sheet: { gap: 14, width: '100%', maxWidth: 420, alignSelf: 'center' },
  center: { textAlign: 'center' },
});
