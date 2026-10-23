import type { Member, Policy } from '@/api/types';
import { selectThemeKey } from '@/ui/themes';

const policy = { ui_theme: 'playful' } as Policy;

const member = (fields: Partial<Member>) =>
  ({ accessibility: { theme: 'jungle' }, default_ui_theme: 'sleek', ...fields }) as Member;

describe('selectThemeKey with world unlocks (theme_unlocked)', () => {
  it('uses the stored world while it is unlocked (or the flag is absent)', () => {
    expect(selectThemeKey(policy, member({ theme_unlocked: true }))).toBe('jungle');
    expect(selectThemeKey(policy, member({}))).toBe('jungle');
  });

  it('shows the default_ui_theme of the member when the stored world is locked again', () => {
    expect(selectThemeKey(policy, member({ theme_unlocked: false }))).toBe('sleek');
  });

  it('falls back to the policy theme when default_ui_theme is unknown', () => {
    expect(
      selectThemeKey(
        policy,
        member({ theme_unlocked: false, default_ui_theme: 'future-world' as never }),
      ),
    ).toBe('playful');
  });
});
