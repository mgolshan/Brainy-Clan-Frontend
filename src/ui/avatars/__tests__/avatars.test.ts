import { createInstance, type TFunction } from 'i18next';

import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import { avatarLabel } from '@/lib/labels';
import {
  AVATAR_KEYS,
  clanSvg,
  groupForAgeBand,
  groupKeys,
  groupOfKey,
  isAvatarKey,
  orderedGroups,
  parseAvatarKey,
} from '@/ui/avatars';
import { CLAN_SVGS } from '@/ui/avatars/clanSvgs.generated';

// Copied from docs/API.md "Avatars" (the contract), so a drift in either place fails here.
const CONTRACT_SPECIES =
  'fox, owl, panda, lion, koala, penguin, tiger, rabbit, bear, frog, cat, dog, unicorn, dragon, turtle, octopus, elephant, giraffe, hedgehog, otter, raccoon, monkey'.split(
    ', ',
  );
const CONTRACT_VARIANTS = ['', 'teen', 'mom', 'dad', 'grandma', 'grandpa'];
const CONTRACT_KEYS = CONTRACT_SPECIES.flatMap((s) =>
  CONTRACT_VARIANTS.map((v) => (v ? `${s}-${v}` : s)),
);

describe('Clan avatar keys', () => {
  it('match the 132 keys of the API contract exactly', () => {
    expect(CONTRACT_KEYS).toHaveLength(132);
    expect([...AVATAR_KEYS].sort()).toEqual([...CONTRACT_KEYS].sort());
    expect(new Set(AVATAR_KEYS).size).toBe(132);
  });

  it('each key has exactly one generated SVG', () => {
    expect(Object.keys(CLAN_SVGS).sort()).toEqual([...CONTRACT_KEYS].sort());
    for (const key of AVATAR_KEYS) {
      const svg = CLAN_SVGS[key];
      expect(svg).toMatch(/^<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg' viewBox='0 0 256 256'>/);
      expect(svg.endsWith('</svg>')).toBe(true);
      // No ids / url(#…) references: many avatars share one web page, ids would clash.
      expect(svg).not.toMatch(/\sid=|url\(#/);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  it('keeps every old (pre-Clan) key valid as the kid character', () => {
    for (const old of CONTRACT_SPECIES.slice(0, 16)) {
      expect(isAvatarKey(old)).toBe(true);
      expect(parseAvatarKey(old)).toEqual({ species: old, variant: 'kid' });
    }
  });

  it('parses species and variant, rejects anything else', () => {
    expect(parseAvatarKey('tiger-mom')).toEqual({ species: 'tiger', variant: 'mom' });
    expect(parseAvatarKey('raccoon-grandpa')).toEqual({ species: 'raccoon', variant: 'grandpa' });
    for (const bad of [null, undefined, '', 'tiger-kid', 'tiger-aunt', 'wolf', 'Tiger', 7]) {
      expect(isAvatarKey(bad)).toBe(false);
      expect(parseAvatarKey(bad)).toBeNull();
      expect(clanSvg(bad)).toBeNull();
    }
    expect(clanSvg('owl')).toBe(CLAN_SVGS.owl);
  });
});

describe('picker groups', () => {
  it('cover every key once', () => {
    const all = (['kids', 'teens', 'parents', 'grandparents'] as const).flatMap(groupKeys);
    expect(all.sort()).toEqual([...AVATAR_KEYS].sort());
    expect(groupKeys('parents').slice(0, 2)).toEqual(['fox-mom', 'fox-dad']);
    expect(groupOfKey('owl')).toBe('kids');
    expect(groupOfKey('owl-grandma')).toBe('grandparents');
    expect(groupOfKey('nope')).toBeNull();
  });

  it('put the group of the policy age band first, without hiding any', () => {
    expect(orderedGroups('child')).toEqual(['kids', 'teens', 'parents', 'grandparents']);
    expect(orderedGroups('teen')[0]).toBe('teens');
    expect(orderedGroups('adult')[0]).toBe('parents');
    expect(orderedGroups('senior')).toEqual(['grandparents', 'kids', 'teens', 'parents']);
    expect(orderedGroups('martian')).toEqual(['kids', 'teens', 'parents', 'grandparents']);
    expect(orderedGroups(null)).toHaveLength(4);
    expect(groupForAgeBand(undefined)).toBeNull();
  });
});

describe('avatarLabel', () => {
  async function tFor(lng: 'en' | 'fr') {
    const i18n = createInstance();
    await i18n.init({
      lng,
      resources: { en: { translation: en }, fr: { translation: fr } },
      interpolation: { escapeValue: false },
    });
    return i18n.t.bind(i18n) as TFunction;
  }

  it('names species and variant in English and French', async () => {
    const enT = await tFor('en');
    const frT = await tFor('fr');
    expect(avatarLabel(enT, 'tiger-mom')).toBe('Tiger, mom');
    expect(avatarLabel(frT, 'tiger-mom')).toBe('Tigre, maman');
    expect(avatarLabel(frT, 'raccoon-grandpa')).toBe('Raton laveur, papi');
    expect(avatarLabel(enT, 'owl')).toBe('Owl, kid');
    expect(avatarLabel(enT, 'unknown')).toBeNull();
    for (const key of AVATAR_KEYS) {
      expect(avatarLabel(enT, key)).not.toMatch(/avatars\./);
      expect(avatarLabel(frT, key)).not.toMatch(/avatars\./);
    }
  });
});
