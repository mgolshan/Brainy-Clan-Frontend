import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { SocialSignIn } from '@/features/auth/social/SocialSignIn';
import { type SignupIntent, signupHref, useSignupIntent } from '@/features/onboarding/signupIntent';
import { useAppStatus } from '@/store/appStatus';
import { Appear, Button, Card, Screen, Text, useTheme, withAlpha } from '@/ui';

const HERO = ['🦉', '🦊', '🐼', '🦁'];

/**
 * Signed-out entry. "One sign-up, two doors": a parent creates a family, a teacher creates a
 * class (same account and register screen; the intent rides along, see `signupIntent.ts`). Or
 * sign in (email or Apple/Google/Facebook), or join with an invite / sign-in code. Those last
 * ones drop any stale sign-up intent.
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const accountDeleted = useAppStatus((s) => s.accountDeleted);
  const setAccountDeleted = useAppStatus((s) => s.setAccountDeleted);
  const chooseIntent = useSignupIntent((s) => s.choose);
  const clearIntent = useSignupIntent((s) => s.clear);
  const signUp = (intent: SignupIntent) => {
    chooseIntent(intent);
    router.push(signupHref(intent));
  };
  const go = (path: '/login' | '/join' | '/code') => {
    clearIntent();
    router.push(path);
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <Appear>
          <View style={[styles.logo, { backgroundColor: withAlpha(c.primary, 0.12) }]}>
            <RNText style={styles.logoEmoji}>🧠</RNText>
          </View>
        </Appear>
        <View style={styles.faces}>
          {HERO.map((emoji, i) => (
            <Appear key={emoji} index={i + 1}>
              <View
                style={[
                  styles.face,
                  { backgroundColor: withAlpha(c.categories[i % c.categories.length], 0.16) },
                ]}>
                <RNText style={styles.faceEmoji}>{emoji}</RNText>
              </View>
            </Appear>
          ))}
        </View>
        <Text variant="display" align="center">
          {t('app.title')}
        </Text>
        <Text variant="bodyLarge" tone="muted" align="center">
          {t('welcome.subtitle')}
        </Text>
      </View>

      {accountDeleted ? (
        <Card variant="tinted" tint={c.success} style={styles.actions}>
          <Text weight="bold" accessibilityLiveRegion="polite">
            {t('deletion.doneTitle')}
          </Text>
          <Text variant="caption" tone="muted">
            {t('deletion.doneBody')}
          </Text>
          <Button
            title={t('common.done')}
            variant="ghost"
            size="sm"
            onPress={() => setAccountDeleted(false)}
          />
        </Card>
      ) : null}

      <Card style={styles.actions} padding="lg">
        <Button
          title={t('welcome.createAccount')}
          icon="person-add-outline"
          size="lg"
          onPress={() => signUp('family')}
        />
        <Button
          title={t('welcome.createClass')}
          variant="outline"
          icon="school-outline"
          accessibilityHint={t('welcome.createClassHint')}
          onPress={() => signUp('classroom')}
        />
        <Button
          title={t('welcome.signIn')}
          variant="outline"
          icon="log-in-outline"
          onPress={() => go('/login')}
        />
        <SocialSignIn divider="top" onStart={clearIntent} />
        <Button
          title={t('welcome.joinWithCode')}
          variant="secondary"
          icon="key-outline"
          onPress={() => go('/join')}
        />
        <Button
          title={t('welcome.haveSignInCode')}
          variant="ghost"
          icon="phone-portrait-outline"
          onPress={() => go('/code')}
        />
        <Text variant="caption" tone="muted" align="center">
          {t('welcome.joinHint')}
        </Text>
      </Card>

      {/* Dev-only theme preview (the /dev routes are guarded by __DEV__ too). */}
      {__DEV__ ? (
        <Button
          title={t('dev.themesTitle')}
          variant="ghost"
          icon="color-palette-outline"
          onPress={() => router.push('/dev/themes')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 12, marginBottom: 8 },
  logo: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 52 },
  faces: { flexDirection: 'row', gap: 8 },
  face: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  faceEmoji: { fontSize: 24 },
  actions: { gap: 12 },
});
