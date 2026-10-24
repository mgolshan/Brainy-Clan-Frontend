import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import type { ChatMessage } from '@/api/types';
import { postChatMessage } from '@/features/chat/api';
import {
  discardChatMessage,
  flushChatOutbox,
  retryChatMessage,
  sendChatMessage,
  useChatOutbox,
} from '@/features/chat/outbox';

jest.mock('@/features/chat/api', () => ({ postChatMessage: jest.fn() }));
jest.mock('@/api/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(() => Promise.resolve()),
    setQueryData: jest.fn(),
  },
}));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuid}` }));

const post = postChatMessage as jest.MockedFunction<typeof postChatMessage>;
const invalidate = queryClient.invalidateQueries as jest.Mock;
const setData = queryClient.setQueryData as jest.Mock;

const stored = (clientId: string, body: string, id = 100): ChatMessage => ({
  id,
  member_id: 1,
  nickname: 'Sam',
  avatar: null,
  body,
  deleted: false,
  client_id: clientId,
  created_at: '2026-10-23T12:00:00Z',
});
const offline = () => new ApiError(0, 'Network request failed', 'network_error');
const refused = (code: string, status = 422) => new ApiError(status, 'nope', code);
const items = () => useChatOutbox.getState().items;
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(async () => {
  jest.clearAllMocks();
  mockUuid = 0;
  useChatOutbox.getState().clear();
  await AsyncStorage.clear();
});

describe('optimistic send', () => {
  it('queues the trimmed message with a fresh client_id and removes it once stored', async () => {
    post.mockResolvedValueOnce(stored('uuid-1', 'hello 👋'));
    const clientId = sendChatMessage(1, '  hello 👋  ');
    expect(clientId).toBe('uuid-1');
    // Shown at once as a pending bubble.
    expect(items()).toMatchObject([{ clientId: 'uuid-1', body: 'hello 👋', status: 'sending' }]);
    await flushChatOutbox(1);
    expect(post).toHaveBeenCalledWith({ body: 'hello 👋', client_id: 'uuid-1' });
    expect(items()).toEqual([]);
    // The stored message joins the history cache.
    expect(setData).toHaveBeenCalledTimes(1);
  });

  it('refuses empty or too long text without queuing', () => {
    expect(sendChatMessage(1, '   ')).toBeNull();
    expect(sendChatMessage(1, 'x'.repeat(1001))).toBeNull();
    expect(items()).toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });

  it('sends queued messages in order', async () => {
    post.mockImplementation(async (body) => stored(body.client_id, body.body));
    sendChatMessage(1, 'one');
    sendChatMessage(1, 'two');
    await flushChatOutbox(1);
    await settle();
    expect(post.mock.calls.map(([b]) => b.body)).toEqual(['one', 'two']);
    expect(items()).toEqual([]);
  });
});

describe('offline queue', () => {
  it('keeps the message waiting when offline and re-sends it with the same client_id', async () => {
    post.mockRejectedValueOnce(offline());
    sendChatMessage(1, 'later');
    await flushChatOutbox(1);
    expect(items()).toMatchObject([{ clientId: 'uuid-1', status: 'waiting' }]);

    post.mockResolvedValueOnce(stored('uuid-1', 'later'));
    await flushChatOutbox(1);
    expect(post).toHaveBeenLastCalledWith({ body: 'later', client_id: 'uuid-1' });
    expect(items()).toEqual([]);
  });

  it('stops at the first network failure (the rest wait too)', async () => {
    post.mockRejectedValue(offline());
    sendChatMessage(1, 'a');
    sendChatMessage(1, 'b');
    await flushChatOutbox(1);
    await settle();
    // Both waiting; 'b' wasn't tried after 'a' failed offline in the same run.
    expect(items().map((q) => q.status)).toEqual(['waiting', 'waiting']);
  });

  it("only sends the given member's messages", async () => {
    post.mockImplementation(async (body) => stored(body.client_id, body.body));
    useChatOutbox.getState().add({
      memberId: 2,
      clientId: 'other',
      body: 'from member 2',
      createdAt: '2026-10-23T12:00:00Z',
      status: 'waiting',
    });
    sendChatMessage(1, 'mine');
    await flushChatOutbox(1);
    await settle();
    expect(post.mock.calls.map(([b]) => b.client_id)).toEqual(['uuid-1']);
    expect(items().map((q) => q.clientId)).toEqual(['other']);
  });

  it('persists pending messages (with member) in AsyncStorage', async () => {
    post.mockRejectedValueOnce(offline());
    sendChatMessage(1, 'saved');
    await flushChatOutbox(1);
    await settle();
    const raw = await AsyncStorage.getItem('brainyclan.chat-outbox');
    const persisted = JSON.parse(raw ?? '{}') as { state: { items: unknown[] } };
    expect(persisted.state.items).toMatchObject([
      { memberId: 1, clientId: 'uuid-1', body: 'saved', status: 'waiting' },
    ]);
  });

  it('reloads an interrupted send as waiting', async () => {
    await AsyncStorage.setItem(
      'brainyclan.chat-outbox',
      JSON.stringify({
        state: {
          items: [
            {
              memberId: 1,
              clientId: 'k',
              body: 'x',
              createdAt: '2026-10-23T12:00:00Z',
              status: 'sending',
            },
          ],
        },
        version: 0,
      }),
    );
    await useChatOutbox.persist.rehydrate();
    expect(items()).toMatchObject([{ clientId: 'k', status: 'waiting' }]);
  });
});

describe('failures and retry', () => {
  it('marks a refused message failed, and a retry re-sends the same client_id', async () => {
    post.mockRejectedValueOnce(refused('rate_limited', 429));
    sendChatMessage(1, 'fast');
    await flushChatOutbox(1);
    expect(items()).toMatchObject([{ status: 'failed', errorCode: 'rate_limited' }]);

    // Failed messages are not re-sent automatically.
    await flushChatOutbox(1);
    expect(post).toHaveBeenCalledTimes(1);

    post.mockResolvedValueOnce(stored('uuid-1', 'fast'));
    retryChatMessage(1, 'uuid-1');
    await flushChatOutbox(1);
    expect(post).toHaveBeenLastCalledWith({ body: 'fast', client_id: 'uuid-1' });
    expect(items()).toEqual([]);
  });

  it('chat_disabled fails the message and refreshes `me`', async () => {
    post.mockRejectedValueOnce(refused('chat_disabled', 403));
    sendChatMessage(1, 'hi');
    await flushChatOutbox(1);
    expect(items()).toMatchObject([{ status: 'failed', errorCode: 'chat_disabled' }]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
  });

  it('discards an unsent message', async () => {
    post.mockRejectedValueOnce(refused('validation_failed'));
    sendChatMessage(1, 'oops');
    await flushChatOutbox(1);
    discardChatMessage('uuid-1');
    expect(items()).toEqual([]);
  });
});
