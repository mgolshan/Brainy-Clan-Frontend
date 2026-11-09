import { fetchSupportMessages, postSupportMessage } from '@/features/support/api';

jest.mock('@/store/session', () => ({
  useSession: { getState: () => ({ token: 'test-token', clear: jest.fn() }) },
}));

const message = {
  id: 12,
  topic: 'billing',
  message: 'My Family plan shows Free after renewing.',
  status: 'open',
  created_at: '2026-11-08T14:03:00Z',
  answered_at: null,
};

/** Just enough of a fetch Response for `apiRequest`. */
function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('support api', () => {
  it('POST /support/messages sends the JSON body and unwraps data', async () => {
    fetchMock.mockReturnValueOnce(respond(201, { data: message }));
    const body = {
      topic: 'billing' as const,
      message: message.message,
      client_id: '0b9c-uuid',
      app_version: '1.0.0',
      platform: 'ios' as const,
      device: 'iPad (iPadOS 18.1)',
    };
    await expect(postSupportMessage(body)).resolves.toEqual(message);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/support\/messages$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(body);
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('a repeated client_id answers 200 with the stored message', async () => {
    fetchMock.mockReturnValueOnce(respond(200, { data: message }));
    await expect(
      postSupportMessage({
        topic: 'billing',
        message: message.message,
        client_id: 'same',
        app_version: '1.0.0',
        platform: 'web',
      }),
    ).resolves.toEqual(message);
  });

  it('GET /support/messages returns the list', async () => {
    fetchMock.mockReturnValueOnce(respond(200, { data: [message] }));
    await expect(fetchSupportMessages()).resolves.toEqual([message]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/support\/messages$/);
    expect(init.method).toBe('GET');
  });

  it('429 surfaces as rate_limited', async () => {
    fetchMock.mockReturnValueOnce(respond(429, { message: 'Too many', code: 'rate_limited' }));
    await expect(fetchSupportMessages()).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
    });
  });
});
