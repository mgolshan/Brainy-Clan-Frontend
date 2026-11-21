import { ApiError } from '@/api/client';
import {
  MIN_FAMILY_OWNER_AGE,
  ageFromBirth,
  createFamilyMinAgeMissed,
  isUnderAge,
  knownAge,
  ownerTooYoungMinAge,
} from '@/lib/age';

// 20 November 2026 (local time).
const NOW = new Date(2026, 10, 20);

const tooYoung = (body: unknown) =>
  new ApiError(403, 'Too young', 'owner_too_young', body ?? undefined);

describe('ageFromBirth (same rule as the backend PolicyResolver::age)', () => {
  it('counts whole years, one less before the birth month', () => {
    expect(ageFromBirth(2010, 11, NOW)).toBe(16); // birth month = this month → birthday counted
    expect(ageFromBirth(2010, 12, NOW)).toBe(15); // birthday next month
    expect(ageFromBirth(2010, 1, NOW)).toBe(16);
    expect(ageFromBirth(2008, 12, NOW)).toBe(17);
    expect(ageFromBirth(2008, 11, NOW)).toBe(18);
  });

  it('treats an unknown month as January', () => {
    expect(ageFromBirth(2010, null, NOW)).toBe(16);
    expect(ageFromBirth(2010, undefined, new Date(2026, 0, 1))).toBe(16);
  });

  it('is null without a birth year and never negative', () => {
    expect(ageFromBirth(null, 5, NOW)).toBeNull();
    expect(ageFromBirth(undefined, undefined, NOW)).toBeNull();
    expect(ageFromBirth(Number.NaN, 5, NOW)).toBeNull();
    expect(ageFromBirth(2030, 1, NOW)).toBe(0);
  });
});

describe('isUnderAge / knownAge', () => {
  it('is under age only for a known, smaller age', () => {
    expect(isUnderAge(15, 16)).toBe(true);
    expect(isUnderAge(16, 16)).toBe(false);
    expect(isUnderAge(null, 16)).toBe(false);
    expect(isUnderAge(undefined, 18)).toBe(false);
  });

  it('prefers birth data, then the server age', () => {
    expect(knownAge({ birth_year: 2010, birth_month: 12 }, 40, NOW)).toBe(15);
    expect(knownAge({ birth_year: null, birth_month: null }, 40, NOW)).toBe(40);
    expect(knownAge(undefined, undefined, NOW)).toBeNull();
  });
});

describe('ownerTooYoungMinAge', () => {
  it('reads min_age from an owner_too_young body', () => {
    expect(
      ownerTooYoungMinAge(tooYoung({ message: 'x', code: 'owner_too_young', min_age: 18 })),
    ).toBe(18);
    expect(ownerTooYoungMinAge(tooYoung({ message: 'x', min_age: 16 }))).toBe(16);
  });

  it('is null for other errors or a missing / bad number', () => {
    expect(ownerTooYoungMinAge(tooYoung({ message: 'x' }))).toBeNull();
    expect(ownerTooYoungMinAge(tooYoung({ message: 'x', min_age: '18' }))).toBeNull();
    expect(ownerTooYoungMinAge(tooYoung(undefined))).toBeNull();
    expect(ownerTooYoungMinAge(new ApiError(403, 'x', 'forbidden', { min_age: 18 }))).toBeNull();
    expect(ownerTooYoungMinAge(new Error('x'))).toBeNull();
  });
});

describe('createFamilyMinAgeMissed', () => {
  it('blocks a user known to be under 16 before they try', () => {
    expect(MIN_FAMILY_OWNER_AGE).toBe(16);
    expect(createFamilyMinAgeMissed({ birth_year: 2010, birth_month: 12 }, null, null, NOW)).toBe(
      16,
    );
    expect(createFamilyMinAgeMissed({}, 15, null, NOW)).toBe(16);
  });

  it('lets 16+ and unknown ages try (the server decides)', () => {
    expect(
      createFamilyMinAgeMissed({ birth_year: 2010, birth_month: 11 }, null, null, NOW),
    ).toBeNull();
    expect(
      createFamilyMinAgeMissed({ birth_year: 1988, birth_month: 3 }, 38, null, NOW),
    ).toBeNull();
    expect(createFamilyMinAgeMissed(undefined, null, null, NOW)).toBeNull();
  });

  it('follows the server answer when it says too young', () => {
    const adult = { birth_year: 1988, birth_month: 3 };
    expect(createFamilyMinAgeMissed(adult, 38, tooYoung({ message: 'x', min_age: 16 }), NOW)).toBe(
      16,
    );
    expect(createFamilyMinAgeMissed(adult, 38, tooYoung({ message: 'x' }), NOW)).toBe(16);
    expect(
      createFamilyMinAgeMissed(adult, 38, new ApiError(422, 'x', 'validation_failed'), NOW),
    ).toBeNull();
  });
});
