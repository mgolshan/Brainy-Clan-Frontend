import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { Card } from '@/ui/components/Card';
import { Confetti } from '@/ui/components/Celebration';
import { ProgressBar } from '@/ui/components/ProgressBar';
import { Text } from '@/ui/components/Text';
import { SceneView } from '@/ui/scenes';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { WORLD_ORDER, type ThemeKey } from '@/ui/themes';

// The shared Reanimated mock has no `useReducedMotion` (used by ThemeProvider).
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('@/ui/components/Icon', () => ({ Icon: () => null }));

const cases = WORLD_ORDER.flatMap((key) => [
  [key, 'light'],
  [key, 'dark'],
]) as [ThemeKey, 'light' | 'dark'][];

/**
 * Every world draws its scene (phone and thumbnail size), its card with ornaments, its progress
 * track and its celebration overlay without crashing, light and dark.
 */
describe('world visuals', () => {
  it.each(cases)('%s (%s) renders scene, card, progress and celebration', (key, scheme) => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <ThemeProvider themeKey={key} schemePreference={scheme}>
          <SceneView width={390} height={760} />
          <SceneView width={120} height={90} animated={false} />
          <Card>
            <Text>Card</Text>
          </Card>
          <Card tint="#0F9488" selected>
            <Text>Tinted</Text>
          </Card>
          <ProgressBar value={0.6} label="Progress" />
          <ProgressBar value={0.3} color="#0F9488" />
          <Confetti />
        </ThemeProvider>,
      );
    });
    expect(tree.root.findAllByType(Text).length).toBeGreaterThanOrEqual(3);
    act(() => tree.unmount());
  });
});
