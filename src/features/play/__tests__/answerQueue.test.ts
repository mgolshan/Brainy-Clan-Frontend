import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import type { AnswerResult } from '@/api/types';
import { applyAnswerResult, postAnswer } from '@/features/play/api';
import {
  flushAnswerQueue,
  subscribeToFlush,
  useAnswerQueue,
  type FlushEvent,
  type QueuedAnswer,
} from '@/features/play/answerQueue';

// The submit call is faked; no network, no React Query cache writes.
jest.mock('@/features/play/api', () => ({
  postAnswer: jest.fn(),
  applyAnswerResult: jest.fn(),
}));
jest.mock('@/api/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn(() => Promise.resolve()) },
}));

const submit = postAnswer as jest.MockedFunction<typeof postAnswer>;
const apply = applyAnswerResult as jest.MockedFunction<typeof applyAnswerResult>;
const invalidate = queryClient.invalidateQueries as jest.Mock;

const STORAGE_KEY = 'brainyclan.answer-queue';

const answer = (sessionId: number, itemId: number, choice = 'a'): QueuedAnswer => ({
  sessionId,
  body: { session_item_id: itemId, response: { choice_id: choice }, time_ms: 1200 },
  queuedAt: 1_000 + itemId,
});

const result = (points = 1) => ({ is_correct: true, points_awarded: points }) as AnswerResult;
const offline = () => new ApiError(0, 'Network request failed', 'network_error');
const ids = () =>
  useAnswerQueue.getState().items.map((q) => `${q.sessionId}:${q.body.session_item_id}`);

/** Let the persist middleware's async storage write finish. */
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

async function storedItems(): Promise<QueuedAnswer[]> {
  await settle();
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: { items: QueuedAnswer[] } }).state.items : [];
}

beforeEach(async () => {
  jest.clearAllMocks();
  useAnswerQueue.getState().clear();
  await AsyncStorage.clear();
});

describe('queue state', () => {
  it('keeps answers in the order they were queued', () => {
    const { enqueue } = useAnswerQueue.getState();
    enqueue(answer(1, 10));
    enqueue(answer(1, 11));
    enqueue(answer(2, 10));
    expect(ids()).toEqual(['1:10', '1:11', '2:10']);
  });

  it('keeps only the latest answer per session item (re-queue replaces and moves to the end)', () => {
    const { enqueue } = useAnswerQueue.getState();
    enqueue(answer(1, 10, 'a'));
    enqueue(answer(1, 11));
    enqueue(answer(1, 10, 'b'));
    expect(ids()).toEqual(['1:11', '1:10']);
    expect(useAnswerQueue.getState().items[1].body.response).toEqual({ choice_id: 'b' });
  });

  it('removes one item by session and item id', () => {
    const { enqueue, remove } = useAnswerQueue.getState();
    enqueue(answer(1, 10));
    enqueue(answer(2, 10));
    remove(1, 10);
    expect(ids()).toEqual(['2:10']);
  });
});

describe('persistence', () => {
  it('writes the queue to AsyncStorage (survives an app restart)', async () => {
    useAnswerQueue.getState().enqueue(answer(1, 10));
    useAnswerQueue.getState().enqueue(answer(1, 11));
    expect((await storedItems()).map((q) => q.body.session_item_id)).toEqual([10, 11]);
  });

  it('restores queued answers from AsyncStorage', async () => {
    const saved = [answer(3, 30), answer(3, 31)];
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { items: saved }, version: 0 }),
    );
    await useAnswerQueue.persist.rehydrate();
    expect(useAnswerQueue.getState().items).toEqual(saved);
  });

  it('stores only the items, never functions or other state', async () => {
    useAnswerQueue.getState().enqueue(answer(1, 10));
    await settle();
    const raw = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
    expect(Object.keys(raw.state)).toEqual(['items']);
  });
});

describe('flushAnswerQueue', () => {
  it('sends every answer in order, removes it and applies the result', async () => {
    const { enqueue } = useAnswerQueue.getState();
    enqueue(answer(1, 10));
    enqueue(answer(1, 11));
    submit.mockResolvedValue(result());

    await flushAnswerQueue();

    expect(submit.mock.calls.map(([session, body]) => [session, body.session_item_id])).toEqual([
      [1, 10],
      [1, 11],
    ]);
    expect(apply).toHaveBeenCalledWith(1, 10, result());
    expect(apply).toHaveBeenCalledWith(1, 11, result());
    expect(ids()).toEqual([]);
    expect(await storedItems()).toEqual([]);
  });

  it('tells listeners about each scored answer', async () => {
    useAnswerQueue.getState().enqueue(answer(1, 10));
    submit.mockResolvedValue(result(2));
    const events: FlushEvent[] = [];
    const unsubscribe = subscribeToFlush((e) => events.push(e));

    await flushAnswerQueue();
    unsubscribe();

    expect(events).toEqual([{ kind: 'scored', answer: answer(1, 10), result: result(2) }]);
  });

  it('stops at the first network failure and keeps that answer and the rest', async () => {
    const { enqueue } = useAnswerQueue.getState();
    enqueue(answer(1, 10));
    enqueue(answer(1, 11));
    enqueue(answer(1, 12));
    submit.mockResolvedValueOnce(result()).mockRejectedValueOnce(offline());

    await flushAnswerQueue();

    expect(submit).toHaveBeenCalledTimes(2); // 12 is not tried while offline
    expect(ids()).toEqual(['1:11', '1:12']);
    expect(invalidate).not.toHaveBeenCalled();
    expect((await storedItems()).map((q) => q.body.session_item_id)).toEqual([11, 12]);
  });

  it('retries the kept answers on the next flush (back online)', async () => {
    const { enqueue } = useAnswerQueue.getState();
    enqueue(answer(1, 10));
    enqueue(answer(1, 11));
    submit.mockRejectedValueOnce(offline());
    await flushAnswerQueue();
    expect(ids()).toEqual(['1:10', '1:11']);

    submit.mockResolvedValue(result());
    await flushAnswerQueue();
    expect(ids()).toEqual([]);
    expect(submit.mock.calls.map(([, body]) => body.session_item_id)).toEqual([10, 10, 11]);
  });

  it('a timeout counts as offline too', async () => {
    useAnswerQueue.getState().enqueue(answer(1, 10));
    submit.mockRejectedValueOnce(new ApiError(0, 'Aborted', 'timeout'));
    await flushAnswerQueue();
    expect(ids()).toEqual(['1:10']);
  });

  it('drops an answer the server refuses (409), refreshes the session and goes on', async () => {
    const { enqueue } = useAnswerQueue.getState();
    enqueue(answer(1, 10));
    enqueue(answer(1, 11));
    const conflict = new ApiError(409, 'Already answered.', 'item_already_answered');
    submit.mockRejectedValueOnce(conflict).mockResolvedValueOnce(result());
    const events: FlushEvent[] = [];
    const unsubscribe = subscribeToFlush((e) => events.push(e));

    await flushAnswerQueue();
    unsubscribe();

    expect(ids()).toEqual([]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['play', 'session', 1] });
    expect(events.map((e) => e.kind)).toEqual(['dropped', 'scored']);
    expect(events[0]).toMatchObject({ kind: 'dropped', error: conflict });
  });

  it('drops an answer after an unexpected error without notifying listeners', async () => {
    useAnswerQueue.getState().enqueue(answer(1, 10));
    submit.mockRejectedValueOnce(new TypeError('boom'));
    const listener = jest.fn();
    const unsubscribe = subscribeToFlush(listener);

    await flushAnswerQueue();
    unsubscribe();

    expect(ids()).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('runs one flush at a time: concurrent calls share it (no double submit)', async () => {
    useAnswerQueue.getState().enqueue(answer(1, 10));
    let release!: (value: AnswerResult) => void;
    submit.mockReturnValueOnce(new Promise<AnswerResult>((resolve) => (release = resolve)));

    const first = flushAnswerQueue();
    const second = flushAnswerQueue();
    expect(second).toBe(first);
    release(result());
    await Promise.all([first, second]);

    expect(submit).toHaveBeenCalledTimes(1);
    expect(ids()).toEqual([]);
  });

  it('keeps an answer queued while flushing for the next run', async () => {
    useAnswerQueue.getState().enqueue(answer(1, 10));
    let release!: (value: AnswerResult) => void;
    submit.mockReturnValueOnce(new Promise<AnswerResult>((resolve) => (release = resolve)));

    const running = flushAnswerQueue();
    useAnswerQueue.getState().enqueue(answer(1, 11)); // answered while the first is in flight
    release(result());
    await running;
    expect(ids()).toEqual(['1:11']);

    submit.mockResolvedValue(result());
    await flushAnswerQueue();
    expect(ids()).toEqual([]);
  });

  it('does nothing with an empty queue', async () => {
    await flushAnswerQueue();
    expect(submit).not.toHaveBeenCalled();
  });

  it('stops notifying a listener after it unsubscribes', async () => {
    const listener = jest.fn();
    subscribeToFlush(listener)();
    useAnswerQueue.getState().enqueue(answer(1, 10));
    submit.mockResolvedValue(result());
    await flushAnswerQueue();
    expect(listener).not.toHaveBeenCalled();
  });
});
