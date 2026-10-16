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
    const unknown = 'neon' as never;
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

  it('only knows the four themes', () => {
    expect(Object.keys(themes).sort()).toEqual(['classic', 'modern', 'playful', 'sleek']);
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
    });
    expect(selectAccessibility(null, null)).toEqual({
      text_scale: 1,
      reduced_motion: false,
      calm_timers: false,
    });
  });
});
