import { scrubBreadcrumb, scrubEvent } from '@/features/app/sentryScrub';

const SECRET = 'my secret family message 🎉';

describe('Sentry scrubbing', () => {
  it('keeps only method, path and status of fetch breadcrumbs (no chat body)', () => {
    const crumb = scrubBreadcrumb({
      category: 'fetch',
      data: {
        method: 'POST',
        url: 'https://api.brainyclan.com/api/v1/family/chat/messages?x=1',
        status_code: 201,
        body: JSON.stringify({ body: SECRET, client_id: 'abc' }),
        response_body: SECRET,
      },
    });
    expect(crumb.data).toEqual({
      method: 'POST',
      url: 'https://api.brainyclan.com/api/v1/family/chat/messages',
      status_code: 201,
    });
    expect(JSON.stringify(crumb)).not.toContain(SECRET);
  });

  it('drops console output and any other crumb carrying a body or a chat URL', () => {
    expect(scrubBreadcrumb({ category: 'console', message: SECRET }).message).toBeUndefined();
    expect(
      JSON.stringify(scrubBreadcrumb({ category: 'custom', data: { body: SECRET } })),
    ).not.toContain(SECRET);
    const chat = scrubBreadcrumb({
      category: 'navigation',
      message: `/family/chat ${SECRET}`,
    });
    expect(JSON.stringify(chat)).not.toContain(SECRET);
    // Unrelated crumbs stay as they were.
    expect(scrubBreadcrumb({ category: 'navigation', message: '/play' }).message).toBe('/play');
  });

  it('strips request data, user fields and extra bodies from events', () => {
    const event = scrubEvent({
      request: {
        method: 'POST',
        url: 'https://api/v1/family/chat/messages?before=3',
        data: { body: SECRET },
      },
      user: { id: '7', username: 'Sam' },
      extra: { body: SECRET, screen: 'chat' },
      breadcrumbs: [{ category: 'xhr', data: { url: '/family/chat/messages', body: SECRET } }],
    });
    expect(event.request).toEqual({ method: 'POST', url: 'https://api/v1/family/chat/messages' });
    expect(event.user).toEqual({ id: '7' });
    expect(event.extra).toEqual({ screen: 'chat' });
    expect(JSON.stringify(event)).not.toContain(SECRET);
  });
});
