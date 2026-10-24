import { HELP_ANCHORS, WEBSITE_LINKS, WEBSITE_URL, helpUrl } from '@/config/links';

describe('helpUrl', () => {
  const base = 'https://brainyclan.com/help';

  it('points at the website help center', () => {
    expect(WEBSITE_LINKS.help).toBe(`${WEBSITE_URL}/help`);
    expect(helpUrl('en', undefined, base)).toBe(base);
    expect(helpUrl(undefined, undefined, base)).toBe(base);
  });

  it('asks for French only when the app language is French', () => {
    expect(helpUrl('fr', undefined, base)).toBe(`${base}?lang=fr`);
    expect(helpUrl('fr-CA', undefined, base)).toBe(`${base}?lang=fr`);
    expect(helpUrl('FR', undefined, base)).toBe(`${base}?lang=fr`);
    expect(helpUrl('en-US', undefined, base)).toBe(base);
    expect(helpUrl('de', undefined, base)).toBe(base);
  });

  it('opens an article with its anchor, after the query string', () => {
    expect(helpUrl('en', 'invite-kids', base)).toBe(`${base}#invite-kids`);
    expect(helpUrl('fr', 'sign-in-code', base)).toBe(`${base}?lang=fr#sign-in-code`);
    expect(helpUrl('fr-CA', 'family-chat', base)).toBe(`${base}?lang=fr#family-chat`);
  });

  it('uses the configured website by default', () => {
    expect(helpUrl('fr', 'family-chat')).toBe(`${WEBSITE_URL}/help?lang=fr#family-chat`);
  });

  it('only knows anchors that are plain page ids', () => {
    expect(HELP_ANCHORS.length).toBeGreaterThan(0);
    for (const anchor of HELP_ANCHORS) {
      expect(anchor).toMatch(/^[a-z][a-z-]+$/);
    }
  });
});
