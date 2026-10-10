import { getCalendars, getLocales } from 'expo-localization';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { useMe, useSignOut } from '@/features/auth/hooks';
import { useCreateFamily } from '@/features/family/hooks';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Chip, Screen, Text, TextField, useTheme } from '@/ui';

const QUICK_COUNTRIES = ['CA', 'US', 'FR', 'GB', 'BE', 'CH'] as const;

function defaultTimezone(): string {
  return getCalendars()[0]?.timeZone ?? 'America/Toronto';
}

function defaultCountry(): string {
  return (getLocales()[0]?.regionCode ?? 'CA').toUpperCase();
}

/** First step after sign-up: create the family (`POST /families`); the caller becomes admin. */
export function CreateFamilyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const create = useCreateFamily();
  const signOut = useSignOut();
  const [name, setName] = useState(
    me?.user.display_name ? t('createFamily.defaultName', { name: me.user.display_name }) : '',
  );
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [country, setCountry] = useState(defaultCountry);
  const errors = formErrors(create.error, t, ['name', 'timezone', 'country_code']);

  const ready = name.trim() && timezone.trim() && /^[A-Z]{2}$/.test(country);

  return (
    <Screen
      title={t('createFamily.title')}
      subtitle={t('createFamily.subtitle', { name: me?.user.display_name ?? '' })}>
      <View style={styles.center}>
        <RNText style={styles.emoji}>{theme.emojiIcons ? '🏡' : '🏠'}</RNText>
      </View>
      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={t('createFamily.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('createFamily.namePlaceholder')}
          error={errors.field('name')}
        />
        <TextField
          label={t('createFamily.timezone')}
          value={timezone}
          onChangeText={setTimezone}
          autoCapitalize="none"
          autoCorrect={false}
          hint={t('createFamily.timezoneHint')}
          error={errors.field('timezone')}
        />
        <Text variant="label" tone="muted">
          {t('createFamily.country')}
        </Text>
        <View style={styles.row}>
          {QUICK_COUNTRIES.map((code) => (
            <Chip
              key={code}
              label={t(`countries.${code}`)}
              selected={country === code}
              onPress={() => setCountry(code)}
            />
          ))}
        </View>
        <TextField
          label={t('createFamily.countryCode')}
          value={country}
          onChangeText={(v) =>
            setCountry(
              v
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, 2),
            )
          }
          autoCapitalize="characters"
          maxLength={2}
          error={errors.field('country_code')}
        />
        {errors.general ? <Text tone="danger">{errors.general}</Text> : null}
        <Button
          title={t('createFamily.submit')}
          icon="home-outline"
          size="lg"
          loading={create.isPending}
          disabled={!ready}
          onPress={() =>
            create.mutate({ name: name.trim(), timezone: timezone.trim(), country_code: country })
          }
        />
      </Card>
      <Button
        title={t('profile.signOut')}
        variant="ghost"
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  emoji: { fontSize: 56 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
