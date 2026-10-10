import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return <Ionicons name={focused ? active : inactive} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = theme.colors;
  const tall = theme.touchTarget >= 56;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSubtle,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: theme.key === 'classic' ? c.borderStrong : c.border,
          borderTopWidth: theme.key === 'playful' ? 2 : theme.borderWidth,
          minHeight: tall ? 68 : undefined,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.bodyBold,
          fontSize: Math.round(theme.type.caption.size * (theme.key === 'classic' ? 0.95 : 0.85)),
        },
        tabBarIconStyle: tall ? { marginTop: 4 } : undefined,
        sceneStyle: { backgroundColor: c.background },
        animation: theme.reducedMotion ? 'none' : 'shift',
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: t('tabs.play'),
          tabBarIcon: tabIcon('game-controller', 'game-controller-outline'),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{ title: t('tabs.family'), tabBarIcon: tabIcon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
        }}
      />
    </Tabs>
  );
}
