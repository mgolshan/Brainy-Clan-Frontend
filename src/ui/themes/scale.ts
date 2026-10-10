import type { TypeStyle, TypeVariant } from '@/ui/themes/types';

/** [size, lineHeight, letterSpacing] per variant -> TypeStyle record. */
export function typeScale(
  spec: Record<TypeVariant, [number, number, number]>,
): Record<TypeVariant, TypeStyle> {
  const out = {} as Record<TypeVariant, TypeStyle>;
  for (const key of Object.keys(spec) as TypeVariant[]) {
    const [size, lineHeight, letterSpacing] = spec[key];
    out[key] = { size, lineHeight, letterSpacing };
  }
  return out;
}
