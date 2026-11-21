import type { ClassroomCodeCard, ClassroomSummaryRow } from '@/api/types';
import { groupCode } from '@/lib/code';

/**
 * Printable pages for the Classroom tools (code cards, class summary), pure logic. They are
 * paper documents, printed in ink: plain black on white with CSS colour keywords, not the app
 * theme. Every value from the server is HTML-escaped. The page is handed to the printer as a
 * document (never a URL), so sign-in codes never end up in an address or a history.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title: string, lang: string, style: string, body: string): string {
  return `<!doctype html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title><style>${style}</style></head><body>${body}</body></html>`;
}

const BASE_STYLE =
  '*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:black;background:white;margin:16px}' +
  'h1{font-size:20px;margin:0 0 4px}p.sub{margin:0 0 16px;color:dimgray;font-size:12px}' +
  '@page{margin:12mm}';

export interface CodeCardLabels {
  /** Document title, e.g. "Sign-in cards · Grade 4B". */
  title: string;
  /** Under the title, e.g. "Cut along the lines. Each code works once." */
  subtitle: string;
  /** Short "how to sign in" line on each card. */
  howTo: string;
  /** Formats the expiry line from `expires_at`, e.g. "Use by Dec 5, 2026". */
  expires: (iso: string) => string;
  lang: string;
}

/** A grid of cut-out cards (avatar, nickname, code, expiry, how to sign in). */
export function codeCardsHtml(
  cards: readonly ClassroomCodeCard[],
  labels: CodeCardLabels,
  avatarSvg: (avatar: string | null) => string | null,
): string {
  const style =
    BASE_STYLE +
    '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0}' +
    '.card{border:1px dashed gray;padding:12px;min-height:190px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;break-inside:avoid;page-break-inside:avoid}' +
    '.avatar{width:56px;height:56px}.avatar svg{width:56px;height:56px}' +
    '.name{font-weight:700;font-size:16px;word-break:break-word}' +
    '.code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:3px;border:2px solid black;border-radius:8px;padding:4px 8px;margin:4px 0}' +
    '.exp{font-size:11px;color:dimgray}.how{font-size:11px}' +
    '@media print{body{margin:0}p.sub{margin-bottom:8px}}';
  const items = cards
    .map((card) => {
      const svg = avatarSvg(card.avatar);
      return (
        `<div class="card">` +
        (svg ? `<div class="avatar">${svg}</div>` : '') +
        `<div class="name">${escapeHtml(card.nickname)}</div>` +
        `<div class="code">${escapeHtml(groupCode(card.code))}</div>` +
        `<div class="exp">${escapeHtml(labels.expires(card.expires_at))}</div>` +
        `<div class="how">${escapeHtml(labels.howTo)}</div>` +
        `</div>`
      );
    })
    .join('');
  return page(
    labels.title,
    labels.lang,
    style,
    `<h1>${escapeHtml(labels.title)}</h1><p class="sub">${escapeHtml(labels.subtitle)}</p><div class="grid">${items}</div>`,
  );
}

/** Plain-text list of the cards (share / copy fallback when printing isn't available). */
export function codeCardsText(
  cards: readonly ClassroomCodeCard[],
  labels: Pick<CodeCardLabels, 'title' | 'howTo' | 'expires'>,
): string {
  const lines = cards.map(
    (card) => `${card.nickname}: ${groupCode(card.code)} (${labels.expires(card.expires_at)})`,
  );
  return [labels.title, labels.howTo, '', ...lines].join('\n');
}

export interface SummaryLabels {
  title: string;
  subtitle: string;
  /** Column headers, in the order of `SUMMARY_COLUMNS`. */
  columns: Record<SummaryColumn, string>;
  /** Formats `last_played_at`; `null` → e.g. "Not yet". */
  lastPlayed: (iso: string | null) => string;
  number: (value: number) => string;
  lang: string;
}

export type SummaryColumn =
  'nickname' | 'points' | 'games' | 'accuracy' | 'currentStreak' | 'longestStreak' | 'lastPlayed';

export const SUMMARY_COLUMNS: readonly SummaryColumn[] = [
  'nickname',
  'points',
  'games',
  'accuracy',
  'currentStreak',
  'longestStreak',
  'lastPlayed',
];

/** One row as display strings, in `SUMMARY_COLUMNS` order. */
export function summaryCells(
  row: ClassroomSummaryRow,
  labels: Pick<SummaryLabels, 'lastPlayed' | 'number'>,
): string[] {
  return [
    row.nickname,
    labels.number(row.points),
    labels.number(row.games),
    row.accuracy_percent === null || row.accuracy_percent === undefined
      ? '–'
      : `${labels.number(row.accuracy_percent)} %`,
    labels.number(row.current_streak),
    labels.number(row.longest_streak),
    labels.lastPlayed(row.last_played_at),
  ];
}

/** The class summary as a printable table. */
export function summaryHtml(rows: readonly ClassroomSummaryRow[], labels: SummaryLabels): string {
  const style =
    BASE_STYLE +
    'table{border-collapse:collapse;width:100%;font-size:12px}' +
    'th,td{border:1px solid silver;padding:4px 6px;text-align:right}' +
    'th:first-child,td:first-child{text-align:left}th{background:whitesmoke}' +
    'tr{break-inside:avoid;page-break-inside:avoid}';
  const head = SUMMARY_COLUMNS.map((c) => `<th>${escapeHtml(labels.columns[c])}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${summaryCells(row, labels)
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  return page(
    labels.title,
    labels.lang,
    style,
    `<h1>${escapeHtml(labels.title)}</h1><p class="sub">${escapeHtml(labels.subtitle)}</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
  );
}
