import { Stack } from 'expo-router';

import { useTheme } from '@/ui';

export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: theme.reducedMotion ? 'none' : 'default',
      }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="join" />
      <Stack.Screen name="code" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
