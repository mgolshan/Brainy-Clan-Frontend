import { getCalendars, getLocales } from 'expo-localization';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { useMe, useSignOut } from '@/features/auth/hooks';
import { useCreateFamily } from '@/features/family/hooks';
import { useSignupIntent } from '@/features/onboarding/signupIntent';
import { createFamilyMinAgeMissed } from '@/lib/age';
import { formErrors } from '@/lib/formErrors';
import { Button, Card, Chip, EmptyState, Screen, Text, TextField, useTheme } from '@/ui';

const QUICK_COUNTRIES = ['CA', 'US', 'FR', 'GB', 'BE', 'CH'] as const;

function defaultTimezone(): string {
  return getCalendars()[0]?.timeZone ?? 'America/Toronto';
}

function defaultCountry(): string {
  return (getLocales()[0]?.regionCode ?? 'CA').toUpperCase();
}

/**
 * First step after sign-up: create the family (`POST /families`); the caller becomes admin and
 * owner. Owners must be 18+ (every plan): when the user's birth data (from `me`, no extra
 * request) says younger, or the server answers 403 `owner_too_young`, the form is replaced by an
 * explanation (ask a parent or teacher for an invite code) and Sign out. With the teacher
 * sign-up intent (`useSignupIntent`) it asks for a class name instead (same request; the family
 * starts on Free and the paywall opens next with Classroom selected).
 */
export function CreateFamilyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useMe().data;
  const create = useCreateFamily();
  const signOut = useSignOut();
  const teacher = useSignupIntent((s) => s.intent === 'classroom');
  // The suggested name follows the intent (it can load from storage after the first render)
  // until the user types their own.
  const [typedName, setName] = useState<string | null>(null);
  const suggested = me?.user.display_name
    ? t(teacher ? 'createFamily.defaultClassName' : 'createFamily.defaultName', {
        name: me.user.display_name,
      })
    : '';
  const name = typedName ?? suggested;
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [country, setCountry] = useState(defaultCountry);
  const errors = formErrors(create.error, t, ['name', 'timezone', 'country_code']);

  const ready = name.trim() && timezone.trim() && /^[A-Z]{2}$/.test(country);
  const minAgeMissed = createFamilyMinAgeMissed(me?.user, me?.policy.age, create.error);

  if (minAgeMissed !== null) {
    return (
      <Screen title={teacher ? t('createFamily.classTitle') : t('createFamily.title')}>
        <Card padding="lg">
          <EmptyState
            title={t('createFamily.tooYoungTitle')}
            body={t('createFamily.tooYoungBody', { age: minAgeMissed })}
            icon="people-outline"
          />
        </Card>
        <Button
          title={t('profile.signOut')}
          variant="outline"
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={teacher ? t('createFamily.classTitle') : t('createFamily.title')}
      subtitle={t(teacher ? 'createFamily.classSubtitle' : 'createFamily.subtitle', {
        name: me?.user.display_name ?? '',
      })}>
      <View style={styles.center} accessibilityElementsHidden importantForAccessibility="no">
        <RNText style={styles.emoji}>{teacher ? '🏫' : theme.emojiIcons ? '🏡' : '🏠'}</RNText>
      </View>
      <Card style={{ gap: 14 }} padding="lg">
        <TextField
          label={teacher ? t('createFamily.className') : t('createFamily.name')}
          value={name}
          onChangeText={setName}
          placeholder={
            teacher ? t('createFamily.classNamePlaceholder') : t('createFamily.namePlaceholder')
          }
          hint={teacher ? t('createFamily.classNameHint') : undefined}
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
          title={teacher ? t('createFamily.classSubmit') : t('createFamily.submit')}
          icon={teacher ? 'school-outline' : 'home-outline'}
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
