import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '@/api/client';
import type { SupportMessage } from '@/api/types';
import { fetchSupportMessages, postSupportMessage } from '@/features/support/api';
import { ContactSupportScreen, SupportMessageRow } from '@/features/support/ContactSupportScreen';
import { clearSupportDraft, useSupportDraft } from '@/features/support/draft';
import { SupportEntry } from '@/features/support/SupportEntry';
import { ThemeProvider, WORLD_ORDER, type ThemeKey } from '@/ui';

// The shared Reanimated mock has no `useReducedMotion` (used by ThemeProvider).
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('@/ui/components/Icon', () => ({ Icon: () => null }));
jest.mock('@/ui/scenes', () => ({
  SceneBackground: () => null,
  SceneView: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));
jest.mock('expo-device', () => ({ modelName: 'iPad Air', osName: 'iPadOS', osVersion: '18.1' }));
// `t` returns the key (+ interpolation values), so the test sees which string was chosen.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values && Object.keys(values).some((k) => k !== 'defaultValue')
        ? `${key} ${JSON.stringify(values)}`
        : key,
    i18n: { language: 'en' },
  }),
}));
jest.mock('@/features/support/api', () => ({
  fetchSupportMessages: jest.fn(),
  postSupportMessage: jest.fn(),
}));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuid}` }));

const mockAuth = { isAdmin: true, isChild: false, email: 'mom@example.com' as string | null };
jest.mock('@/features/auth/hooks', () => ({
  useIsAdmin: () => mockAuth.isAdmin,
  useMe: () => ({
    data: {
      user: { id: 7, email: mockAuth.email },
      member: { role: mockAuth.isAdmin ? 'admin' : 'member' },
      policy: { is_child: mockAuth.isChild },
    },
  }),
}));

const list = fetchSupportMessages as jest.MockedFunction<typeof fetchSupportMessages>;
const post = postSupportMessage as jest.MockedFunction<typeof postSupportMessage>;

const msg = (over: Partial<SupportMessage> = {}): SupportMessage => ({
  id: 12,
  topic: 'billing',
  message: 'My Family plan shows Free after renewing.\nSecond line',
  status: 'open',
  created_at: '2026-11-08T14:03:00Z',
  answered_at: null,
  ...over,
});

const mounted: { tree: ReactTestRenderer; client: QueryClient }[] = [];

function render(
  ui: ReactNode,
  themeKey: ThemeKey = 'modern',
  scheme: 'light' | 'dark' = 'light',
  textScale = 1,
): ReactTestRenderer {
  // gcTime Infinity: no garbage-collection timers left running after the test.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(
      <QueryClientProvider client={client}>
        <ThemeProvider
          themeKey={themeKey}
          schemePreference={scheme}
          textScale={textScale}
          reducedMotion={scheme === 'dark'}>
          {ui}
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
  mounted.push({ tree: tree!, client });
  return tree!;
}

/** Every string rendered (Text children flattened). */
function texts(tree: ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object' && 'children' in node)
      walk((node as { children: unknown }).children);
  };
  walk(tree.toJSON());
  return out.join(' | ');
}

const byTestId = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.type !== 'string');
const flush = () =>
  act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
/** Flushes until `check` passes (queries resolve after a few ticks). */
async function waitFor(check: () => void, tries = 20) {
  for (let i = 0; ; i++) {
    try {
      check();
      return;
    } catch (error) {
      if (i >= tries) throw error;
      await flush();
    }
  }
}
/** Runs a state change (store update, press) and lets React and the queries settle. */
const run = async (fn: () => void) => {
  await act(async () => {
    fn();
  });
  await flush();
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUuid = 0;
  mockAuth.isAdmin = true;
  mockAuth.isChild = false;
  mockAuth.email = 'mom@example.com';
  clearSupportDraft();
});

afterEach(() => {
  for (const { tree, client } of mounted.splice(0)) {
    act(() => tree.unmount());
    client.clear();
  }
});

describe('SupportEntry (Profile)', () => {
  it('shows "Contact support" to admins', () => {
    const onPress = jest.fn();
    const tree = render(<SupportEntry isAdmin isChild={false} onPress={onPress} />);
    expect(texts(tree)).toContain('support.entryTitle');
    expect(byTestId(tree, 'support-ask-admin')).toHaveLength(0);
  });

  it('tells other members to ask a family admin', () => {
    const tree = render(<SupportEntry isAdmin={false} isChild={false} onPress={jest.fn()} />);
    expect(texts(tree)).toContain('support.askAdmin');
    expect(texts(tree)).not.toContain('support.entryTitle');
  });

  it('tells children to ask a parent', () => {
    const tree = render(<SupportEntry isAdmin={false} isChild onPress={jest.fn()} />);
    expect(texts(tree)).toContain('support.askParent');
  });
});

describe('SupportMessageRow', () => {
  it.each([
    ['open', 'support.status.open'],
    ['answered', 'support.status.answered'],
    ['closed', 'support.status.closed'],
  ])('%s shows %s', (status, label) => {
    const tree = render(
      <SupportMessageRow
        message={msg({
          status,
          answered_at: status === 'open' ? null : '2026-11-09T10:00:00Z',
        })}
      />,
    );
    const shown = texts(tree);
    expect(shown).toContain(label);
    expect(shown).toContain('support.topics.billing');
    expect(shown).toContain('My Family plan shows Free after renewing.');
    expect(shown).not.toContain('Second line');
  });
});

describe('ContactSupportScreen', () => {
  it('admin: form, reply note with the account email, message list', async () => {
    list.mockResolvedValue([msg()]);
    const tree = render(<ContactSupportScreen />);
    await flush();
    const shown = texts(tree);
    expect(shown).toContain('support.topicLabel');
    expect(shown).toContain('support.replyNote {"email":"mom@example.com"}');
    expect(shown).toContain('support.context.title');
    expect(shown).toContain('support.yourMessages');
    await waitFor(() => expect(byTestId(tree, 'support-message-12').length).toBeGreaterThan(0));
  });

  it('admin: empty list state', async () => {
    list.mockResolvedValue([]);
    const tree = render(<ContactSupportScreen />);
    await waitFor(() => expect(texts(tree)).toContain('support.emptyTitle'));
  });

  it('non-admin: no form, no request, ask a family admin', async () => {
    mockAuth.isAdmin = false;
    const tree = render(<ContactSupportScreen />);
    await flush();
    expect(texts(tree)).toContain('support.askAdmin');
    expect(texts(tree)).not.toContain('support.topicLabel');
    expect(list).not.toHaveBeenCalled();
  });

  it('Send is disabled until a topic and a valid message are there', async () => {
    list.mockResolvedValue([]);
    const tree = render(<ContactSupportScreen />);
    await flush();
    const send = () => byTestId(tree, 'support-send')[0];
    expect(send().props.disabled).toBe(true);
    await run(() => useSupportDraft.getState().setTopic('bug'));
    await run(() => useSupportDraft.getState().setMessage('short'));
    expect(send().props.disabled).toBe(true);
    await run(() => useSupportDraft.getState().setMessage('The board stays blank'));
    expect(send().props.disabled).toBe(false);
  });

  it('network error → "Try again" with the same client_id, then the thank-you card', async () => {
    list.mockResolvedValue([]);
    const tree = render(<ContactSupportScreen />);
    await flush();
    await run(() => {
      useSupportDraft.getState().setTopic('bug');
      useSupportDraft.getState().setMessage('The board stays blank');
    });

    post.mockRejectedValueOnce(new ApiError(0, 'offline', 'network_error'));
    await run(() => byTestId(tree, 'support-send')[0].props.onPress());
    await waitFor(() => expect(texts(tree)).toContain('support.errorNetwork'));
    expect(byTestId(tree, 'support-send')[0].props.title).toBe('support.retry');

    post.mockImplementationOnce(async (body) => msg({ id: 13, message: body.message }));
    await run(() => byTestId(tree, 'support-send')[0].props.onPress());
    await waitFor(() => expect(texts(tree)).toContain('support.sentTitle'));
    expect(post.mock.calls.map((call) => call[0].client_id)).toEqual(['uuid-1', 'uuid-1']);
    expect(post.mock.calls[0][0]).toMatchObject({
      topic: 'bug',
      message: 'The board stays blank',
      platform: expect.any(String),
      device: 'iPad Air (iPadOS 18.1)',
    });
    expect(texts(tree)).toContain('support.sentBody {"email":"mom@example.com"}');
    expect(useSupportDraft.getState().message).toBe('');
  });

  it('429 shows the friendly rate-limit message', async () => {
    list.mockResolvedValue([]);
    const tree = render(<ContactSupportScreen />);
    await flush();
    await run(() => {
      useSupportDraft.getState().setTopic('idea');
      useSupportDraft.getState().setMessage('More word puzzles please');
    });
    post.mockRejectedValueOnce(new ApiError(429, 'Too Many Attempts.', 'rate_limited'));
    await run(() => byTestId(tree, 'support-send')[0].props.onPress());
    await waitFor(() => expect(texts(tree)).toContain('support.rateLimited'));
    expect(byTestId(tree, 'support-send')[0].props.title).toBe('support.send');
  });
});

describe('every world', () => {
  const cases = WORLD_ORDER.flatMap((key) => [
    [key, 'light'],
    [key, 'dark'],
  ]) as [ThemeKey, 'light' | 'dark'][];

  it.each(cases)('%s (%s) renders the form and the list', async (key, scheme) => {
    list.mockResolvedValue([
      msg(),
      msg({ id: 13, status: 'answered', answered_at: '2026-11-09T10:00:00Z' }),
    ]);
    const tree = render(<ContactSupportScreen />, key, scheme, scheme === 'dark' ? 1.5 : 1);
    await flush();
    expect(texts(tree)).toContain('support.topicLabel');
    await waitFor(() => expect(byTestId(tree, 'support-message-13').length).toBeGreaterThan(0));
  });
});
