import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';

type Tree = { [key: string]: string | Tree };

const locales: Record<string, Tree> = { en, fr };

/** Flat `a.b.c` → value map of a locale file. */
function flatten(tree: Tree, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of flatten(value, path)) out.set(k, v);
    } else {
      out.set(path, value);
    }
  }
  return out;
}

/** i18next plural suffixes (CLDR categories). */
const PLURAL = /_(zero|one|two|few|many|other)$/;
const baseKey = (key: string) => key.replace(PLURAL, '');

/** `{{name}}` placeholders of a string. */
const placeholders = (text: string) =>
  [...text.matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)].map((m) => m[1]).sort();

const flat = Object.fromEntries(
  Object.entries(locales).map(([lang, tree]) => [lang, flatten(tree)]),
) as Record<string, Map<string, unknown>>;

const bases = (lang: string) => new Set([...flat[lang].keys()].map(baseKey));

describe.each(Object.keys(locales))('%s.json', (lang) => {
  it('has only non-empty string values', () => {
    const bad = [...flat[lang]]
      .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it('has every plural form its language needs', () => {
    const needed = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
    const pluralBases = new Set([...flat[lang].keys()].filter((k) => PLURAL.test(k)).map(baseKey));
    const missing: string[] = [];
    for (const base of pluralBases) {
      for (const category of needed) {
        if (!flat[lang].has(`${base}_${category}`)) missing.push(`${base}_${category}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('en.json ↔ fr.json parity', () => {
  it('every English key exists in French', () => {
    const fr = bases('fr');
    expect([...bases('en')].filter((key) => !fr.has(key))).toEqual([]);
  });

  it('every French key exists in English', () => {
    const en = bases('en');
    expect([...bases('fr')].filter((key) => !en.has(key))).toEqual([]);
  });

  it('a key is plural in both languages or in neither', () => {
    const plural = (lang: string) =>
      new Set([...flat[lang].keys()].filter((k) => PLURAL.test(k)).map(baseKey));
    const enPlural = plural('en');
    const frPlural = plural('fr');
    expect([...enPlural].filter((k) => !frPlural.has(k))).toEqual([]);
    expect([...frPlural].filter((k) => !enPlural.has(k))).toEqual([]);
  });

  it('translations use the same {{placeholders}}', () => {
    const mismatched: string[] = [];
    for (const [key, enValue] of flat.en) {
      // Compare with the French string of the same key, or of the same plural base.
      const frValue =
        flat.fr.get(key) ?? flat.fr.get(`${baseKey(key)}_other`) ?? flat.fr.get(baseKey(key));
      if (typeof enValue !== 'string' || typeof frValue !== 'string') continue;
      const a = placeholders(enValue).filter((p) => p !== 'count');
      const b = placeholders(frValue).filter((p) => p !== 'count');
      if (new Set(a).size !== new Set(b).size || [...new Set(a)].some((p) => !b.includes(p))) {
        mismatched.push(`${key}: en {${a.join(', ')}} fr {${b.join(', ')}}`);
      }
    }
    expect(mismatched).toEqual([]);
  });
});
