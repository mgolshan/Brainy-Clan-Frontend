import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { withAlpha } from '@/ui/components/Card';
import { Icon, type IconName } from '@/ui/components/Icon';
import { PressableScale } from '@/ui/components/PressableScale';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Leading emoji/character. */
  leading?: ReactNode;
  accessibilityLabel?: string;
}

/** Selectable pill. */
export function Chip({ label, selected, onPress, icon, leading, accessibilityLabel }: ChipProps) {
  const theme = useTheme();
  const c = theme.colors;
  const height = Math.max(40, Math.round(theme.touchTarget * 0.8));
  return (
    <PressableScale
      onPress={onPress}
      haptic
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        {
          minHeight: height,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.surface === 'outlined' ? theme.radius.md : theme.radius.pill,
          backgroundColor: selected
            ? theme.surface === 'chunky'
              ? c.primary
              : c.primarySoft
            : c.surface,
          borderColor: selected
            ? c.primary
            : theme.surface === 'outlined'
              ? c.borderStrong
              : c.border,
          borderWidth: selected && theme.surface !== 'chunky' ? 2 : theme.borderWidth,
          borderBottomWidth: theme.surface === 'chunky' ? 4 : undefined,
        },
      ]}>
      {leading}
      {icon ? (
        <Icon
          name={icon}
          size={theme.type.label.size + 2}
          color={selected ? (theme.surface === 'chunky' ? c.onPrimary : c.primary) : c.textMuted}
        />
      ) : null}
      <Text
        variant="label"
        weight={selected ? 'bold' : 'medium'}
        color={selected ? (theme.surface === 'chunky' ? c.onPrimary : c.primary) : c.text}>
        {label}
      </Text>
      {selected && theme.key === 'classic' ? (
        <Icon name="checkmark" size={18} color={c.primary} />
      ) : null}
    </PressableScale>
  );
}

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** Wrapping group of chips with single selection. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedProps<T>) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}>
      {options.map((o) => (
        <Chip
          key={String(o.value)}
          label={o.label}
          icon={o.icon}
          selected={o.value === value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IconName;
  disabled?: boolean;
}

/** Label + switch row, full-row tappable target. */
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  icon,
  disabled,
}: ToggleRowProps) {
  const theme = useTheme();
  const c = theme.colors;
  // Classic's paper-coloured knob vanishes on a dark card (only the track showed): on dark, the
  // off knob uses the text colour and the on knob the colour drawn on primary.
  const thumb =
    theme.key === 'classic'
      ? value
        ? c.onPrimary
        : theme.scheme === 'dark'
          ? c.text
          : c.surface
      : '#FFFFFF';
  // react-native-web colours the "on" knob with `activeThumbColor` (default teal), not
  // `thumbColor`; the prop is web-only, so it is passed only there.
  const webThumb = Platform.OS === 'web' ? { activeThumbColor: thumb } : null;
  return (
    <PressableScale
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={[styles.row, { minHeight: theme.touchTarget, gap: theme.spacing.sm }]}>
      {icon ? <Icon name={icon} color={c.textMuted} /> : null}
      <View style={styles.flex}>
        <Text weight="medium">{label}</Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: c.primary, false: c.borderStrong }}
        thumbColor={thumb}
        {...webThumb}
        ios_backgroundColor={c.borderStrong}
        importantForAccessibility="no"
      />
    </PressableScale>
  );
}

interface StepperProps {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  /** Shown when value is null. */
  emptyLabel?: string;
}

/** − value + control. */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  emptyLabel,
}: StepperProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  const size = Math.max(40, Math.round(theme.touchTarget * 0.85));
  const current = value ?? min;
  const round = (n: number) => Math.round(n * 100) / 100;
  const btn = (icon: IconName, next: number, disabled: boolean, a11y: string) => (
    <PressableScale
      onPress={() => onChange(round(next))}
      disabled={disabled}
      haptic
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={[
        styles.stepBtn,
        {
          width: size,
          height: size,
          borderRadius: theme.surface === 'outlined' ? theme.radius.md : size / 2,
          backgroundColor: c.surfaceAlt,
          borderColor: theme.surface === 'outlined' ? c.borderStrong : c.border,
          borderWidth: theme.borderWidth,
          opacity: disabled ? 0.4 : 1,
        },
      ]}>
      <Icon name={icon} color={c.text} />
    </PressableScale>
  );
  return (
    <View style={[styles.row, { minHeight: theme.touchTarget, gap: theme.spacing.sm }]}>
      <Text weight="medium" style={styles.flex}>
        {label}
      </Text>
      {btn(
        'remove',
        value === null ? min : current - step,
        value !== null && current - step < min,
        t('common.decrease'),
      )}
      <Text
        variant="title"
        style={[styles.stepValue, { minWidth: size + 8 }]}
        align="center"
        accessibilityLiveRegion="polite">
        {value === null ? (emptyLabel ?? '–') : format ? format(value) : String(value)}
      </Text>
      {btn(
        'add',
        value === null ? min : current + step,
        value !== null && current + step > max,
        t('common.increase'),
      )}
    </View>
  );
}

/** Section heading with an optional trailing action. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
      <Text variant="title" style={styles.flex}>
        {title}
      </Text>
      {action}
    </View>
  );
}

/** Soft colored circle holding an icon or emoji. */
export function IconBubble({
  children,
  color,
  size = 44,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
}) {
  const theme = useTheme();
  const tint = color ?? theme.colors.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius:
          theme.surface === 'outlined'
            ? theme.radius.md
            : theme.surface === 'glass'
              ? theme.radius.md
              : size / 2,
        backgroundColor: withAlpha(tint, theme.scheme === 'dark' ? 0.22 : 0.15),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  stepBtn: { alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontVariant: ['tabular-nums'] },
});
