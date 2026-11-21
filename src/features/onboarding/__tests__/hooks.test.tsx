import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Onboarding } from '@/api/types';
import {
  loadOnboarding,
  runId,
  useDismissOnboarding,
  useFtueRun,
  useMarkSteps,
} from '@/features/onboarding/hooks';

const mockPost = jest.fn();
jest.mock('@/api/client', () => ({
  ...jest.requireActual<object>('@/api/client'),
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));
jest.mock('@/features/auth/hooks', () => ({
  useMe: () => ({ data: { user: { id: 9 } } }),
}));

// Query notifications synchronously (inside act), not on a later timer.
notifyManager.setScheduler((cb) => cb());

let mounted: { renderer: ReactTestRenderer; client: QueryClient } | null = null;

const start: Onboarding = { steps: { welcome: null, tip_play: null }, dismissed_at: null };

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false, gcTime: Infinity },
      queries: { gcTime: Infinity },
    },
  });
  client.setQueryData(queryKeys.onboarding, start);
  const hooks: {
    mark?: ReturnType<typeof useMarkSteps>;
    dismiss?: ReturnType<typeof useDismissOnboarding>;
  } = {};
  function Probe() {
    hooks.mark = useMarkSteps();
    hooks.dismiss = useDismissOnboarding();
    return null;
  }
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  mounted = { renderer, client };
  const data = () => client.getQueryData<Onboarding | null>(queryKeys.onboarding);
  return { client, hooks, data };
}

afterEach(() => {
  if (mounted) {
    const { renderer, client } = mounted;
    act(() => renderer.unmount());
    client.clear();
    mounted = null;
  }
});

beforeEach(() => {
  mockPost.mockReset();
  useFtueRun.setState({ shown: [] });
});

describe('loadOnboarding', () => {
  it('parses the envelope', async () => {
    await expect(
      loadOnboarding(async () => ({ data: { steps: { welcome: 'x' }, dismissed_at: null } })),
    ).resolves.toEqual({ steps: { welcome: 'x' }, dismissed_at: null });
  });

  it('is null on an older server (404) so FTUE hides', async () => {
    await expect(
      loadOnboarding(async () => {
        throw new ApiError(404, 'Not found', 'not_found');
      }),
    ).resolves.toBeNull();
  });

  it('rethrows other failures (the query retries / stays hidden)', async () => {
    await expect(
      loadOnboarding(async () => {
        throw new ApiError(500, 'Oops', 'server_error');
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('useMarkSteps', () => {
  it('ticks the step at once, then takes the server object', async () => {
    let resolve!: (v: unknown) => void;
    mockPost.mockReturnValue(new Promise((r) => (resolve = r)));
    const { hooks, data } = setup();
    await act(async () => {
      hooks.mark!.mutate(['tip_play']);
    });
    expect(mockPost).toHaveBeenCalledWith('/me/onboarding/tip_play');
    expect(data()?.steps.tip_play).toEqual(expect.any(String)); // optimistic
    expect(useFtueRun.getState().shown).toContain(runId(9, 'tip_play'));
    await act(async () => {
      resolve({ data: { steps: { welcome: null, tip_play: 'server-time' }, dismissed_at: null } });
    });
    expect(data()?.steps.tip_play).toBe('server-time');
  });

  it("posts each key in order (welcome + what's new)", async () => {
    mockPost.mockResolvedValue({ data: { steps: {}, dismissed_at: null } });
    const { hooks } = setup();
    await act(async () => {
      hooks.mark!.mutate(['welcome', 'upgrade_family']);
    });
    expect(mockPost.mock.calls.map((c) => c[0])).toEqual([
      '/me/onboarding/welcome',
      '/me/onboarding/upgrade_family',
    ]);
  });

  it('hides FTUE when the server turns out not to have it (404)', async () => {
    mockPost.mockRejectedValue(new ApiError(404, 'Not found', 'not_found'));
    const { hooks, data } = setup();
    await act(async () => {
      hooks.mark!.mutate(['tip_play']);
    });
    expect(data()).toBeNull();
  });

  it('on another failure re-reads the server, but the tip stays shown for this run', async () => {
    mockPost.mockRejectedValue(new ApiError(0, 'offline', 'network_error'));
    const { client, hooks } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await act(async () => {
      hooks.mark!.mutate(['tip_play']);
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.onboarding });
    expect(useFtueRun.getState().shown).toContain(runId(9, 'tip_play'));
  });
});

describe('useDismissOnboarding', () => {
  it('hides the checklist optimistically', async () => {
    let resolve!: (v: unknown) => void;
    mockPost.mockReturnValue(new Promise((r) => (resolve = r)));
    const { hooks, data } = setup();
    await act(async () => {
      hooks.dismiss!.mutate();
    });
    expect(mockPost).toHaveBeenCalledWith('/me/onboarding/dismiss');
    expect(data()?.dismissed_at).toEqual(expect.any(String));
    await act(async () => {
      resolve({ data: { steps: {}, dismissed_at: 'server-time' } });
    });
    expect(data()?.dismissed_at).toBe('server-time');
  });
});
