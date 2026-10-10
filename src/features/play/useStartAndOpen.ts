import { router } from 'expo-router';
import { useCallback } from 'react';

import { useStartSession } from '@/features/play/api';

/** Start a session for a category and open the play screen. */
export function useStartAndOpen() {
  const start = useStartSession();
  const open = useCallback(
    (categoryId: number, options: { replace?: boolean } = {}) => {
      start.mutate(categoryId, {
        onSuccess: (payload) => {
          const href = {
            pathname: '/play/[session]' as const,
            params: { session: String(payload.session.id) },
          };
          if (options.replace) router.replace(href);
          else router.push(href);
        },
      });
    },
    [start],
  );
  return { open, ...start };
}
