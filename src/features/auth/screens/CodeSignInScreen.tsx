import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { LockoutNotice } from '@/features/auth/components/LockoutNotice';
import { useCodeSignIn } from '@/features/auth/hooks';
import { useLockout } from '@/features/auth/lockout';
import { CODE_LENGTH, normalizeCode } from '@/lib/code';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Screen, Text, TextField, useTheme } from '@/ui';

/**
 * Sign in on this device with a one-time code an admin issued (`POST /auth/code`). For members
 * who are already in a family but have no email login (children) — new phone, reinstall or
 * after a sign-out. Input is forgiving: case, spaces and dashes don't matter.
 */
export function CodeSignInScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const signIn = useCodeSignIn();
  const [code, setCode] = useState('');
  const errors = formErrors(signIn.error, t, ['code']);
  const lockout = useLockout(signIn.error);
  const ready = code.length === CODE_LENGTH && !lockout.locked;

  const submit = () => {
    if (ready && !signIn.isPending) signIn.mutate({ code });
  };

  return (
    <Screen title={t('codeSignIn.title')} subtitle={t('codeSignIn.subtitle')} back>
      <View style={styles.center}>
        <RNText style={styles.emoji}>{theme.emojiIcons ? '📲' : '🔐'}</RNText>
      </View>
      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={t('codeSignIn.codeLabel')}
          value={code}
          onChangeText={(v) => {
            setCode(normalizeCode(v));
            // Keep a running lock visible while typing; clear other errors.
            if (signIn.error && !lockout.locked) signIn.reset();
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          autoFocus
          placeholder="K7QM4XPA"
          large
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.field('code')}
          hint={t('codeSignIn.codeHint')}
        />
        {lockout.locked && lockout.countdown ? (
          <LockoutNotice countdown={lockout.countdown} hint={t('lockout.codeHint')}>
            <Button
              title={t('lockout.signInWithEmail')}
              variant="ghost"
              size="sm"
              icon="mail-outline"
              onPress={() => router.replace('/login')}
            />
          </LockoutNotice>
        ) : errors.general ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {errors.general}
          </Text>
        ) : null}
        <Button
          title={t('codeSignIn.submit')}
          icon="log-in-outline"
          size="lg"
          onPress={submit}
          loading={signIn.isPending}
          disabled={!ready}
        />
      </Card>
      <Text variant="caption" tone="muted" align="center">
        {t('codeSignIn.help')}
      </Text>
      <Button
        title={t('codeSignIn.newHere')}
        variant="ghost"
        icon="key-outline"
        onPress={() => router.replace('/join')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  emoji: { fontSize: 56 },
});
