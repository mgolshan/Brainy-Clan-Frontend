import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const c = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.background, borderTopColor: c.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home-outline') }}
      />
      <Tabs.Screen
        name="play"
        options={{ title: t('tabs.play'), tabBarIcon: tabIcon('game-controller-outline') }}
      />
      <Tabs.Screen
        name="family"
        options={{ title: t('tabs.family'), tabBarIcon: tabIcon('people-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person-circle-outline') }}
      />
    </Tabs>
  );
}
