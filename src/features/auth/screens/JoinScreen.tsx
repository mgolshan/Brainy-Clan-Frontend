import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { useJoin } from '@/features/auth/hooks';
import { AcceptTerms } from '@/features/legal/components';
import { CODE_LENGTH, normalizeCode } from '@/lib/code';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Screen, Text, TextField, ToggleRow, useTheme } from '@/ui';

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
  const [accepted, setAccepted] = useState(false);
  const errors = formErrors(join.error, t, ['code', 'email', 'password', 'accept_terms']);

  const ready =
    code.length === CODE_LENGTH && (!withLogin || (email.trim() && password && accepted));

  const submit = () => {
    if (!ready) return;
    join.mutate(withLogin ? { code, email: email.trim(), password, accept_terms: true } : { code });
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
          onChangeText={(v) => setCode(normalizeCode(v))}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          placeholder="K7QM4XPA"
          large
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
            <AcceptTerms
              checked={accepted}
              onChange={setAccepted}
              error={errors.field('accept_terms')}
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
