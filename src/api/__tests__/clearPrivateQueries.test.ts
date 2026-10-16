import { QueryClient } from '@tanstack/react-query';

import { clearPrivateQueries } from '@/api/clearPrivateQueries';
import { isPublicQueryKey, queryKeys } from '@/api/queryKeys';

describe('isPublicQueryKey', () => {
  it('treats health and legal (any language) as public', () => {
    expect(isPublicQueryKey(queryKeys.health)).toBe(true);
    expect(isPublicQueryKey(queryKeys.legal)).toBe(true);
    expect(isPublicQueryKey([...queryKeys.legal, 'fr'])).toBe(true);
  });

  it('treats account data as private', () => {
    expect(isPublicQueryKey(queryKeys.me)).toBe(false);
    expect(isPublicQueryKey(queryKeys.family)).toBe(false);
    expect(isPublicQueryKey(queryKeys.invitePreview(2017, 3))).toBe(false);
    expect(isPublicQueryKey(queryKeys.goal(1))).toBe(false);
    expect(isPublicQueryKey([])).toBe(false);
  });
});

describe('clearPrivateQueries', () => {
  it('drops account data and keeps public queries', () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.health, { status: 'ok' });
    client.setQueryData([...queryKeys.legal, 'en'], { terms: {} });
    client.setQueryData(queryKeys.me, { user: {} });
    client.setQueryData(queryKeys.meStats, { points_total: 1 });
    client.setQueryData(queryKeys.goal(4), { id: 4 });

    clearPrivateQueries(client);

    const left = client
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(left).toEqual([queryKeys.health, [...queryKeys.legal, 'en']]);
    client.clear();
  });

  it('does not cancel an in-flight public request', async () => {
    const client = new QueryClient();
    let aborted = false;
    const pending = client.fetchQuery({
      queryKey: queryKeys.health,
      queryFn: ({ signal }) =>
        new Promise<string>((resolve) => {
          signal.addEventListener('abort', () => {
            aborted = true;
          });
          setTimeout(() => resolve('ok'), 5);
        }),
    });

    clearPrivateQueries(client);

    await expect(pending).resolves.toBe('ok');
    expect(aborted).toBe(false);
    client.clear();
  });
});
