import type { Member, Policy } from '@/api/types';
import {
  DEFAULT_THEME,
  isThemeKey,
  selectAccessibility,
  selectThemeKey,
  themes,
} from '@/ui/themes';

const policy = (overrides: Partial<Policy> = {}) =>
  ({
    ui_theme: 'playful',
    accessibility_defaults: { text_scale: 1.2, reduced_motion: true, calm_timers: true },
    ...overrides,
  }) as Policy;

const member = (accessibility: Partial<Member['accessibility']> | null) =>
  ({ accessibility }) as unknown as Member;

describe('selectThemeKey', () => {
  it('uses the member override first', () => {
    expect(selectThemeKey(policy(), member({ theme: 'classic' }))).toBe('classic');
  });

  it('falls back to the policy theme when the member has no override', () => {
    expect(selectThemeKey(policy(), member({ theme: null }))).toBe('playful');
    expect(selectThemeKey(policy({ ui_theme: 'sleek' }), member(null))).toBe('sleek');
    expect(selectThemeKey(policy({ ui_theme: 'sleek' }), null)).toBe('sleek');
  });

  it('is modern when signed out', () => {
    expect(selectThemeKey()).toBe('modern');
    expect(selectThemeKey(null, null)).toBe(DEFAULT_THEME);
  });

  it('ignores unknown theme keys from the API at every level', () => {
    const unknown = 'dino' as never;
    expect(selectThemeKey(policy(), member({ theme: unknown }))).toBe('playful');
    expect(selectThemeKey(policy({ ui_theme: unknown }), member({ theme: unknown }))).toBe(
      'modern',
    );
  });

  it('ignores inherited object keys such as "constructor"', () => {
    expect(isThemeKey('constructor')).toBe(false);
    expect(isThemeKey('toString')).toBe(false);
    expect(selectThemeKey(policy({ ui_theme: 'toString' as never }), null)).toBe('modern');
  });

  it('knows every world of the contract', () => {
    expect(Object.keys(themes).sort()).toEqual([
      'classic',
      'jungle',
      'modern',
      'neon',
      'playful',
      'sleek',
      'space',
    ]);
    expect(selectThemeKey(policy(), member({ theme: 'neon' }))).toBe('neon');
    expect(selectThemeKey(policy({ ui_theme: 'jungle' }), member({ theme: null }))).toBe('jungle');
    expect(isThemeKey(42)).toBe(false);
  });
});

describe('selectAccessibility', () => {
  it('prefers member settings, then policy defaults, then neutral values', () => {
    expect(
      selectAccessibility(policy(), member({ text_scale: 1.5, reduced_motion: false })),
    ).toEqual({
      text_scale: 1.5,
      reduced_motion: false,
      calm_timers: true,
      sound_effects: false,
    });
    expect(selectAccessibility(null, null)).toEqual({
      text_scale: 1,
      reduced_motion: false,
      calm_timers: false,
      sound_effects: false,
    });
  });

  it('resolves sound effects: member, then the policy default, then off', () => {
    const kid = policy({
      accessibility_defaults: {
        text_scale: 1,
        reduced_motion: false,
        calm_timers: false,
        sound_effects: true,
      },
    });
    expect(selectAccessibility(kid, member({ sound_effects: null })).sound_effects).toBe(true);
    expect(selectAccessibility(kid, member({ sound_effects: false })).sound_effects).toBe(false);
  });
});
