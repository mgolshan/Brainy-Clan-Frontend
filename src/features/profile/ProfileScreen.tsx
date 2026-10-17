import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { AvatarKey } from '@/api/types';
import { API_URL, APP_VERSION } from '@/config/env';
import { useHealth } from '@/features/app/useHealth';
import { useMe, useSignOut } from '@/features/auth/hooks';
import { SignInMethods } from '@/features/auth/social/SignInMethods';
import { DevicesList } from '@/features/family/components/DevicesList';
import { PrivacySection } from '@/features/legal/PrivacySection';
import { useNotificationPreferences } from '@/features/notifications/hooks';
import { AccessibilityEditor } from '@/features/profile/AccessibilityEditor';
import { AvatarPicker } from '@/features/profile/AvatarPicker';
import { PasswordForm } from '@/features/profile/PasswordForm';
import { useUpdateAccessibility, useUpdateMe } from '@/features/profile/hooks';
import i18n, { supportedLanguages, type AppLanguage } from '@/i18n';
import { errorMessage } from '@/lib/errorMessage';
import { formErrors } from '@/lib/formErrors';
import { ageBandLabel } from '@/lib/labels';
import { usePreferences, type ColorSchemePreference } from '@/store/preferences';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  ListRow,
  Loading,
  Screen,
  SectionHeader,
  Segmented,
  Text,
  TextField,
  selectAccessibility,
  useTheme,
} from '@/ui';

const LANGUAGE_NAMES: Record<AppLanguage, string> = { en: 'English', fr: 'Français' };

/** Profile tab: avatar + name, appearance & accessibility, language, about, sign out. */
export function ProfileScreen() {
  const { t } = useTranslation();
  const me = useMe().data;
  const updateMe = useUpdateMe();
  const updateA11y = useUpdateAccessibility();
  const signOut = useSignOut();
  const health = useHealth();
  const theme = useTheme();
  // null = endpoint not deployed yet (404): hide the entry.
  const notificationPrefs = useNotificationPreferences();
  const colorScheme = usePreferences((s) => s.colorScheme);
  const setColorScheme = usePreferences((s) => s.setColorScheme);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.user.display_name ?? '');
  const [avatar, setAvatar] = useState<string | null>(me?.user.avatar ?? null);
  const errors = formErrors(updateMe.error, t, ['display_name', 'avatar']);

  if (!me) return <Loading />;
  const { user, member, policy } = me;
  const a11y = {
    ...selectAccessibility(policy, member),
    theme: member?.accessibility.theme ?? null,
  };

  const saveProfile = () =>
    updateMe.mutate(
      { display_name: name.trim(), ...(avatar ? { avatar: avatar as AvatarKey } : {}) },
      { onSuccess: () => setEditing(false) },
    );

  const changeLanguage = (lang: AppLanguage) => {
    void i18n.changeLanguage(lang);
    updateMe.mutate({ locale: lang });
  };

  return (
    <Screen title={t('tabs.profile')}>
      <Card padding="lg" style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar avatar={user.avatar} size={72} ring />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="title">{member?.nickname ?? user.display_name}</Text>
            {user.email ? (
              <Text variant="caption" tone="muted">
                {user.email}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Badge label={ageBandLabel(t, policy.age_band)} />
              {member?.role === 'admin' ? <Badge label={t('family.admin')} tone="primary" /> : null}
            </View>
          </View>
        </View>
        {editing ? (
          <View style={{ gap: 12 }}>
            <TextField
              label={t('forms.displayName')}
              value={name}
              onChangeText={setName}
              error={errors.field('display_name')}
            />
            <AvatarPicker value={avatar} onChange={setAvatar} />
            {errors.general ? <Text tone="danger">{errors.general}</Text> : null}
            <Button
              title={t('common.save')}
              icon="checkmark"
              loading={updateMe.isPending}
              disabled={!name.trim()}
              onPress={saveProfile}
            />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} />
          </View>
        ) : (
          <Button
            title={t('profile.edit')}
            variant="outline"
            icon="create-outline"
            onPress={() => {
              setName(user.display_name);
              setAvatar(user.avatar);
              setEditing(true);
            }}
          />
        )}
      </Card>

      {user.email ? (
        <>
          <SectionHeader title={t('password.title')} />
          <Card padding="lg">
            <PasswordForm email={user.email} hasPassword={member?.has_password ?? true} />
          </Card>
        </>
      ) : null}

      {/* Social sign-in is for bands that may self-register (adults); the policy decides. */}
      {policy.collect_email ? <SignInMethods /> : null}

      {member && notificationPrefs.data ? (
        <>
          <SectionHeader title={t('notifications.title')} />
          <Card padding="sm">
            <ListRow
              title={t('notifications.title')}
              subtitle={t('notifications.entryHint')}
              leading={<Icon name="notifications-outline" color={theme.colors.primary} />}
              onPress={() => router.push('/notifications')}
            />
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('profile.appearance')} />
      <Card padding="lg" style={{ gap: 14 }}>
        {member ? (
          <AccessibilityEditor
            value={a11y}
            autoTheme={policy.ui_theme}
            onChange={(patch) => updateA11y.mutate(patch)}
          />
        ) : (
          <Text tone="muted">{t('profile.appearanceNeedsFamily')}</Text>
        )}
        {updateA11y.error ? (
          <Text variant="caption" tone="danger">
            {errorMessage(updateA11y.error, t)}
          </Text>
        ) : null}
        <Divider />
        <Text variant="label" tone="muted">
          {t('appearance.colorMode')}
        </Text>
        <Segmented<ColorSchemePreference>
          value={colorScheme}
          onChange={setColorScheme}
          options={[
            { value: 'system', label: t('appearance.system'), icon: 'phone-portrait-outline' },
            { value: 'light', label: t('appearance.light'), icon: 'sunny-outline' },
            { value: 'dark', label: t('appearance.dark'), icon: 'moon-outline' },
          ]}
        />
        <Text variant="caption" tone="subtle">
          {t('appearance.colorModeHint')}
        </Text>
      </Card>

      <SectionHeader title={t('profile.language')} />
      <Card padding="lg">
        <Segmented<AppLanguage>
          value={
            (supportedLanguages as string[]).includes(i18n.language)
              ? (i18n.language as AppLanguage)
              : 'en'
          }
          onChange={changeLanguage}
          options={supportedLanguages.map((lang) => ({ value: lang, label: LANGUAGE_NAMES[lang] }))}
        />
      </Card>

      {member ? (
        <>
          <SectionHeader title={t('devices.myTitle')} />
          <DevicesList memberId={member.id} />
        </>
      ) : null}

      {/* Terms/privacy links, data export and account deletion (children: links only). */}
      <PrivacySection policy={policy} />

      <SectionHeader title={t('profile.about')} />
      <Card padding="sm">
        <ListRow title={t('profile.version')} subtitle={APP_VERSION} chevron={false} />
        <Divider />
        <ListRow
          title={t('home.backendStatus')}
          subtitle={`${health.isSuccess ? t('home.connected') : health.isPending ? t('home.checking') : t('home.notReachable')} · ${API_URL}`}
          chevron={false}
        />
        {__DEV__ ? (
          <>
            <Divider />
            <ListRow
              title={t('dev.themesTitle')}
              subtitle={t('dev.themesSubtitle')}
              onPress={() => router.push('/dev/themes')}
            />
          </>
        ) : null}
      </Card>

      <Button
        title={t('profile.signOut')}
        variant="danger"
        icon="log-out-outline"
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
    </Screen>
  );
}
