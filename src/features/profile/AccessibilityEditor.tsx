import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { Accessibility, ThemeKey } from '@/api/types';
import { usePreferences, type ColorSchemePreference } from '@/store/preferences';
import {
  Button,
  Card,
  Icon,
  PressableScale,
  ProgressBar,
  SceneView,
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
const PREVIEW_H = 120;
const MIN_OPTION = 128;
const GAP = 10;

type SoundChoice = 'auto' | 'on' | 'off';

/** Live miniature of the active (nested) world: its scene, a card and a button. Static. */
const WorldThumbnail = memo(function WorldThumbnail({ width }: { width: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.thumb,
        {
          height: PREVIEW_H,
          backgroundColor: theme.colors.background,
          borderRadius: Math.max(8, theme.radius.md - 2),
        },
      ]}>
      <SceneView width={width} height={PREVIEW_H} animated={false} />
      <View style={[styles.thumbContent, { gap: 8 }]}>
        <Card padding="xs" plain style={styles.thumbCard}>
          <Text variant="caption" weight="bold" numberOfLines={1}>
            {t('appearance.previewTitle')}
          </Text>
          <ProgressBar value={0.6} />
        </Card>
        <Button
          title={t('appearance.previewButton')}
          size="sm"
          icon="play"
          fullWidth={false}
          tapSound={false}
          accessibilityLabel=""
        />
      </View>
    </View>
  );
});

interface WorldOptionProps {
  themeKey: ThemeKey | null;
  /** World shown for the "automatic" option (the policy default). */
  autoTheme: ThemeKey;
  selected: boolean;
  onPress: () => void;
  schemePreference: ColorSchemePreference;
}

/** One world in the picker: a live preview, its name and an audience hint (a label only). */
function WorldOption({
  themeKey,
  autoTheme,
  selected,
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
  const hint = t(`appearance.audience.${def.audience}`);

  return (
    <PressableScale
      onPress={onPress}
      haptic
      accessibilityRole="radio"
      accessibilityLabel={
        themeKey
          ? `${name}, ${t(`appearance.themeDescriptions.${themeKey}`)}, ${hint}`
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
        <ThemeProvider
          themeKey={key}
          schemePreference={schemePreference}
          textScale={0.8}
          reducedMotion>
          <WorldThumbnail width={width} />
        </ThemeProvider>
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
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {themeKey ? hint : name}
        </Text>
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
}: AccessibilityEditorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const schemePreference = usePreferences((s) => s.colorScheme);
  const [gridWidth, setGridWidth] = useState(0);
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
        {([null, ...WORLD_ORDER] as (ThemeKey | null)[]).map((key) => (
          <View key={key ?? 'auto'} style={{ width: cell ?? '47%' }}>
            <WorldOption
              themeKey={key}
              autoTheme={autoTheme}
              selected={(value.theme ?? null) === key}
              onPress={() => onChange({ theme: key })}
              schemePreference={schemePreference}
            />
          </View>
        ))}
      </View>
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
  thumb: { overflow: 'hidden' },
  thumbContent: { flex: 1, padding: 10, justifyContent: 'center' },
  thumbCard: { gap: 6 },
  check: { position: 'absolute', top: 6, right: 6, borderRadius: 999 },
  optionLabel: { gap: 1, paddingHorizontal: 4, paddingBottom: 2 },
  flex: { flex: 1 },
  note: { flexDirection: 'row', gap: 8, padding: 10, alignItems: 'flex-start' },
});
