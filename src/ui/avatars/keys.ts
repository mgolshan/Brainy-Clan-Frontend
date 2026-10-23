/**
 * The Clan avatar keys from the API contract (docs/API.md "Avatars"): 22 species × 6 variants.
 * `<species>` is the kid character, `<species>-<variant>` the others (e.g. `tiger-mom`).
 * Any member may pick any key; the picker only orders the groups by the member's policy age band.
 */

export const AVATAR_SPECIES = [
  'fox',
  'owl',
  'panda',
  'lion',
  'koala',
  'penguin',
  'tiger',
  'rabbit',
  'bear',
  'frog',
  'cat',
  'dog',
  'unicorn',
  'dragon',
  'turtle',
  'octopus',
  'elephant',
  'giraffe',
  'hedgehog',
  'otter',
  'raccoon',
  'monkey',
] as const;
export type AvatarSpecies = (typeof AVATAR_SPECIES)[number];

export const AVATAR_VARIANTS = ['kid', 'teen', 'mom', 'dad', 'grandma', 'grandpa'] as const;
export type AvatarVariant = (typeof AVATAR_VARIANTS)[number];

export type AvatarKey = AvatarSpecies | `${AvatarSpecies}-${Exclude<AvatarVariant, 'kid'>}`;

export function avatarKey(species: AvatarSpecies, variant: AvatarVariant): AvatarKey {
  return variant === 'kid' ? species : `${species}-${variant}`;
}

/** All 132 keys, species-major (fox, fox-teen, fox-mom, …). */
export const AVATAR_KEYS: readonly AvatarKey[] = AVATAR_SPECIES.flatMap((s) =>
  AVATAR_VARIANTS.map((v) => avatarKey(s, v)),
);

const KEY_SET: ReadonlySet<string> = new Set(AVATAR_KEYS);

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === 'string' && KEY_SET.has(value);
}

export interface AvatarParts {
  species: AvatarSpecies;
  variant: AvatarVariant;
}

/** Species + variant of a key, or null for anything outside the contract set. */
export function parseAvatarKey(value: unknown): AvatarParts | null {
  if (!isAvatarKey(value)) return null;
  const dash = value.indexOf('-');
  if (dash < 0) return { species: value as AvatarSpecies, variant: 'kid' };
  return {
    species: value.slice(0, dash) as AvatarSpecies,
    variant: value.slice(dash + 1) as AvatarVariant,
  };
}

// ---------------------------------------------------------------------------
// picker groups
// ---------------------------------------------------------------------------

export const AVATAR_GROUPS = ['kids', 'teens', 'parents', 'grandparents'] as const;
export type AvatarGroup = (typeof AVATAR_GROUPS)[number];

export const GROUP_VARIANTS: Record<AvatarGroup, readonly AvatarVariant[]> = {
  kids: ['kid'],
  teens: ['teen'],
  parents: ['mom', 'dad'],
  grandparents: ['grandma', 'grandpa'],
};

/** Keys of a picker group, species by species (tiger-mom next to tiger-dad). */
export function groupKeys(group: AvatarGroup): AvatarKey[] {
  return AVATAR_SPECIES.flatMap((s) => GROUP_VARIANTS[group].map((v) => avatarKey(s, v)));
}

export function groupOfKey(value: unknown): AvatarGroup | null {
  const parts = parseAvatarKey(value);
  if (!parts) return null;
  return AVATAR_GROUPS.find((g) => GROUP_VARIANTS[g].includes(parts.variant)) ?? null;
}

/**
 * The picker group suggested for a policy age band (the band comes from the API; this only maps
 * the seeded band codes to a group for ordering). Unknown bands suggest nothing.
 */
const BAND_GROUP: Record<string, AvatarGroup> = {
  child: 'kids',
  teen: 'teens',
  adult: 'parents',
  senior: 'grandparents',
};

export function groupForAgeBand(band: string | null | undefined): AvatarGroup | null {
  return (band && BAND_GROUP[band]) || null;
}

/** All groups with the one suggested for the band first (ordering only, nothing is hidden). */
export function orderedGroups(band: string | null | undefined): AvatarGroup[] {
  const first = groupForAgeBand(band);
  return first ? [first, ...AVATAR_GROUPS.filter((g) => g !== first)] : [...AVATAR_GROUPS];
}
