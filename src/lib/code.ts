/** Alphabet of invite and sign-in codes (API.md: no 0/O/1/I). */
const NOT_IN_ALPHABET = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

export const CODE_LENGTH = 8;

/**
 * Forgiving code entry: upper-cases and drops spaces, dashes and anything outside the code
 * alphabet, so "k7qm-4xpa" or "K7QM 4XPA" (typed or pasted) becomes "K7QM4XPA".
 */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(NOT_IN_ALPHABET, '').slice(0, CODE_LENGTH);
}

/** "K7QM4XPA" → "K7QM 4XPA" (easier to read aloud and copy by hand). */
export function groupCode(code: string, separator = ' '): string {
  return code.length > 4 ? `${code.slice(0, 4)}${separator}${code.slice(4)}` : code;
}
