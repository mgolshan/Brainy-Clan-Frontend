import { router } from 'expo-router';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { Onboarding } from '@/api/types';
import { RestoreChecklistRow } from '@/features/onboarding/components/RestoreChecklistRow';
import type { FlowKey } from '@/features/onboarding/flows';
import { useFtueRun } from '@/features/onboarding/hooks';
import { ListRow, ThemeProvider } from '@/ui';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('@/ui/components/Icon', () => ({ Icon: () => null }));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('@/features/auth/hooks', () => ({ useMe: () => ({ data: undefined }) }));

const mockFtue: { onboarding: Onboarding | null; flow: FlowKey | null } = {
  onboarding: null,
  flow: null,
};
const mockMutate = jest.fn();
jest.mock('@/features/onboarding/hooks', () => ({
  ...jest.requireActual<object>('@/features/onboarding/hooks'),
  useFtue: () => mockFtue,
  useRestoreOnboarding: () => ({ mutate: mockMutate }),
}));

const mounted: ReactTestRenderer[] = [];

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ThemeProvider themeKey="modern" schemePreference="light" textScale={1} reducedMotion>
        <RestoreChecklistRow />
      </ThemeProvider>,
    );
  });
  mounted.push(tree);
  return tree;
}

const rows = (tree: ReactTestRenderer) => tree.root.findAll((n) => n.type === ListRow);
const dismissed: Onboarding = { steps: { welcome: 'x' }, dismissed_at: '2026-11-21T10:00:00Z' };

beforeEach(() => {
  jest.clearAllMocks();
  useFtueRun.setState({ shown: [], restoreMissing: false });
  mockFtue.onboarding = dismissed;
  mockFtue.flow = 'owner';
});
afterEach(() => {
  while (mounted.length) {
    const tree = mounted.pop()!;
    act(() => tree.unmount());
  }
});

describe('RestoreChecklistRow (Profile)', () => {
  it('shows when the checklist was dismissed, restores it and goes Home', () => {
    const tree = render();
    const [row] = rows(tree);
    expect(row.props.title).toBe('onboarding.restore');
    act(() => row.props.onPress());
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith('/');
  });

  it('uses the class wording for teachers', () => {
    mockFtue.flow = 'teacher';
    expect(rows(render())[0].props.title).toBe('onboarding.restoreClassroom');
  });

  it('hides while the checklist is shown', () => {
    mockFtue.onboarding = { ...dismissed, dismissed_at: null };
    expect(rows(render())).toHaveLength(0);
  });

  it('hides without FTUE (older server / no flow)', () => {
    mockFtue.onboarding = null;
    expect(rows(render())).toHaveLength(0);
    mockFtue.onboarding = dismissed;
    mockFtue.flow = null;
    expect(rows(render())).toHaveLength(0);
  });

  it('hides when the server has no restore route (404 earlier in this run)', () => {
    useFtueRun.setState({ restoreMissing: true });
    expect(rows(render())).toHaveLength(0);
  });
});
