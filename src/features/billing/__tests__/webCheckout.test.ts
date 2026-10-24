import { ApiError, api } from '@/api/client';
import { fetchWebCheckoutLink } from '@/features/billing/hooks';
import { store } from '@/features/billing/store';

jest.mock('@/api/client', () => {
  const actual = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  return { ...actual, api: { ...actual.api, post: jest.fn(), get: jest.fn() } };
});

jest.mock('@/features/billing/store', () => ({
  store: { available: true, getStorefront: jest.fn() },
}));

const get = api.get as jest.Mock;
const getStorefront = store.getStorefront as jest.Mock;
const URL = 'https://brainyclan.com/subscribe?plan=annual&src=app';

beforeEach(() => {
  get.mockReset();
  getStorefront.mockReset();
});

describe('fetchWebCheckoutLink (in-app web checkout gating)', () => {
  it('treats an unknown storefront as not allowed and never asks the server', async () => {
    getStorefront.mockResolvedValue(null);
    await expect(fetchWebCheckoutLink()).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('asks the server with the storefront and shows the URL only when allowed', async () => {
    getStorefront.mockResolvedValue('USA');
    get.mockResolvedValueOnce({ data: { link_allowed: true, url: URL } });
    await expect(fetchWebCheckoutLink()).resolves.toBe(URL);
    expect(get).toHaveBeenCalledWith(
      '/family/web-checkout/availability?storefront=USA',
      expect.anything(),
    );
  });

  it('shows nothing when the server says no', async () => {
    getStorefront.mockResolvedValue('CAN');
    get.mockResolvedValueOnce({ data: { link_allowed: false, url: null } });
    await expect(fetchWebCheckoutLink()).resolves.toBeNull();
  });

  it('shows nothing while the endpoint is missing or refuses (4xx)', async () => {
    getStorefront.mockResolvedValue('USA');
    get.mockRejectedValueOnce(new ApiError(404, 'Not found', 'not_found'));
    await expect(fetchWebCheckoutLink()).resolves.toBeNull();
    get.mockRejectedValueOnce(new ApiError(403, 'Forbidden', 'forbidden'));
    await expect(fetchWebCheckoutLink()).resolves.toBeNull();
  });
});
