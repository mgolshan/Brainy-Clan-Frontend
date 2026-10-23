/** The Clan characters: avatar keys, species/variant helpers and the generated SVG art. */
import { CLAN_SVGS } from '@/ui/avatars/clanSvgs.generated';
import { isAvatarKey } from '@/ui/avatars/keys';

export * from '@/ui/avatars/keys';

/** SVG markup for a valid key, null for unknown / missing keys (render a placeholder). */
export function clanSvg(key: unknown): string | null {
  return isAvatarKey(key) ? CLAN_SVGS[key] : null;
}
