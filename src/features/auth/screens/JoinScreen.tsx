import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { useJoin } from '@/features/auth/hooks';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Screen, Text, TextField, ToggleRow, useTheme } from '@/ui';

const CODE_ALPHABET = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

/**
 * Join a family with an invite code (`POST /auth/join`). Children only type the code. An adult
 * invitee may switch on "set an email login"; the server accepts email/password only when the
 * invite's age band allows it and answers 422 otherwise — the app does not guess from ages.
 */
export function JoinScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const join = useJoin();
  const [code, setCode] = useState('');
  const [withLogin, setWithLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const errors = formErrors(join.error, t, ['code', 'email', 'password']);

  const ready = code.length >= 8 && (!withLogin || (email.trim() && password));

  const submit = () => {
    if (!ready) return;
    join.mutate(withLogin ? { code, email: email.trim(), password } : { code });
  };

  return (
    <Screen title={t('join.title')} subtitle={t('join.subtitle')} back>
      <View style={styles.center}>
        <RNText style={styles.emoji}>{theme.emojiIcons ? '🎟️' : '🔑'}</RNText>
      </View>
      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={t('join.codeLabel')}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(CODE_ALPHABET, '').slice(0, 8))}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          placeholder="K7QM4XPA"
          large
          maxLength={8}
          error={errors.field('code')}
          hint={t('join.codeHint')}
        />
        <ToggleRow
          label={t('join.withLogin')}
          description={t('join.withLoginHint')}
          value={withLogin}
          onValueChange={setWithLogin}
          icon="mail-outline"
        />
        {withLogin ? (
          <>
            <TextField
              label={t('forms.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={errors.field('email')}
            />
            <TextField
              label={t('forms.password')}
              value={password}
              onChangeText={setPassword}
              password
              autoComplete="new-password"
              hint={t('register.passwordHint')}
              error={errors.field('password')}
            />
          </>
        ) : null}
        {errors.general ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {errors.general}
          </Text>
        ) : null}
        <Button
          title={t('join.submit')}
          icon="enter-outline"
          size="lg"
          onPress={submit}
          loading={join.isPending}
          disabled={!ready}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  emoji: { fontSize: 56 },
});
