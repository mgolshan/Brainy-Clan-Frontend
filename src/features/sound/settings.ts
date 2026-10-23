import type { Member, Policy } from '@/api/types';

/**
 * Sound effects (and the haptics that go with them) are on when the member says so, else when
 * the member's policy default says so (`accessibility_defaults.sound_effects`), else off.
 * The app never decides this by age itself.
 */
export function resolveSoundEnabled(
  policy?: Pick<Policy, 'accessibility_defaults'> | null,
  member?: Pick<Member, 'accessibility'> | null,
): boolean {
  return (
    member?.accessibility?.sound_effects ?? policy?.accessibility_defaults?.sound_effects ?? false
  );
}
