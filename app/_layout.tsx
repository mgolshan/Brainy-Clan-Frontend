import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { clearPrivateQueries } from '@/api/clearPrivateQueries';
import { queryClient, wireQueryClientToDevice } from '@/api/queryClient';
import { useChallengeDrafts } from '@/challenges/drafts';
import { AppThemeProvider } from '@/features/app/AppThemeProvider';
import { useMinVersionGate } from '@/features/app/useHealth';
import { initMonitoring, setMonitoringMember, withMonitoring } from '@/features/app/sentry';
import { useLocaleSync } from '@/features/app/useLocaleSync';
import { useMe } from '@/features/auth/hooks';
import { configureNotifications } from '@/features/notifications/push';
import { useNotificationDeepLinks, usePushRegistration } from '@/features/notifications/usePush';
import { useAnswerQueue, useAnswerQueueSync } from '@/features/play/answerQueue';
import { useAppStatus } from '@/store/appStatus';
import { useSession } from '@/store/session';
import { ErrorState, Loading, useTheme } from '@/ui';
import { themeFonts } from '@/ui/themes/fonts';

// Error monitoring first, so startup errors are caught (no-op without EXPO_PUBLIC_SENTRY_DSN).
initMonitoring();

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Web social sign-in: when this page is the provider's popup returning to /oauth-callback, hand
// the result to the opener window and close (no-op otherwise).
if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();

// Foreground banners for pushes (no-op on web, in Expo Go and without an EAS project).
configureNotifications();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(themeFonts);

  useEffect(() => {
    wireQueryClientToDevice();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hide();
  }, [fontsLoaded, fontError]);

  // Keep the native splash up until the fonts are ready (falls back to system fonts on error).
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <RootNavigator />
        </AppThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Auth guard routing. Exactly one group is reachable at a time:
 * update required → update screen; signed out → (auth); signed in without a family →
 * (onboarding); signed in with a family → tabs + play/family screens.
 */
function RootNavigator() {
  const theme = useTheme();
  const { t } = useTranslation();
  const hydrated = useSession((s) => s.hydrated);
  const token = useSession((s) => s.token);
  const me = useMe();
  const updateFlag = useAppStatus((s) => s.updateRequired);
  const minVersionGate = useMinVersionGate();

  useLocaleSync(me.data?.user.locale);

  // Monitoring knows only the member id (never names), and forgets it on sign-out.
  const memberId = token ? (me.data?.member?.id ?? null) : null;
  useEffect(() => setMonitoringMember(memberId), [memberId]);
  useAnswerQueueSync(!!token);

  // Drop the account's cached server responses (and queued answers) once the token disappears.
  // Nothing to drop on a signed-out start: clearing then would also cancel the public
  // `/health` and `/legal` requests already in flight (see `clearPrivateQueries`).
  const hadToken = useRef(false);
  useEffect(() => {
    if (token) {
      hadToken.current = true;
      return;
    }
    if (!hadToken.current) return;
    hadToken.current = false;
    clearPrivateQueries(queryClient);
    useAnswerQueue.getState().clear();
    useChallengeDrafts.getState().clear();
  }, [token]);

  const navTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.tabBar,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [theme]);

  const updateRequired = updateFlag || minVersionGate;
  const signedIn = !!token;
  const hasFamily = !!me.data?.family;
  const waitingForMe = signedIn && !me.data;
  // B9: adults re-accept updated Terms / Privacy Policy before anything else (`me.legal` is
  // absent on older backends = nothing to accept; children never see it).
  const needsLegal =
    signedIn && me.data?.legal?.needs_acceptance === true && !me.data.policy.is_child;

  usePushRegistration(signedIn);
  useNotificationDeepLinks(hydrated && !updateRequired && signedIn && hasFamily && !needsLegal);

  let blocking: ReactNode = null;
  if (!hydrated || (waitingForMe && me.isPending)) {
    blocking = <Loading label={t('common.loading')} />;
  } else if (waitingForMe && me.isError && !updateRequired) {
    blocking = <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  }

  return (
    <NavThemeProvider value={navTheme}>
      {blocking ? (
        <View style={[styles.flex, styles.center, { backgroundColor: theme.colors.background }]}>
          {blocking}
        </View>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: theme.reducedMotion ? 'none' : 'default',
          }}>
          <Stack.Protected guard={updateRequired}>
            <Stack.Screen name="update-required" />
          </Stack.Protected>
          <Stack.Protected guard={!updateRequired && !signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={!updateRequired && needsLegal}>
            <Stack.Screen name="legal-update" />
          </Stack.Protected>
          <Stack.Protected guard={!updateRequired && signedIn && !needsLegal && !hasFamily}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={!updateRequired && signedIn && !needsLegal && hasFamily}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="play/[session]" options={{ gestureEnabled: false }} />
            <Stack.Screen name="category/[id]" />
            <Stack.Screen name="member/[id]" />
            <Stack.Screen name="invite" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sign-in-code/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="goals/index" />
            <Stack.Screen name="goals/[id]" />
            <Stack.Screen name="goals/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="member-notifications/[id]" />
            <Stack.Screen name="delete-account" />
            <Stack.Screen name="delete-family" />
            <Stack.Screen name="family-plan" />
          </Stack.Protected>
          <Stack.Screen name="oauth-callback" />
          <Stack.Protected guard={__DEV__}>
            <Stack.Screen name="dev/themes" />
          </Stack.Protected>
        </Stack>
      )}
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default withMonitoring(RootLayout);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
});
