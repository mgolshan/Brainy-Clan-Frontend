import { fetchSummaryCsv } from '@/features/classroom/api';
import {
  parsePeriod,
  slugify,
  summaryCsvPath,
  summaryFileName,
  summaryPath,
} from '@/features/classroom/summary';

jest.mock('@/store/session', () => ({
  useSession: { getState: () => ({ token: 'test-token', clear: jest.fn() }) },
}));

describe('period', () => {
  it('defaults to season for anything but all', () => {
    expect(parsePeriod('all')).toBe('all');
    expect(parsePeriod('season')).toBe('season');
    expect(parsePeriod(undefined)).toBe('season');
    expect(parsePeriod('week')).toBe('season');
    expect(parsePeriod(['all', 'season'])).toBe('all');
  });

  it('builds the summary paths', () => {
    expect(summaryPath('season')).toBe('/family/classroom/summary?period=season');
    expect(summaryCsvPath('all')).toBe('/family/classroom/summary.csv?period=all');
  });
});

describe('summaryFileName', () => {
  const now = new Date('2026-11-21T15:00:00Z');

  it('uses the class name, the period and the generated day', () => {
    expect(summaryFileName('Grade 4B', 'season', 'csv', '2026-11-20T23:00:00Z', now)).toBe(
      'brainy-clan-grade-4b-season-2026-11-20.csv',
    );
    expect(summaryFileName('Grade 4B', 'all', 'pdf', null, now)).toBe(
      'brainy-clan-grade-4b-all-2026-11-21.pdf',
    );
    expect(summaryFileName('Grade 4B', 'all', 'csv', 'not a date', now)).toBe(
      'brainy-clan-grade-4b-all-2026-11-21.csv',
    );
  });

  it('slugifies accents, symbols and empty names', () => {
    expect(slugify('Classe de Mme Bélanger — 5e année!')).toBe('classe-de-mme-belanger-5e-annee');
    expect(slugify('🦊🦊')).toBe('class');
    expect(slugify('  ')).toBe('class');
    expect(slugify('a'.repeat(60)).length).toBe(40);
    expect(slugify(`${'a'.repeat(39)} b`)).toBe('a'.repeat(39));
  });
});

describe('fetchSummaryCsv', () => {
  let fetchMock: jest.Mock;
  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  const respond = (status: number, contentType: string, body: string) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => (name === 'content-type' ? contentType : null) },
      json: () => Promise.resolve(JSON.parse(body)),
      text: () => Promise.resolve(body),
    });

  it('sends the Bearer token in the header and returns the file text', async () => {
    fetchMock.mockReturnValueOnce(
      respond(200, 'text/csv; charset=UTF-8', 'Nickname,Points\nAva,412\n'),
    );
    await expect(fetchSummaryCsv('season')).resolves.toBe('Nickname,Points\nAva,412\n');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/family\/classroom\/summary\.csv\?period=season$/);
    expect(url).not.toContain('test-token');
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('turns a JSON error into an ApiError with its code', async () => {
    fetchMock.mockReturnValueOnce(
      respond(
        409,
        'application/json',
        JSON.stringify({ message: 'Consent', code: 'classroom_consent_required' }),
      ),
    );
    await expect(fetchSummaryCsv('all')).rejects.toMatchObject({
      status: 409,
      code: 'classroom_consent_required',
    });
  });

  it('rejects a body that is not a file', async () => {
    fetchMock.mockReturnValueOnce(respond(200, 'application/json', '{"data":[]}'));
    await expect(fetchSummaryCsv('all')).rejects.toThrow('unexpected summary file');
  });
});
