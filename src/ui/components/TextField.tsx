import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/ui/components/Icon';
import { Text, fontFor } from '@/ui/components/Text';
import { useTheme } from '@/ui/ThemeProvider';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
  /** Adds a show/hide toggle and hides the text. */
  password?: boolean;
  /** Big centred monospace-ish entry (invite codes). */
  large?: boolean;
  /** With `multiline`: visible height in lines (the box grows with the text size). */
  minLines?: number;
}

/** Labeled, themed text input with error and hint text. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, password, large, minLines, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const c = theme.colors;

  const borderColor = error
    ? c.danger
    : focused
      ? c.primary
      : theme.surface === 'outlined'
        ? c.borderStrong
        : c.border;
  const typeStyle = large ? theme.type.heading : theme.type.bodyLarge;
  const multiline = !!rest.multiline;

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View
        style={[
          styles.field,
          multiline ? styles.fieldMultiline : null,
          {
            minHeight: large ? theme.touchTarget + 16 : theme.touchTarget,
            borderRadius: theme.vibe === 'kid' ? theme.radius.md : theme.radius.md,
            backgroundColor:
              theme.surface === 'glass' && theme.scheme === 'dark'
                ? 'rgba(255,255,255,0.05)'
                : c.surfaceAlt,
            borderColor,
            borderWidth: focused || error ? Math.max(2, theme.borderWidth) : theme.borderWidth,
            paddingHorizontal: theme.spacing.md,
          },
        ]}>
        <TextInput
          ref={ref}
          placeholderTextColor={c.textSubtle}
          selectionColor={c.primary}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          maxFontSizeMultiplier={1.4}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: c.text,
              fontFamily: large ? theme.fonts.display : fontFor(theme, 'bodyLarge', 'medium'),
              fontSize: typeStyle.size,
              letterSpacing: large ? 4 : 0,
              textAlign: large ? 'center' : 'auto',
            },
            multiline
              ? {
                  minHeight: Math.round(typeStyle.size * 1.45 * (minLines ?? 4)) + 20,
                  textAlignVertical: 'top',
                }
              : null,
          ]}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('common.showPassword') : t('common.hidePassword')}
            hitSlop={12}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldMultiline: { alignItems: 'stretch' },
  // minWidth 0: a web <input> otherwise keeps its intrinsic width and pushes the eye icon out.
  input: { flex: 1, minWidth: 0, paddingVertical: 10, outlineStyle: 'none' } as object,
});
