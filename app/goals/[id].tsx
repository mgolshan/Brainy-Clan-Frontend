import { useLocalSearchParams } from 'expo-router';

import { GoalDetailScreen } from '@/features/goals/screens/GoalDetailScreen';

export default function GoalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GoalDetailScreen id={Number(id)} />;
}
