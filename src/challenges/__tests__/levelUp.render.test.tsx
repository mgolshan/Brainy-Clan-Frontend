import type { ComponentType } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { CodeBreakerPayload, CrossMathPayload, MazePayload, ThemeKey } from '@/api/types';
import { directionTo } from '@/challenges/maze/logic';
import { getChallenge, type ChallengeComponentProps } from '@/challenges/registry';
import { LEVEL_UP_SAMPLES, shortestTour } from '@/features/dev/puzzleSamples';
import en from '@/i18n/locales/en.json';
import { PressableScale, ThemeProvider } from '@/ui';

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('react-native-gesture-handler/jestSetup');

// The shared Reanimated mock has no `useReducedMotion` (used by ThemeProvider).
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
// Icon fonts load asynchronously (state updates outside act); icons don't matter here.
jest.mock('@/ui/components/Icon', () => ({ Icon: () => null }));
// `t` records every key it is asked for, so the test can check they all exist in en.json.
const mockUsedKeys = new Set<string>();
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      mockUsedKeys.add(key);
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

const hasKey = (path: string) => {
  const lookup = (p: string) =>
    p.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en);
  return lookup(path) !== undefined || lookup(`${path}_other`) !== undefined;
};

function render(
  sample: (typeof LEVEL_UP_SAMPLES)[number],
  themeKey: ThemeKey,
  scheme: 'light' | 'dark',
  extra: Partial<ChallengeComponentProps> = {},
): ReactTestRenderer {
  const def = getChallenge(sample.item.type)!;
  const Challenge = def.component as ComponentType<ChallengeComponentProps>;
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(
      <ThemeProvider themeKey={themeKey} schemePreference={scheme}>
        <Challenge item={sample.item} onSubmit={() => undefined} avatar="owl" {...extra} />
      </ThemeProvider>,
    );
  });
  return tree!;
}

/** Fires onLayout on the root so width-dependent boards render. */
function layout(tree: ReactTestRenderer, width = 360) {
  const root = tree.root.findAll((n) => typeof n.props.onLayout === 'function')[0];
  act(() => root.props.onLayout({ nativeEvent: { layout: { width, height: 800, x: 0, y: 0 } } }));
}

describe('level-up puzzles render', () => {
  it.each(LEVEL_UP_SAMPLES.map((s) => [s.label, s] as const))(
    '%s renders in several worlds without crashing',
    (_label, sample) => {
      expect(getChallenge(sample.item.type)?.isValidPayload(sample.item.payload)).toBe(true);
      for (const [world, scheme] of [
        ['playful', 'light'],
        ['jungle', 'dark'],
        ['classic', 'light'],
        ['neon', 'dark'],
      ] as const) {
        const tree = render(sample, world, scheme);
        layout(tree);
        expect(tree.toJSON()).toBeTruthy();
        act(() => tree.unmount());
      }
    },
  );

  it.each(LEVEL_UP_SAMPLES.map((s) => [s.label, s] as const))(
    '%s shows a scored answer (wrong and right)',
    (_label, sample) => {
      for (const isCorrect of [false, true]) {
        const verdict = sample.score({});
        const tree = render(sample, 'playful', 'light', {
          result: { isCorrect, correctResponse: verdict.correctResponse, submitted: {} },
        });
        layout(tree);
        expect(tree.toJSON()).toBeTruthy();
        act(() => tree.unmount());
      }
    },
  );

  it('places cross math tiles (tile then square, square then tile) and submits the fills', () => {
    const sample = LEVEL_UP_SAMPLES.find((s) => s.item.type === 'cross_math')!;
    const payload = sample.item.payload as CrossMathPayload;
    const onSubmit = jest.fn();
    const tree = render(sample, 'sea', 'light', { onSubmit });
    layout(tree);
    const byLabel = (label: string) =>
      tree.root.findAll((n) => n.type === PressableScale && n.props.accessibilityLabel === label);
    const tiles = () => byLabel('challenge.crossmath.tile');
    const squares = () =>
      byLabel('challenge.crossmath.cell. challenge.crossmath.blankHint').concat(
        byLabel('challenge.crossmath.cell'),
      );
    // Sample "cross math 1": blanks (2,2)=1, (4,2)=6, (4,4)=9; bank [1, 6, 9].
    expect(payload.bank).toEqual([1, 6, 9]);
    act(() => tiles()[0].props.onPress()); // tile 1 …
    act(() => squares()[0].props.onPress()); // … on (2,2)
    act(() => squares()[2].props.onPress()); // square (4,4) first …
    act(() => tiles()[1].props.onPress()); // … then the 9 (tiles 6, 9 are left: index 1)
    // A filled square sends its tile back when tapped.
    act(() => squares()[2].props.onPress());
    act(() => tiles()[1].props.onPress());
    act(() => squares()[2].props.onPress());
    act(() => tiles()[0].props.onPress()); // the 6 …
    act(() => squares()[1].props.onPress()); // … on (4,2)
    const check = tree.root.findAll(
      (n) =>
        n.props.accessibilityLabel === 'challenge.check' && typeof n.props.onPress === 'function',
    )[0];
    act(() => check.props.onPress());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const response = onSubmit.mock.calls[0][0];
    expect(response).toEqual({
      fills: [
        [2, 2, 1],
        [4, 2, 6],
        [4, 4, 9],
      ],
    });
    expect(sample.score(response).isCorrect).toBe(true);
    act(() => tree.unmount());
  });

  it('walks a maze with the arrow pad and submits the path at the goal', () => {
    jest.useFakeTimers();
    const sample = LEVEL_UP_SAMPLES.find((s) => s.item.type === 'maze')!;
    const payload = sample.item.payload as MazePayload;
    const route = shortestTour(payload);
    const onSubmit = jest.fn();
    const tree = render(sample, 'jungle', 'light', { onSubmit });
    layout(tree);
    const press = (label: string) => {
      const key = tree.root.find(
        (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
      );
      act(() => key.props.onPress());
    };
    for (let i = 1; i < route.length; i++) {
      press(`challenge.maze.move.${directionTo(route[i - 1], route[i])}`);
    }
    act(() => jest.advanceTimersByTime(1000));
    expect(onSubmit).toHaveBeenCalledWith({ path: route });
    expect(sample.score(onSubmit.mock.calls[0][0]).isCorrect).toBe(true);
    act(() => tree.unmount());
    jest.useRealTimers();
  });

  it('cracks a code and submits every guess', () => {
    jest.useFakeTimers();
    const sample = LEVEL_UP_SAMPLES.find((s) => s.item.type === 'code_breaker')!;
    const payload = sample.item.payload as CodeBreakerPayload;
    const onSubmit = jest.fn();
    const tree = render(sample, 'playful', 'dark', { onSubmit });
    layout(tree);
    const pegKeys = () =>
      tree.root.findAll(
        (n) =>
          n.type === PressableScale &&
          n.props.accessibilityLabel === 'challenge.codebreaker.pegLabel',
      );
    const tryIt = () =>
      act(() =>
        tree.root
          .findAll(
            (n) =>
              n.props.accessibilityLabel === 'challenge.codebreaker.try' &&
              typeof n.props.onPress === 'function',
          )[0]
          .props.onPress(),
      );
    const guess = (pegs: number[]) => {
      for (const p of pegs) act(() => pegKeys()[p].props.onPress());
      tryIt();
    };
    const wrong = payload.code.map((p) => (p + 1) % payload.pegs.length);
    guess(wrong);
    guess(payload.code);
    act(() => jest.advanceTimersByTime(1500));
    expect(onSubmit).toHaveBeenCalledWith({ guesses: [wrong, payload.code] });
    act(() => tree.unmount());
    jest.useRealTimers();
  });

  it('only uses translation keys that exist', () => {
    const missing = [...mockUsedKeys].filter((k) => !hasKey(k));
    expect(missing).toEqual([]);
    expect(mockUsedKeys.size).toBeGreaterThan(30);
  });
});
