import { useLocalSearchParams } from 'expo-router';

import { PlayScreen } from '@/features/play/screens/PlayScreen';

export default function PlayRoute() {
  const { session } = useLocalSearchParams<{ session: string }>();
  return <PlayScreen key={session} sessionId={Number(session)} />;
}
