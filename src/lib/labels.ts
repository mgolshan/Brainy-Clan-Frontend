import type { TFunction } from 'i18next';

import { parseAvatarKey } from '@/ui/avatars/keys';

const BANDS = ['child', 'teen', 'adult', 'senior'] as const;
const TIERS = ['free', 'family'] as const;

/** Display label for an age band code from the API (unknown codes are shown as-is). */
export function ageBandLabel(t: TFunction, band: string): string {
  const known = BANDS.find((b) => b === band);
  return known ? t(`ageBands.${known}`) : band;
}

/** Display label for a family tier code from the API. */
export function tierLabel(t: TFunction, tier: string): string {
  const known = TIERS.find((x) => x === tier);
  return known ? t(`tiers.${known}`) : tier;
}

/** Accessible name of a Clan avatar: "Tiger, mom" / "Tigre, maman" (null for unknown keys). */
export function avatarLabel(t: TFunction, key: unknown): string | null {
  const parts = parseAvatarKey(key);
  if (!parts) return null;
  return t('avatars.label', {
    species: t(`avatars.${parts.species}`),
    variant: t(`avatars.variants.${parts.variant}`),
  });
}
