import { THEME_KEYS } from '@/api/types';
import { SOUND_PACKS } from '@/features/sound/types';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import { themes, WORLD_ORDER } from '@/ui/themes';

/** Every world of the contract is complete: pack, picker order, names and descriptions. */
describe('world catalog', () => {
  it('lists every contract world once in the picker order', () => {
    expect(new Set(WORLD_ORDER).size).toBe(WORLD_ORDER.length);
    expect([...WORLD_ORDER].sort()).toEqual([...THEME_KEYS].sort());
  });

  for (const key of THEME_KEYS) {
    it(`${key} is complete`, () => {
      const world = themes[key];
      expect(world.key).toBe(key);
      expect(world.displayName).toBe(`appearance.themes.${key}`);
      expect(SOUND_PACKS).toContain(world.soundPack);
      for (const locale of [en, fr]) {
        expect(locale.appearance.themes[key]).toEqual(expect.any(String));
        expect(locale.appearance.themeDescriptions[key]).toEqual(expect.any(String));
      }
    });
  }

  it('gives each phase-2 world its own scene and sound pack', () => {
    for (const key of ['sea', 'dino', 'sticker', 'lofi', 'nature', 'midnight'] as const) {
      expect(themes[key].scene).toBe(key);
      expect(themes[key].soundPack).toBe(key);
    }
  });
});
