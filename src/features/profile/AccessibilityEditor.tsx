import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { Accessibility, ThemeKey } from '@/api/types';
import {
  formatWorldHint,
  howToUnlockText,
  pickerWorlds,
  worldHint,
  worldTapAction,
  type World,
} from '@/features/worlds/catalog';
import { WorldThumbnail } from '@/features/worlds/WorldThumbnail';
import { usePreferences, type ColorSchemePreference } from '@/store/preferences';
import {
  Icon,
  PressableScale,
  Segmented,
  Text,
  ThemeProvider,
  ToggleRow,
  WORLD_ORDER,
  gridColumns,
  themes,
  useTheme,
  withAlpha,
} from '@/ui';

const TEXT_SCALES = [0.9, 1, 1.2, 1.4, 1.6] as const;
const MIN_OPTION = 128;
const GAP = 10;

type SoundChoice = 'auto' | 'on' | 'off';

interface WorldOptionProps {
  themeKey: ThemeKey | null;
  /** World shown for the "automatic" option (the policy default). */
  autoTheme: ThemeKey;
  selected: boolean;
  /** The catalog entry (undefined for "automatic"). */
  world?: World;
  onPress: () => void;
  schemePreference: ColorSchemePreference;
}

/**
 * One world in the picker: a live preview, its name and an audience hint (a label only). A
 * locked world stays visible: dimmed preview, lock badge and its unlock hint / progress.
 */
function WorldOption({
  themeKey,
  autoTheme,
  selected,
  world,
  onPress,
  schemePreference,
}: WorldOptionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const key = themeKey ?? autoTheme;
  const def = themes[key];
  const name = t(def.displayName);
  const label = themeKey ? name : t('appearance.automatic');
  const audience = t(`appearance.audience.${def.audience}`);
  const hint = world ? worldHint(world) : null;
  const hintText = hint ? formatWorldHint(hint, t) : null;

  return (
    <PressableScale
      onPress={onPress}
      haptic
      accessibilityRole="radio"
      accessibilityLabel={
        themeKey
          ? [
              name,
              t(`appearance.themeDescriptions.${themeKey}`),
              hintText ? `${t('worlds.locked')}, ${hintText}` : audience,
            ].join(', ')
          : `${label}, ${name}`
      }
      accessibilityState={{ checked: selected }}
      style={[
        styles.option,
        {
          borderRadius: theme.radius.md + 2,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: selected ? 3 : theme.borderWidth,
          backgroundColor: theme.colors.surface,
        },
      ]}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none">
        <View style={hint ? styles.dimmed : undefined}>
          <ThemeProvider
            themeKey={key}
            schemePreference={schemePreference}
            textScale={0.8}
            reducedMotion>
            <WorldThumbnail width={width} />
          </ThemeProvider>
        </View>
        {hint ? (
          <View
            style={[
              styles.lock,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}>
            <Icon name="lock-closed" size={16} color={theme.colors.text} />
          </View>
        ) : null}
        {selected ? (
          <View style={[styles.check, { backgroundColor: theme.colors.surface }]}>
            <Icon name="checkmark-circle" size={22} color={theme.colors.primary} />
          </View>
        ) : null}
      </View>
      <View style={styles.optionLabel}>
        <Text variant="label" weight="bold" numberOfLines={2}>
          {label}
        </Text>
        {hintText ? (
          <View style={styles.hintRow}>
            {hint?.kind === 'familyPlan' ? (
              <Icon name="star" size={12} color={theme.colors.accent} />
            ) : null}
            <Text variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
              {hintText}
            </Text>
          </View>
        ) : (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {themeKey ? audience : name}
          </Text>
        )}
        {hint?.kind === 'progress' ? (
          <View
            style={[
              styles.miniTrack,
              { backgroundColor: theme.colors.surfaceAlt, borderRadius: 999 },
            ]}>
            <View
              style={[
                styles.miniFill,
                {
                  width: `${Math.round(hint.ratio * 100)}%`,
                  backgroundColor: theme.colors.primary,
                  borderRadius: 999,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

interface AccessibilityEditorProps {
  value: Accessibility;
  onChange: (patch: Partial<Accessibility>) => void;
  /** The policy's `ui_theme` for this member (what "automatic" means). */
  autoTheme: ThemeKey;
  /** The policy's `accessibility_defaults.sound_effects` (what "automatic" means). */
  autoSound?: boolean;
  disabled?: boolean;
  /**
   * The member's world catalog (`GET /me/worlds` or the admin member variant): order + unlocks.
   * `null`/`undefined` (loading, or a backend without it) = every app world, unlocked.
   */
  worlds?: readonly World[] | null;
  /** The signed-in member may buy the Family plan (tapping a Family-plan world opens the paywall). */
  canPurchase?: boolean;
}

/**
 * World picker (live previews), sound effects, text size, reduced motion and calm timers.
 * Changing these never changes rules (content, ads, difficulty) — only the look and feel.
 */
export function AccessibilityEditor({
  value,
  onChange,
  autoTheme,
  autoSound,
  disabled,
  worlds,
  canPurchase = false,
}: AccessibilityEditorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const schemePreference = usePreferences((s) => s.colorScheme);
  const [gridWidth, setGridWidth] = useState(0);
  // Explanation for the last tapped locked world ("Earn 27 more points…", "Ask a parent…").
  const [lockInfo, setLockInfo] = useState<{ key: ThemeKey; text: string } | null>(null);
  const list = pickerWorlds(worlds, WORLD_ORDER);
  const storedLocked =
    value.theme !== null && list.some((w) => w.key === value.theme && !w.unlocked);

  const pressWorld = (world: World) => {
    const action = worldTapAction(world, canPurchase);
    if (action === 'select') {
      setLockInfo(null);
      onChange({ theme: world.key });
    } else if (action === 'paywall') {
      setLockInfo(null);
      router.push('/family-plan');
    } else {
      setLockInfo({
        key: world.key,
        text: howToUnlockText(world, t(themes[world.key].displayName), t),
      });
    }
  };
  const nearestScale = TEXT_SCALES.reduce((best, s) =>
    Math.abs(s - value.text_scale) < Math.abs(best - value.text_scale) ? s : best,
  );
  const columns = gridWidth ? gridColumns(gridWidth, MIN_OPTION, GAP, 4) : 2;
  const cell = gridWidth ? Math.floor((gridWidth - GAP * (columns - 1)) / columns) : undefined;
  const sound: SoundChoice =
    value.sound_effects == null ? 'auto' : value.sound_effects ? 'on' : 'off';

  return (
    <View style={{ gap: theme.spacing.md, opacity: disabled ? 0.6 : 1 }}>
      <Text variant="title">{t('appearance.worldTitle')}</Text>
      <View
        style={styles.grid}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('appearance.theme')}
        onLayout={(e: LayoutChangeEvent) => setGridWidth(Math.round(e.nativeEvent.layout.width))}>
        <View style={{ width: cell ?? '47%' }}>
          <WorldOption
            themeKey={null}
            autoTheme={autoTheme}
            selected={value.theme === null}
            onPress={() => {
              setLockInfo(null);
              onChange({ theme: null });
            }}
            schemePreference={schemePreference}
          />
        </View>
        {list.map((world) => (
          <View key={world.key} style={{ width: cell ?? '47%' }}>
            <WorldOption
              themeKey={world.key}
              autoTheme={autoTheme}
              selected={value.theme === world.key}
              world={world}
              onPress={() => pressWorld(world)}
              schemePreference={schemePreference}
            />
          </View>
        ))}
      </View>
      {lockInfo ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.note,
            { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
          ]}>
          <Icon name="lock-closed-outline" size={18} color={theme.colors.text} />
          <Text variant="caption" style={styles.flex}>
            {lockInfo.text}
          </Text>
        </View>
      ) : null}
      {storedLocked && value.theme ? (
        <Text variant="caption" tone="muted">
          {t('worlds.storedLocked', { name: t(themes[value.theme].displayName) })}
        </Text>
      ) : null}
      <View
        style={[
          styles.note,
          { backgroundColor: withAlpha(theme.colors.primary, 0.08), borderRadius: theme.radius.md },
        ]}>
        <Icon name="information-circle-outline" size={18} color={theme.colors.textMuted} />
        <Text variant="caption" tone="muted" style={styles.flex}>
          {t('appearance.lookOnly')}
        </Text>
      </View>

      <Text variant="label" tone="muted">
        {t('appearance.soundEffects')}
      </Text>
      <Segmented<SoundChoice>
        value={sound}
        onChange={(choice) =>
          onChange({ sound_effects: choice === 'auto' ? null : choice === 'on' })
        }
        options={[
          { value: 'auto', label: t('appearance.automatic'), icon: 'sparkles-outline' },
          { value: 'on', label: t('appearance.soundOn'), icon: 'volume-high-outline' },
          { value: 'off', label: t('appearance.soundOff'), icon: 'volume-mute-outline' },
        ]}
        accessibilityLabel={t('appearance.soundEffects')}
      />
      <Text variant="caption" tone="muted">
        {t('appearance.soundEffectsHint')}{' '}
        {sound === 'auto' && autoSound !== undefined
          ? autoSound
            ? t('appearance.soundAutoOn')
            : t('appearance.soundAutoOff')
          : null}
      </Text>

      <Text variant="label" tone="muted">
        {t('appearance.textSize')}
      </Text>
      <Segmented
        value={nearestScale}
        onChange={(text_scale) => onChange({ text_scale })}
        options={TEXT_SCALES.map((s) => ({ value: s, label: `${Math.round(s * 100)}%` }))}
        accessibilityLabel={t('appearance.textSize')}
      />
      <ToggleRow
        label={t('appearance.reducedMotion')}
        description={t('appearance.reducedMotionHint')}
        value={value.reduced_motion}
        onValueChange={(reduced_motion) => onChange({ reduced_motion })}
        icon="pause-circle-outline"
        disabled={disabled}
      />
      <ToggleRow
        label={t('appearance.calmTimers')}
        description={t('appearance.calmTimersHint')}
        value={value.calm_timers}
        onValueChange={(calm_timers) => onChange({ calm_timers })}
        icon="hourglass-outline"
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  option: { padding: 6, gap: 6, overflow: 'hidden' },
  dimmed: { opacity: 0.45 },
  lock: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniTrack: { height: 5, overflow: 'hidden', marginTop: 3 },
  miniFill: { height: 5 },
  check: { position: 'absolute', top: 6, right: 6, borderRadius: 999 },
  optionLabel: { gap: 1, paddingHorizontal: 4, paddingBottom: 2 },
  flex: { flex: 1 },
  note: { flexDirection: 'row', gap: 8, padding: 10, alignItems: 'flex-start' },
});
