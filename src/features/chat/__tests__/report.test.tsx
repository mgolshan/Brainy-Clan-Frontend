import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '@/api/client';
import type { ChatMessage } from '@/api/types';
import { reportErrorKey } from '@/features/chat/api';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import en from '@/i18n/locales/en.json';
import { ThemeProvider } from '@/ui';

// The shared Reanimated mock has no `useReducedMotion` (used by ThemeProvider).
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
// Icon fonts load asynchronously (state updates outside act); icons don't matter here.
jest.mock('@/ui/components/Icon', () => ({ Icon: () => null }));
// `t` returns the key, so the test sees which string was chosen.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const err = (status: number, code: string) => new ApiError(status, 'Server says no', code);

const hasKey = (path: string) =>
  path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en) !==
  undefined;

describe('report errors', () => {
  it.each([
    [422, 'validation_failed', 'chat.reportOwn'],
    [403, 'forbidden', 'errors.forbidden'],
    [403, 'chat_disabled', 'chat.disabledTitle'],
    [404, 'not_found', 'chat.reportGone'],
    [429, 'rate_limited', 'chat.reportRateLimited'],
    [500, 'server_error', 'chat.reportFailed'],
    [0, 'network_error', 'errors.network'],
    [0, 'timeout', 'errors.network'],
  ])('%i %s → %s', (status, code, key) => {
    const result = reportErrorKey(err(status, code));
    expect(result).toBe(key);
    expect(hasKey(result)).toBe(true);
  });

  it('falls back for non-API errors', () => {
    expect(reportErrorKey(new Error('boom'))).toBe('chat.reportFailed');
  });
});

const message = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 7,
  member_id: 6,
  nickname: 'Sam',
  avatar: null,
  body: 'hello',
  deleted: false,
  client_id: null,
  created_at: '2026-10-24T10:00:00Z',
  ...over,
});

type BubbleProps = React.ComponentProps<typeof MessageBubble>;

function render(props: Partial<BubbleProps>): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(
      <ThemeProvider themeKey="modern">
        <MessageBubble message={message()} own={false} showAuthor locale="en" {...props} />
      </ThemeProvider>,
    );
  });
  return tree!;
}

const tagsOf = (tree: ReactTestRenderer) =>
  tree.root.findAll((node) => node.props.testID === 'chat-reported-tag');
const withActions = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (node) => typeof node.type !== 'string' && Array.isArray(node.props.accessibilityActions),
  );

describe('MessageBubble "Reported" tag', () => {
  it('shows the tag and opens the review when pressed', () => {
    const onReview = jest.fn();
    const tree = render({ reported: true, onReviewReport: onReview });
    const tags = tagsOf(tree);
    expect(tags.length).toBeGreaterThan(0);
    expect(JSON.stringify(tree.toJSON())).toContain('chat.reportedTag');
    act(() => tags[0].props.onPress());
    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('shows no tag when not reported', () => {
    const tree = render({ reported: false });
    expect(tagsOf(tree)).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).not.toContain('chat.reportedTag');
  });
});

describe('MessageBubble long-press action', () => {
  it('offers "Report to a parent" for a report action', () => {
    const onLongPress = jest.fn();
    const tree = render({ action: 'report', onLongPress });
    const press = withActions(tree)[0];
    expect(press.props.accessibilityActions).toEqual([{ name: 'report', label: 'chat.report' }]);
    expect(press.props.accessibilityHint).toBe('chat.longPressReportHint');
    act(() => press.props.onLongPress());
    expect(onLongPress).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('offers "Delete" for a delete action', () => {
    const tree = render({ action: 'delete', onLongPress: jest.fn() });
    expect(withActions(tree)[0].props.accessibilityActions).toEqual([
      { name: 'delete', label: 'chat.delete' },
    ]);
  });

  it('offers nothing without an action', () => {
    const tree = render({ action: null, onLongPress: jest.fn() });
    expect(withActions(tree)).toHaveLength(0);
  });
});
