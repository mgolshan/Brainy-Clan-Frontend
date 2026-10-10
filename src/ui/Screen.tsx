import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fontSize, spacing, useThemeColors } from '@/ui/theme';

interface ScreenProps {
  title: string;
  children?: ReactNode;
}

/** Basic themed screen container with a heading. */
export function Screen({ title, children }: ScreenProps) {
  const c = useThemeColors();
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          {title}
        </Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: fontSize.display, fontWeight: '700' },
});
