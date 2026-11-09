import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '@/api/client';
import type { SendSupportMessageBody, SupportMessage } from '@/api/types';
import { postSupportMessage } from '@/features/support/api';
import {
  InvalidDraftError,
  attemptFor,
  clearSupportDraft,
  sendSupportDraft,
  useSupportDraft,
} from '@/features/support/draft';

jest.mock('@/features/support/api', () => ({ postSupportMessage: jest.fn() }));
let mockUuid = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++mockUuid}` }));

const post = postSupportMessage as jest.MockedFunction<typeof postSupportMessage>;
const context = {
  app_version: '1.0.0',
  platform: 'ios' as const,
  device: 'iPhone 15 (iOS 18.1)',
};
const stored = (body: SendSupportMessageBody, id = 12): SupportMessage => ({
  id,
  topic: body.topic,
  message: body.message,
  status: 'open',
  created_at: '2026-11-08T14:03:00Z',
  answered_at: null,
});
const offline = () => new ApiError(0, 'Network request failed', 'network_error');
const draft = () => useSupportDraft.getState();

beforeEach(async () => {
  jest.clearAllMocks();
  mockUuid = 0;
  clearSupportDraft();
  await AsyncStorage.clear();
});

describe('attemptFor', () => {
  it('re-uses the previous attempt when nothing changed', () => {
    const first = attemptFor(null, 'bug', 'It crashes on start', () => 'a');
    expect(first).toEqual({ clientId: 'a', topic: 'bug', message: 'It crashes on start' });
    expect(attemptFor(first, 'bug', 'It crashes on start', () => 'b')).toBe(first);
  });

  it('makes a new client_id when the text or topic changed', () => {
    const first = attemptFor(null, 'bug', 'It crashes on start', () => 'a');
    expect(attemptFor(first, 'bug', 'It crashes on start!', () => 'b').clientId).toBe('b');
    expect(attemptFor(first, 'account', 'It crashes on start', () => 'c').clientId).toBe('c');
  });
});

describe('sendSupportDraft', () => {
  it('sends the contract body (trimmed message, client_id, context)', async () => {
    draft().claim(7);
    draft().setTopic('billing');
    draft().setMessage('  My Family plan shows Free after renewing.  ');
    post.mockImplementationOnce(async (body) => stored(body));

    const saved = await sendSupportDraft(context);

    expect(post).toHaveBeenCalledWith({
      topic: 'billing',
      message: 'My Family plan shows Free after renewing.',
      client_id: 'uuid-1',
      app_version: '1.0.0',
      platform: 'ios',
      device: 'iPhone 15 (iOS 18.1)',
    });
    expect(saved.id).toBe(12);
    // Success clears the draft but keeps its owner.
    expect(draft()).toMatchObject({ userId: 7, topic: null, message: '', attempt: null });
  });

  it('omits an unknown device', async () => {
    draft().setTopic('idea');
    draft().setMessage('A dark mode for the map please');
    post.mockImplementationOnce(async (body) => stored(body));
    await sendSupportDraft({ app_version: '1.0.0', platform: 'web', device: undefined });
    expect(post.mock.calls[0][0]).not.toHaveProperty('device');
  });

  it('retries a network failure with the same client_id (idempotent)', async () => {
    draft().setTopic('bug');
    draft().setMessage('The sudoku board is blank');
    post.mockRejectedValueOnce(offline());

    await expect(sendSupportDraft(context)).rejects.toMatchObject({ code: 'network_error' });
    // The text and the attempt survive (persisted draft).
    expect(draft()).toMatchObject({
      message: 'The sudoku board is blank',
      attempt: { clientId: 'uuid-1' },
    });

    post.mockImplementationOnce(async (body) => stored(body));
    await sendSupportDraft(context);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][0].client_id).toBe('uuid-1');
  });

  it('keeps the client_id across a rate limit, changes it after an edit', async () => {
    draft().setTopic('bug');
    draft().setMessage('The sudoku board is blank');
    post.mockRejectedValueOnce(new ApiError(429, 'Too many', 'rate_limited'));
    await expect(sendSupportDraft(context)).rejects.toMatchObject({ status: 429 });
    expect(draft().attempt?.clientId).toBe('uuid-1');

    draft().setMessage('The sudoku board is blank on iPad');
    post.mockImplementationOnce(async (body) => stored(body));
    await sendSupportDraft(context);
    expect(post.mock.calls[0][0].client_id).toBe('uuid-1');
    expect(post.mock.calls[1][0].client_id).toBe('uuid-2');
  });

  it('refuses an invalid draft without calling the API', async () => {
    draft().setMessage('A long enough message');
    await expect(sendSupportDraft(context)).rejects.toBeInstanceOf(InvalidDraftError);
    draft().setTopic('other');
    draft().setMessage('short');
    await expect(sendSupportDraft(context)).rejects.toBeInstanceOf(InvalidDraftError);
    expect(post).not.toHaveBeenCalled();
  });

  it('starts empty for another user on the same device', () => {
    draft().claim(7);
    draft().setTopic('bug');
    draft().setMessage('Something from user 7');
    draft().claim(7);
    expect(draft().message).toBe('Something from user 7');
    draft().claim(8);
    expect(draft()).toMatchObject({ userId: 8, topic: null, message: '', attempt: null });
  });
});
