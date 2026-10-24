import {
  type RawPackage,
  defaultPackage,
  packageKind,
  savingPercent,
  toPaywallPackages,
} from '@/features/billing/packages';

function pkg(
  identifier: string,
  packageType: string,
  productId: string,
  price: number,
  extra: Partial<RawPackage['product']> = {},
): RawPackage {
  return {
    identifier,
    packageType,
    product: {
      identifier: productId,
      title: productId,
      price,
      priceString: `$${price.toFixed(2)}`,
      currencyCode: 'USD',
      pricePerMonthString: null,
      introPrice: null,
      ...extra,
    },
  };
}

const MONTHLY = pkg('$rc_monthly', 'MONTHLY', 'brainyclan_family_monthly', 6.99);
const SIX = pkg('$rc_six_month', 'SIX_MONTH', 'brainyclan_family_6months', 29.99, {
  pricePerMonthString: '$5.00',
  introPrice: {
    price: 0,
    priceString: '$0.00',
    cycles: 1,
    periodUnit: 'DAY',
    periodNumberOfUnits: 7,
  },
});
const ANNUAL = pkg('$rc_annual', 'ANNUAL', 'brainyclan_family_annual', 49.99, {
  pricePerMonthString: '$4.17',
  introPrice: {
    price: 0,
    priceString: '$0.00',
    cycles: 1,
    periodUnit: 'WEEK',
    periodNumberOfUnits: 1,
  },
});

describe('packageKind', () => {
  it.each([
    ['MONTHLY', 'x', 'monthly'],
    ['SIX_MONTH', 'x', 'sixMonth'],
    ['ANNUAL', 'x', 'annual'],
    ['WEEKLY', 'x', 'other'],
    ['CUSTOM', 'brainyclan_family_6months', 'sixMonth'],
    ['CUSTOM', 'brainyclan_family_annual:annual-base', 'annual'],
    ['UNKNOWN', 'brainyclan_family_monthly', 'monthly'],
    ['CUSTOM', 'something_else', 'other'],
  ])('%s / %s → %s', (type, productId, kind) => {
    expect(packageKind(type, productId)).toBe(kind);
  });
});

describe('savingPercent', () => {
  const monthly = { price: 6.99, currencyCode: 'USD' };

  it('compares against paying monthly for the same time, rounded down', () => {
    // 49.99 / (6.99 × 12 = 83.88) = 0.5960 → 40.4 % → 40
    expect(savingPercent(49.99, 12, monthly, 'USD')).toBe(40);
    // 29.99 / (6.99 × 6 = 41.94) = 0.7151 → 28.49 % → 28
    expect(savingPercent(29.99, 6, monthly, 'USD')).toBe(28);
  });

  it('works with other store prices (never hard-coded)', () => {
    // CA$64.99 vs CA$8.99 × 12 = 107.88 → 39.75 % → 39
    expect(savingPercent(64.99, 12, { price: 8.99, currencyCode: 'CAD' }, 'CAD')).toBe(39);
  });

  it('is null without a monthly plan, across currencies, for monthly itself or without saving', () => {
    expect(savingPercent(49.99, 12, undefined, 'USD')).toBeNull();
    expect(savingPercent(49.99, 12, monthly, 'EUR')).toBeNull();
    expect(savingPercent(6.99, 1, monthly, 'USD')).toBeNull();
    expect(savingPercent(90, 12, monthly, 'USD')).toBeNull();
    expect(savingPercent(0, 12, monthly, 'USD')).toBeNull();
  });
});

describe('toPaywallPackages', () => {
  it('maps the three plans, annual first and highlighted, with store prices', () => {
    const list = toPaywallPackages([MONTHLY, SIX, ANNUAL]);
    expect(list.map((p) => p.kind)).toEqual(['annual', 'sixMonth', 'monthly']);

    const [annual, six, monthly] = list;
    expect(annual).toMatchObject({
      id: '$rc_annual',
      priceString: '$49.99',
      pricePerMonthString: '$4.17',
      savingPercent: 40,
      highlighted: true,
      freeTrial: { unit: 'week', count: 1 },
      introOffer: null,
    });
    expect(six).toMatchObject({
      pricePerMonthString: '$5.00',
      savingPercent: 28,
      highlighted: false,
      freeTrial: { unit: 'day', count: 7 },
    });
    expect(monthly).toMatchObject({
      pricePerMonthString: null,
      savingPercent: null,
      freeTrial: null,
      highlighted: false,
    });
    expect(defaultPackage(list)?.kind).toBe('annual');
  });

  it('shows a paid intro price as the founding-families offer, not as a trial', () => {
    const founding = pkg('$rc_annual', 'ANNUAL', 'brainyclan_family_annual', 49.99, {
      introPrice: {
        price: 24.99,
        priceString: '$24.99',
        cycles: 1,
        periodUnit: 'YEAR',
        periodNumberOfUnits: 1,
      },
    });
    const [annual] = toPaywallPackages([founding]);
    expect(annual?.freeTrial).toBeNull();
    expect(annual?.introOffer).toEqual({
      priceString: '$24.99',
      period: { unit: 'year', count: 1 },
      cycles: 1,
    });
    // No monthly plan in the offering → no saving claim.
    expect(annual?.savingPercent).toBeNull();
  });

  it('hides trials and intro offers the store account is not eligible for', () => {
    const list = toPaywallPackages(
      [SIX, ANNUAL],
      (productId) => productId !== 'brainyclan_family_annual',
    );
    expect(list.find((p) => p.kind === 'annual')?.freeTrial).toBeNull();
    expect(list.find((p) => p.kind === 'sixMonth')?.freeTrial).toEqual({ unit: 'day', count: 7 });
  });

  it('ignores intro offers with an unknown period', () => {
    const odd = pkg('$rc_annual', 'ANNUAL', 'brainyclan_family_annual', 49.99, {
      introPrice: {
        price: 0,
        priceString: '$0',
        cycles: 1,
        periodUnit: 'FORTNIGHT',
        periodNumberOfUnits: 1,
      },
    });
    expect(toPaywallPackages([odd])[0]?.freeTrial).toBeNull();
  });

  it('keeps unknown packages last, with the store title and price', () => {
    const lifetime = pkg('$rc_lifetime', 'LIFETIME', 'other_product', 99);
    const list = toPaywallPackages([lifetime, MONTHLY]);
    expect(list.map((p) => p.kind)).toEqual(['monthly', 'other']);
    expect(list[1]).toMatchObject({ title: 'other_product', priceString: '$99.00' });
    // Without an annual plan the first one is the default.
    expect(defaultPackage(list)?.kind).toBe('monthly');
  });

  it('is empty for an empty offering', () => {
    expect(toPaywallPackages([])).toEqual([]);
    expect(defaultPackage([])).toBeUndefined();
  });
});
