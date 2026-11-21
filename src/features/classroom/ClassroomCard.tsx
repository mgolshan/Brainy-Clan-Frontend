import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { Family } from '@/api/types';
import { useIsAdmin } from '@/features/auth/hooks';
import { nextSetupStep, setupSteps, teacherClassroom } from '@/features/classroom/model';
import { useLegal } from '@/features/legal/hooks';
import { Card, Icon, ListRow, useTheme } from '@/ui';

/**
 * Family tab entry to the Classroom tools, for teachers (admins) of a Classroom only. The
 * subtitle names the next setup step until the class is set up.
 */
export function ClassroomCard({ family }: { family: Family }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isAdmin = useIsAdmin();
  const legal = useLegal();
  const classroom = teacherClassroom(family, isAdmin);
  if (!classroom) return null;
  const next = nextSetupStep(setupSteps(classroom, legal.data?.classroom_consent?.version));
  return (
    <Card padding="sm" variant={next ? 'tinted' : 'default'} tint={theme.colors.primary}>
      <ListRow
        title={t('classroom.cardTitle')}
        subtitle={
          next
            ? t(`classroom.cardNext.${next}`)
            : t('classroom.cardStudents', { count: classroom.students_count })
        }
        leading={<Icon name="school-outline" color={theme.colors.primary} />}
        onPress={() => router.push('/classroom')}
      />
    </Card>
  );
}
