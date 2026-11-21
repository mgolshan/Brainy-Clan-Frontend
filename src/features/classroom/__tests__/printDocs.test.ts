import type { ClassroomCodeCard, ClassroomSummaryRow } from '@/api/types';
import {
  codeCardsHtml,
  codeCardsText,
  escapeHtml,
  SUMMARY_COLUMNS,
  summaryCells,
  summaryHtml,
  type SummaryLabels,
} from '@/features/classroom/printDocs';

const card = (over: Partial<ClassroomCodeCard> = {}): ClassroomCodeCard => ({
  member_id: 9,
  nickname: 'Ava',
  avatar: 'fox_kid',
  code: 'K7QM4XPA',
  expires_at: '2026-12-05T12:00:00Z',
  ...over,
});

const cardLabels = {
  title: 'Sign-in cards · Grade 4B',
  subtitle: 'Cut along the lines.',
  howTo: 'Open Brainy Clan and type this code.',
  expires: (iso: string) => `Use by ${iso.slice(0, 10)}`,
  lang: 'en',
};

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;',
    );
  });
});

describe('codeCardsHtml', () => {
  it('prints one card per code with the grouped code, expiry and how-to line', () => {
    const html = codeCardsHtml(
      [card(), card({ member_id: 10, nickname: 'Noah', code: 'ABCD2345' })],
      cardLabels,
      () => '<svg id="a"></svg>',
    );
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html.match(/class="card"/g)).toHaveLength(2);
    expect(html).toContain('K7QM 4XPA');
    expect(html).toContain('ABCD 2345');
    expect(html).toContain('Use by 2026-12-05');
    expect(html).toContain('Open Brainy Clan and type this code.');
    expect(html).toContain('<svg id="a"></svg>');
  });

  it('escapes nicknames and leaves out a missing avatar', () => {
    const html = codeCardsHtml(
      [card({ nickname: '<img src=x onerror=alert(1)>', avatar: null })],
      cardLabels,
      () => null,
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('class="avatar"');
  });
});

describe('codeCardsText', () => {
  it('lists every student with the grouped code', () => {
    expect(codeCardsText([card()], cardLabels)).toBe(
      'Sign-in cards · Grade 4B\nOpen Brainy Clan and type this code.\n\nAva: K7QM 4XPA (Use by 2026-12-05)',
    );
  });
});

describe('summary print', () => {
  const row = (over: Partial<ClassroomSummaryRow> = {}): ClassroomSummaryRow => ({
    member_id: 9,
    nickname: 'Ava',
    role: 'member',
    points: 1412,
    games: 37,
    accuracy_percent: 81,
    current_streak: 3,
    longest_streak: 9,
    last_played_at: '2026-11-20T18:00:00Z',
    ...over,
  });
  const labels: SummaryLabels = {
    title: 'Class summary · Grade 4B',
    subtitle: 'This season',
    columns: Object.fromEntries(
      SUMMARY_COLUMNS.map((c) => [c, c.toUpperCase()]),
    ) as SummaryLabels['columns'],
    lastPlayed: (iso) => (iso ? iso.slice(0, 10) : 'Not yet'),
    number: (value) => value.toLocaleString('en-US'),
    lang: 'en',
  };

  it('formats the cells in column order', () => {
    expect(summaryCells(row(), labels)).toEqual([
      'Ava',
      '1,412',
      '37',
      '81 %',
      '3',
      '9',
      '2026-11-20',
    ]);
    expect(summaryCells(row({ accuracy_percent: null, last_played_at: null }), labels)).toEqual([
      'Ava',
      '1,412',
      '37',
      '–',
      '3',
      '9',
      'Not yet',
    ]);
  });

  it('prints a table with a header and one escaped row per member', () => {
    const html = summaryHtml([row(), row({ member_id: 10, nickname: 'Mia & Co' })], labels);
    expect(html.match(/<tr>/g)).toHaveLength(3);
    expect(html).toContain('<th>NICKNAME</th>');
    expect(html).toContain('Mia &amp; Co');
  });
});
