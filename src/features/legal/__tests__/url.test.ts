import { legalLang, legalPath, localizedLegalUrl } from '@/features/legal/url';

describe('legalLang / legalPath', () => {
  it('asks for French only when the app language is French', () => {
    expect(legalLang('fr')).toBe('fr');
    expect(legalLang('fr-CA')).toBe('fr');
    expect(legalLang('FR')).toBe('fr');
    expect(legalLang('en')).toBeUndefined();
    expect(legalLang(undefined)).toBeUndefined();
    expect(legalPath('fr-CA')).toBe('/legal?lang=fr');
    expect(legalPath('en-US')).toBe('/legal');
  });
});

describe('localizedLegalUrl', () => {
  const terms = 'https://api.example/legal/terms';

  it('keeps the URL in English', () => {
    expect(localizedLegalUrl(terms, 'en')).toBe(terms);
  });

  it('adds lang=fr for French', () => {
    expect(localizedLegalUrl(terms, 'fr')).toBe(`${terms}?lang=fr`);
    expect(localizedLegalUrl(`${terms}?v=2`, 'fr')).toBe(`${terms}?v=2&lang=fr`);
    expect(localizedLegalUrl(`${terms}#cookies`, 'fr')).toBe(`${terms}?lang=fr#cookies`);
  });

  it('does not add lang twice (URLs from GET /legal?lang=fr already carry it)', () => {
    expect(localizedLegalUrl(`${terms}?lang=fr`, 'fr')).toBe(`${terms}?lang=fr`);
    expect(localizedLegalUrl(`${terms}?a=1&lang=fr`, 'fr-CA')).toBe(`${terms}?a=1&lang=fr`);
  });
});
