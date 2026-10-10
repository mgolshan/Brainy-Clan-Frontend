import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { Screen } from '@/ui/Screen';
import { fontSize, radius, spacing, useThemeColors } from '@/ui/theme';

/** Placeholder: joining a family with an invite code is not wired to the API yet. */
export default function JoinScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [code, setCode] = useState('');

  return (
    <Screen title={t('auth.joinTitle')}>
      <Text style={{ color: c.textMuted }}>{t('auth.joinHint')}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder={t('auth.codePlaceholder')}
        placeholderTextColor={c.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        style={[styles.input, { color: c.text, borderColor: c.border }]}
      />
      <Pressable
        disabled
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        style={[styles.button, { backgroundColor: c.brand }]}>
        <Text style={styles.buttonText}>{t('auth.joinButton')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    opacity: 0.5,
  },
  buttonText: { color: '#FFFFFF', fontSize: fontSize.body, fontWeight: '600' },
});
