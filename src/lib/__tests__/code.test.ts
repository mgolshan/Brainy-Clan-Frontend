import { CODE_LENGTH, groupCode, normalizeCode } from '@/lib/code';

describe('normalizeCode', () => {
  it.each([
    ['k7qm4xpa', 'K7QM4XPA'],
    ['K7QM-4XPA', 'K7QM4XPA'],
    ['K7QM 4XPA', 'K7QM4XPA'],
    ['  k7qm 4xpa  ', 'K7QM4XPA'],
    ['k7qm\t4xpa\n', 'K7QM4XPA'],
    ['K7QM–4XPA', 'K7QM4XPA'], // en dash from a pasted message
  ])('turns %p into %p', (input, expected) => {
    expect(normalizeCode(input)).toBe(expected);
  });

  it('drops characters outside the code alphabet (no 0, O, 1, I)', () => {
    expect(normalizeCode('0O1I23')).toBe('23');
    expect(normalizeCode('ABCDEFGH')).toBe('ABCDEFGH');
    expect(normalizeCode('JKLMNPQR')).toBe('JKLMNPQR');
  });

  it('drops accented letters instead of guessing', () => {
    expect(normalizeCode('éÉ')).toBe('');
  });

  it(`caps the code at ${CODE_LENGTH} characters`, () => {
    expect(normalizeCode('K7QM4XPAZZZ')).toBe('K7QM4XPA');
    expect(normalizeCode('K7QM4XPAZZZ')).toHaveLength(CODE_LENGTH);
  });

  it('keeps a partial code while typing', () => {
    expect(normalizeCode('k7q')).toBe('K7Q');
    expect(normalizeCode('')).toBe('');
  });
});

describe('groupCode', () => {
  it('splits after four characters', () => {
    expect(groupCode('K7QM4XPA')).toBe('K7QM 4XPA');
    expect(groupCode('K7QM4XPA', '-')).toBe('K7QM-4XPA');
  });

  it('leaves short codes alone', () => {
    expect(groupCode('K7QM')).toBe('K7QM');
    expect(groupCode('K7QM4')).toBe('K7QM 4');
  });

  it('round-trips with normalizeCode', () => {
    expect(normalizeCode(groupCode('K7QM4XPA'))).toBe('K7QM4XPA');
  });
});
