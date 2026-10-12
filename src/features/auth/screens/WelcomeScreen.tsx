import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { SocialSignIn } from '@/features/auth/social/SocialSignIn';
import { Appear, Button, Card, Screen, Text, useTheme, withAlpha } from '@/ui';

const HERO = ['🦉', '🦊', '🐼', '🦁'];

/**
 * Signed-out entry: create an account (parent), sign in (email or Google/Facebook), or join with
 * an invite / sign-in code.
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;

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

      <Card style={styles.actions} padding="lg">
        <Button
          title={t('welcome.createAccount')}
          icon="person-add-outline"
          size="lg"
          onPress={() => router.push('/register')}
        />
        <Button
          title={t('welcome.signIn')}
          variant="outline"
          icon="log-in-outline"
          onPress={() => router.push('/login')}
        />
        <SocialSignIn divider="top" />
        <Button
          title={t('welcome.joinWithCode')}
          variant="secondary"
          icon="key-outline"
          onPress={() => router.push('/join')}
        />
        <Button
          title={t('welcome.haveSignInCode')}
          variant="ghost"
          icon="phone-portrait-outline"
          onPress={() => router.push('/code')}
        />
        <Text variant="caption" tone="muted" align="center">
          {t('welcome.joinHint')}
        </Text>
      </Card>

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
