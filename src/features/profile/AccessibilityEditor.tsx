import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { THEME_KEYS, type Accessibility, type ThemeKey } from '@/api/types';
import {
  Icon,
  PressableScale,
  Segmented,
  Text,
  ToggleRow,
  themes,
  useTheme,
  withAlpha,
} from '@/ui';

const TEXT_SCALES = [0.9, 1, 1.2, 1.4, 1.6] as const;

interface ThemeOptionProps {
  themeKey: ThemeKey | null;
  /** Theme shown for the "automatic" option (the policy default). */
  autoTheme: ThemeKey;
  selected: boolean;
  onPress: () => void;
}

/** A mini preview of a theme: its background, accent and heading font. */
function ThemeOption({ themeKey, autoTheme, selected, onPress }: ThemeOptionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const def = themes[themeKey ?? autoTheme];
  const scheme = def.preferredScheme ?? theme.scheme;
  const colors = def.colors[scheme];
  const label = themeKey ? t(`appearance.themes.${themeKey}`) : t('appearance.automatic');

  return (
    <PressableScale
      onPress={onPress}
      haptic
      accessibilityRole="radio"
      accessibilityLabel={
        themeKey ? `${label}, ${t(`appearance.themeDescriptions.${themeKey}`)}` : label
      }
      accessibilityState={{ checked: selected }}
      style={[
        styles.option,
        {
          borderRadius: theme.radius.md,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: selected ? 3 : theme.borderWidth,
          backgroundColor: theme.colors.surface,
        },
      ]}>
      <View
        style={[
          styles.swatch,
          { backgroundColor: colors.background, borderRadius: Math.max(4, def.radius.md - 4) },
        ]}>
        <RNText
          style={{ fontFamily: def.fonts.display, fontSize: 22, color: colors.text }}
          allowFontScaling={false}>
          Aa
        </RNText>
        <View style={styles.dots}>
          {[colors.primary, colors.secondary, colors.accent].map((color, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: color, borderRadius: def.radius.pill }]}
            />
          ))}
        </View>
        {/* In the corner of the preview, so the name gets the full width (e.g. "Automatique"). */}
        {selected ? (
          <View style={[styles.check, { backgroundColor: theme.colors.surface }]}>
            <Icon name="checkmark-circle" size={20} color={theme.colors.primary} />
          </View>
        ) : null}
      </View>
      <View style={styles.optionLabel}>
        <Text variant="label" weight="bold" numberOfLines={2} style={styles.flex}>
          {label}
        </Text>
      </View>
      {!themeKey ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {t(`appearance.themes.${autoTheme}`)}
        </Text>
      ) : null}
    </PressableScale>
  );
}

interface AccessibilityEditorProps {
  value: Accessibility;
  onChange: (patch: Partial<Accessibility>) => void;
  /** The policy's `ui_theme` for this member (what "automatic" means). */
  autoTheme: ThemeKey;
  disabled?: boolean;
}

/**
 * Theme picker, text size, reduced motion and calm timers. Changing these never changes rules
 * (content, ads, difficulty) — only the look.
 */
export function AccessibilityEditor({
  value,
  onChange,
  autoTheme,
  disabled,
}: AccessibilityEditorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const nearestScale = TEXT_SCALES.reduce((best, s) =>
    Math.abs(s - value.text_scale) < Math.abs(best - value.text_scale) ? s : best,
  );

  return (
    <View style={{ gap: theme.spacing.md, opacity: disabled ? 0.6 : 1 }}>
      <Text variant="label" tone="muted">
        {t('appearance.theme')}
      </Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {([null, ...THEME_KEYS] as (ThemeKey | null)[]).map((key) => (
          <View key={key ?? 'auto'} style={key ? styles.cell : styles.autoCell}>
            <ThemeOption
              themeKey={key}
              autoTheme={autoTheme}
              selected={value.theme === key}
              onPress={() => onChange({ theme: key })}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flexBasis: '30%', flexGrow: 1, minWidth: 96 },
  // Wider minimum: on a phone "Automatic" / "Automatique" gets a row of its own instead of
  // breaking mid-word.
  autoCell: { flexBasis: '30%', flexGrow: 1, minWidth: 150 },
  option: { padding: 8, gap: 6 },
  swatch: { height: 64, padding: 8, justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 14, height: 14 },
  check: { position: 'absolute', top: 4, right: 4, borderRadius: 999 },
  optionLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  note: { flexDirection: 'row', gap: 8, padding: 10, alignItems: 'flex-start' },
});
