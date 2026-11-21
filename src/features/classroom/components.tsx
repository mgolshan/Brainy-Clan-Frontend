import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useClassroom } from '@/features/classroom/hooks';
import { Card, EmptyState, ErrorState, Icon, Loading, Screen, Text, useTheme } from '@/ui';
import type { ClassroomState, Family } from '@/api/types';
import type { ScreenProps } from '@/ui';

/** Bullet line of a "what will happen" list: a cross for cleared, a tick for kept. */
export function OutcomeLine({ text, tone }: { text: string; tone: 'clear' | 'keep' }) {
  const theme = useTheme();
  return (
    <View style={[styles.line, { gap: theme.spacing.sm }]}>
      <Icon
        name={tone === 'clear' ? 'close-circle' : 'checkmark-circle'}
        color={tone === 'clear' ? theme.colors.danger : theme.colors.success}
      />
      <Text style={styles.flex}>{text}</Text>
    </View>
  );
}

/** A small "label / value" block for the hub's stats row. */
export function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { gap: 2, minWidth: 120 }]} accessible>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text weight="bold" style={{ fontSize: theme.type.bodyLarge.size }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Shared frame of every Classroom screen: loading / error, and "teachers only" when the viewer
 * isn't an admin of a Classroom. Renders `children(family, classroom)` otherwise.
 */
export function TeacherGate({
  title,
  width,
  footer,
  children,
}: {
  title: string;
  width?: ScreenProps['width'];
  footer?: ReactNode;
  children: (family: Family, classroom: ClassroomState) => ReactNode;
}) {
  const { t } = useTranslation();
  const { family, classroom } = useClassroom();
  if (family.isPending) return <Loading />;
  if (family.isError) {
    return (
      <Screen title={title} back>
        <ErrorState error={family.error} onRetry={() => void family.refetch()} />
      </Screen>
    );
  }
  if (!classroom) {
    return (
      <Screen title={title} back>
        <Card>
          <EmptyState title={t('classroom.teachersOnly')} icon="lock-closed-outline" emoji="🔒" />
        </Card>
      </Screen>
    );
  }
  return (
    <Screen title={title} subtitle={family.data.family.name} back width={width} footer={footer}>
      {children(family.data.family, classroom)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  stat: { flexGrow: 1, flexBasis: 0 },
});
