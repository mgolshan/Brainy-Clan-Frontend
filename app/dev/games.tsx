import { useLocalSearchParams } from 'expo-router';

import { GamesPreview } from '@/features/dev/GamesPreview';

/** Dev-only: /dev/games (guarded by __DEV__ in the root layout). `?world=jungle&game=2` preselects. */
export default function GamesPreviewRoute() {
  const { world, game } = useLocalSearchParams<{ world?: string; game?: string }>();
  return <GamesPreview world={world} game={game} />;
}
