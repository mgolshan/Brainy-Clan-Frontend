import { THEME_KEYS } from '@/api/types';
import { themes, type ColorScheme, type ThemeColors } from '@/ui/themes';
import { contrastRatio } from '@/ui/themes/contrast';

/**
 * WCAG AA for every world in light and dark: 4.5:1 for normal text, 3:1 for large text
 * (feedback titles are ≥ 21px bold). Scenes never reduce text contrast: every large scene layer
 * (composited over the background) must keep the same ratios as the background itself.
 */
const AA = 4.5;
const AA_LARGE = 3;

type Pair = [label: string, fg: string, bg: string, min: number];

function pairs(c: ThemeColors): Pair[] {
  const out: Pair[] = [];
  const grounds: [string, string][] = [
    ['background', c.background],
    ['backgroundAlt', c.backgroundAlt],
    ['surface', c.surface],
    ['surfaceAlt', c.surfaceAlt],
    ['tabBar', c.tabBar],
    ...c.scene.map((s, i): [string, string] => [`scene[${i}]`, s]),
  ];
  for (const [name, bg] of grounds) {
    out.push([`text on ${name}`, c.text, bg, AA]);
    out.push([`textMuted on ${name}`, c.textMuted, bg, AA]);
  }
  for (const [name, bg] of grounds.slice(0, 5)) {
    out.push([`textSubtle on ${name}`, c.textSubtle, bg, AA]);
  }
  for (const [name, bg] of [
    ['background', c.background],
    ['surface', c.surface],
  ] as const) {
    out.push([`primary text on ${name}`, c.primary, bg, AA]);
    out.push([`danger text on ${name}`, c.danger, bg, AA]);
    out.push([`success text on ${name}`, c.success, bg, AA]);
    out.push([`warning text on ${name}`, c.warning, bg, AA]);
  }
  out.push(['onPrimary on primary', c.onPrimary, c.primary, AA]);
  out.push(['onSecondary on secondary', c.onSecondary, c.secondary, AA]);
  out.push(['onSuccess on success', c.onSuccess, c.success, AA]);
  out.push(['onDanger on danger', c.onDanger, c.danger, AA]);
  // Hero cards: onPrimary text over every gradient stop.
  c.gradient.forEach((stop, i) => out.push([`onPrimary on gradient[${i}]`, c.onPrimary, stop, AA]));
  // Feedback panel titles (large text) on their soft fills.
  out.push(['success title on successSoft', c.success, c.successSoft, AA_LARGE]);
  out.push(['danger title on dangerSoft', c.danger, c.dangerSoft, AA_LARGE]);
  out.push(['text on primarySoft', c.text, c.primarySoft, AA]);
  return out;
}

describe('theme contrast (WCAG AA)', () => {
  for (const key of THEME_KEYS) {
    for (const scheme of ['light', 'dark'] as ColorScheme[]) {
      it(`${key} · ${scheme}`, () => {
        const c = themes[key].colors[scheme];
        const failures = pairs(c)
          .map(([label, fg, bg, min]) => {
            // Translucent grounds sit on the screen background (cards on the scene).
            const ratio = contrastRatio(fg, bg, c.background);
            return { label, ratio: Math.round(ratio * 100) / 100, min };
          })
          .filter((r) => r.ratio < r.min);
        expect(failures).toEqual([]);
      });
    }
  }
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });

  it('composites translucent colors over the base', () => {
    // 50% black over white is mid grey.
    expect(contrastRatio('#FFFFFF', 'rgba(0,0,0,0.5)', '#FFFFFF')).toBeGreaterThan(3.9);
  });
});
