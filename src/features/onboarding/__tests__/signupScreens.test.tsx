import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';
import { WelcomeScreen } from '@/features/auth/screens/WelcomeScreen';
import { ClassroomSetupCard } from '@/features/onboarding/components/ClassroomSetupCard';
import { useSignupIntent } from '@/features/onboarding/signupIntent';
import { Button, ThemeProvider } from '@/ui';

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
const mockParams: { value: Record<string, string> } = { value: {} };
let mockFocused = true;
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams.value,
  useIsFocused: () => mockFocused,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: { language: 'en' },
  }),
}));
jest.mock('@/i18n', () => ({ __esModule: true, default: { language: 'en' } }));

// Social buttons: capture the `onStart` each screen passes.
const mockSocial: { onStart?: () => void } = {};
jest.mock('@/features/auth/social/SocialSignIn', () => ({
  SocialSignIn: (props: { onStart?: () => void }) => {
    mockSocial.onStart = props.onStart;
    return null;
  },
}));
// Birth date: the test sets year / month through the captured callbacks.
const mockBirth: { year?: (v: string) => void; month?: (v: number) => void } = {};
jest.mock('@/features/auth/components/BirthDateFields', () => ({
  BirthDateFields: (props: {
    onYearChange: (v: string) => void;
    onMonthChange: (v: number) => void;
  }) => {
    mockBirth.year = props.onYearChange;
    mockBirth.month = props.onMonthChange;
    return null;
  },
}));
jest.mock('@/features/legal/components', () => ({ AcceptTerms: () => null }));
jest.mock('@/features/billing/hooks', () => ({
  usePricingTiers: () => ({ data: null }),
}));

const mockMe: { value: unknown } = { value: undefined };
jest.mock('@/features/auth/hooks', () => ({
  useRegister: () => ({ mutate: jest.fn(), isPending: false, error: null }),
  useMe: () => ({ data: mockMe.value }),
}));
const mockStore = { available: true };
jest.mock('@/features/billing/store', () => ({
  get store() {
    return mockStore;
  },
}));

const push = router.push as jest.Mock;
const mounted: ReactTestRenderer[] = [];

function render(ui: ReactNode): ReactTestRenderer {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <QueryClientProvider client={client}>
        <ThemeProvider themeKey="modern" schemePreference="light" textScale={1} reducedMotion>
          {ui}
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
  mounted.push(tree);
  return tree;
}

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

const button = (tree: ReactTestRenderer, title: string) =>
  tree.root.findAll((n) => n.type === Button && n.props.title === title)[0];
const press = (tree: ReactTestRenderer, title: string) =>
  act(() => {
    button(tree, title).props.onPress();
  });

const intentState = () => useSignupIntent.getState();

beforeEach(() => {
  jest.clearAllMocks();
  intentState().clear();
  mockParams.value = {};
  mockFocused = true;
  mockStore.available = true;
});
afterEach(() => {
  while (mounted.length) {
    const tree = mounted.pop()!;
    act(() => tree.unmount());
  }
});

describe('WelcomeScreen', () => {
  it('sends the teacher door to register with the classroom intent (param + stored)', () => {
    const tree = render(<WelcomeScreen />);
    press(tree, 'welcome.createClass');
    expect(intentState().intent).toBe('classroom');
    expect(push).toHaveBeenCalledWith({ pathname: '/register', params: { intent: 'classroom' } });
  });

  it('sends the parent door to the same screen with the family intent', () => {
    const tree = render(<WelcomeScreen />);
    press(tree, 'welcome.createAccount');
    expect(intentState().intent).toBe('family');
    expect(push).toHaveBeenCalledWith({ pathname: '/register', params: { intent: 'family' } });
  });

  it('drops a stale intent on sign in, join and social sign-in', () => {
    const tree = render(<WelcomeScreen />);
    intentState().choose('classroom');
    press(tree, 'welcome.signIn');
    expect(intentState().intent).toBeNull();
    intentState().choose('classroom');
    act(() => {
      mockSocial.onStart?.();
    });
    expect(intentState().intent).toBeNull();
  });

  it('shows the footer note for kids and students', () => {
    expect(texts(render(<WelcomeScreen />))).toContain('welcome.joinHint');
  });
});

describe('RegisterScreen', () => {
  it('uses the teacher framing with the classroom intent and the 18+ hint', () => {
    mockParams.value = { intent: 'classroom' };
    const text = texts(render(<RegisterScreen />));
    expect(text).toContain('register.teacherTitle');
    expect(text).toContain('register.teacherSubtitle');
  });

  it('falls back to the stored intent (no param)', () => {
    intentState().choose('classroom');
    expect(texts(render(<RegisterScreen />))).toContain('register.teacherTitle');
  });

  it('uses the parent framing by default', () => {
    expect(texts(render(<RegisterScreen />))).toContain('register.title');
  });

  it('keeps the intent for a social sign-up (deep link with only the param)', () => {
    mockParams.value = { intent: 'classroom' };
    render(<RegisterScreen />);
    expect(intentState().intent).toBeNull();
    act(() => {
      mockSocial.onStart?.();
    });
    expect(intentState().intent).toBe('classroom');
  });

  it('explains the Classroom age and offers to continue as a family when under 18', () => {
    mockParams.value = { intent: 'classroom' };
    const tree = render(<RegisterScreen />);
    act(() => {
      mockBirth.year?.(String(new Date().getFullYear() - 17));
      mockBirth.month?.(1);
    });
    expect(texts(tree)).toContain('register.teacherTooYoungBody {"age":18}');
    expect(button(tree, 'register.submit').props.disabled).toBe(true);
    press(tree, 'register.continueAsFamily');
    expect(intentState().intent).toBe('family');
    expect(router.setParams).toHaveBeenCalledWith({ intent: 'family' });
  });

  it('shows no age notice for an adult teacher', () => {
    mockParams.value = { intent: 'classroom' };
    const tree = render(<RegisterScreen />);
    act(() => {
      mockBirth.year?.('1988');
      mockBirth.month?.(4);
    });
    expect(texts(tree)).not.toContain('register.teacherTooYoungBody');
  });
});

describe('ClassroomSetupCard (Home)', () => {
  const me = (tier: string, role = 'admin') => ({
    user: { id: 1 },
    member: { role },
    family: { tier, owner_user_id: 1 },
    policy: { tier, purchases_allowed: true, is_child: false },
  });

  it('opens the paywall once with Classroom preselected, then shows the card', () => {
    mockMe.value = me('free');
    intentState().choose('classroom');
    intentState().setStage('paywall');
    const tree = render(<ClassroomSetupCard />);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({ pathname: '/family-plan', params: { plan: 'classroom' } });
    expect(intentState().stage).toBe('finish');
    expect(texts(tree)).toContain('classroomSetup.title');
  });

  it('is dismissible (clears the intent)', () => {
    mockMe.value = me('free');
    intentState().choose('classroom');
    intentState().setStage('finish');
    const tree = render(<ClassroomSetupCard />);
    press(tree, 'classroomSetup.dismiss');
    expect(intentState().intent).toBeNull();
    expect(tree.toJSON()).toBeNull();
  });

  it('goes away once the family has the Classroom tier', () => {
    mockMe.value = me('classroom');
    intentState().choose('classroom');
    intentState().setStage('finish');
    const tree = render(<ClassroomSetupCard />);
    expect(tree.toJSON()).toBeNull();
    expect(intentState().intent).toBeNull();
  });

  it('shows the card without a store (web / Expo Go) and never opens the paywall', () => {
    mockStore.available = false;
    mockMe.value = me('free');
    intentState().choose('classroom');
    intentState().setStage('paywall');
    const tree = render(<ClassroomSetupCard />);
    expect(push).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('classroomSetup.bodyNoStore');
  });
});
