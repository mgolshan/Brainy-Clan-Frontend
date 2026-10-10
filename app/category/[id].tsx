import { useLocalSearchParams } from 'expo-router';

import { CategoryScreen } from '@/features/play/screens/CategoriesScreen';

export default function CategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CategoryScreen id={Number(id)} />;
}
