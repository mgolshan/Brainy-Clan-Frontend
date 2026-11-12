import { useLocalSearchParams } from 'expo-router';

import { GoalEditScreen } from '@/features/goals/screens/GoalWizardScreen';

export default function GoalEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GoalEditScreen id={Number(id)} />;
}
