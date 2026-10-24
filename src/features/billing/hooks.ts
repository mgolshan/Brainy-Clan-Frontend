import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking } from 'react-native';

import { ApiError, api } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type { Envelope, ManageLink, Subscription, WebCheckoutAvailability } from '@/api/types';
import { useIsAdmin, usePolicy } from '@/features/auth/hooks';
import { submitReferralCode } from '@/features/billing/referral';
import { STORE_MANAGE_URLS, webCheckoutUrl } from '@/features/billing/source';
import { store } from '@/features/billing/store';
import { StoreError } from '@/features/billing/storeTypes';
import { openInAppBrowser } from '@/features/legal/hooks';
import { invalidateWorlds } from '@/features/worlds/hooks';

/**
 * `GET /family/subscription` (admins only, never for children).
 * Resolves to `null` on 404 (endpoint not deployed yet) so callers can hide the section.
 */
export function useSubscription() {
  const isAdmin = useIsAdmin();
  const policy = usePolicy();
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async ({ signal }): Promise<Subscription | null> => {
      try {
        return (await api.get<Envelope<Subscription>>('/family/subscription', { signal })).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: isAdmin && policy?.is_child === false,
  });
}

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 30_000;
/** Every n-th poll asks the server to pull from RevenueCat (`POST .../sync`), the rest only read. */
const SYNC_EVERY = 3;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchSubscription(sync: boolean): Promise<Subscription> {
  if (sync) {
    try {
      return (await api.post<Envelope<Subscription>>('/family/subscription/sync')).data;
    } catch (error) {
      // Sync not deployed yet: reading still works (the webhook switches the tier).
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }
  return (await api.get<Envelope<Subscription>>('/family/subscription')).data;
}

/**
 * After a purchase/restore: polls the server (sync first, then reads every 2 s) for up to ~30 s
 * until the family tier is `family`; the app never sets the tier itself. Refreshes `/me` (policy,
 * limits), the family and categories at the end. Resolves to whether the switch was seen.
 */
export async function waitForFamilyTier(): Promise<boolean> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let switched = false;
  for (let attempt = 0; Date.now() < deadline; attempt += 1) {
    try {
      const sub = await fetchSubscription(attempt % SYNC_EVERY === 0);
      queryClient.setQueryData(queryKeys.subscription, sub);
      if (sub.tier === 'family') {
        switched = true;
        break;
      }
    } catch (error) {
      // The family already has a plan from another source (e.g. bought on the web): stop and say so.
      if (error instanceof ApiError && error.code === 'subscription_exists') throw error;
      // Transient errors (502 while the backend restarts, offline): keep polling.
    }
    if (Date.now() + POLL_INTERVAL_MS >= deadline) break;
    await sleep(POLL_INTERVAL_MS);
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.me }),
    queryClient.invalidateQueries({ queryKey: queryKeys.family, exact: true }),
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
    queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
    // Family-plan worlds unlock with the plan (`me/worlds` is covered by `me` above).
    invalidateWorlds(),
  ]);
  return switched;
}

/** Offering packages for the paywall (store prices), as the family's RevenueCat user. */
export function usePaywallPackages(appUserId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.paywallPackages(appUserId ?? ''),
    queryFn: () => store.getPackages(appUserId ?? ''),
    enabled: store.available && !!appUserId,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export type PaywallStep = 'idle' | 'buying' | 'restoring' | 'activating';

export type PaywallResult =
  | { kind: 'activated' }
  /** Paid, but the server hasn't switched the tier within ~30 s (webhook delayed). */
  | { kind: 'delayed' }
  | { kind: 'cancelled' }
  /** Restore found no active Family plan. */
  | { kind: 'nothingToRestore' };

/** Buy / restore, then wait for the server to confirm the Family tier. */
export function usePaywallActions(appUserId: string | undefined) {
  const [step, setStep] = useState<PaywallStep>('idle');

  const run = useMutation({
    mutationFn: async (
      action: { type: 'buy'; packageId: string } | { type: 'restore' },
    ): Promise<PaywallResult> => {
      if (!appUserId) throw new StoreError('unavailable');
      try {
        if (action.type === 'buy') {
          setStep('buying');
          await store.identify(appUserId);
          if ((await store.purchase(action.packageId)) === 'cancelled')
            return { kind: 'cancelled' };
        } else {
          setStep('restoring');
          if (!(await store.restore(appUserId))) return { kind: 'nothingToRestore' };
        }
        setStep('activating');
        return { kind: (await waitForFamilyTier()) ? 'activated' : 'delayed' };
      } finally {
        setStep('idle');
      }
    },
    onError: (error) => {
      // 409 `subscription_exists`: the plan is managed elsewhere; reload so the paywall says so.
      if (isSubscriptionExists(error)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      }
    },
  });

  return { run, step };
}

/** True for the 409 `subscription_exists` answer (the family already has a plan elsewhere). */
export function isSubscriptionExists(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'subscription_exists';
}

/**
 * "Manage subscription": `POST /family/subscription/manage-link` gives the right place (Paddle
 * customer portal for web plans, the store's subscription page for store plans). Store pages
 * open in the store app (`Linking`), the Paddle portal in the in-app browser. While the
 * endpoint isn't deployed (404), store plans fall back to the store's own subscription page.
 */
export function useManageSubscription() {
  return useMutation({
    mutationFn: async (sub: Pick<Subscription, 'store'>) => {
      let url: string | undefined;
      try {
        url = (await api.post<Envelope<ManageLink>>('/family/subscription/manage-link')).data.url;
      } catch (error) {
        const fallback = sub.store ? STORE_MANAGE_URLS[sub.store] : undefined;
        if (!(error instanceof ApiError && error.status === 404 && fallback)) throw error;
        url = fallback;
      }
      if (sub.store === 'paddle') {
        openInAppBrowser(url);
      } else {
        await Linking.openURL(url).catch(() => openInAppBrowser(url));
      }
    },
  });
}

/**
 * The in-app web checkout link (Paddle), only where the server allows it for the store country
 * (`GET /family/web-checkout/availability?storefront=`). Without a known storefront (web build,
 * Expo Go, older stores) the link is treated as not allowed and the API isn't called.
 * Resolves to the URL to show, or null (then the app mentions no web prices at all).
 */
export async function fetchWebCheckoutLink(signal?: AbortSignal): Promise<string | null> {
  const storefront = await store.getStorefront();
  if (!storefront) return null;
  try {
    const availability = (
      await api.get<Envelope<WebCheckoutAvailability>>(
        `/family/web-checkout/availability?storefront=${encodeURIComponent(storefront)}`,
        { signal },
      )
    ).data;
    return webCheckoutUrl(availability);
  } catch (error) {
    // Not deployed yet / not allowed (4xx): no link. Server errors surface (query error → no link).
    if (error instanceof ApiError && error.status > 0 && error.status < 500) return null;
    throw error;
  }
}

export function useWebCheckoutLink(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.webCheckout,
    queryFn: ({ signal }) => fetchWebCheckoutLink(signal),
    enabled: enabled && store.available,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/** `POST /family/referral-code` from the paywall's "Have a code?" field (admin). */
export function useSubmitReferralCode() {
  return useMutation({ mutationFn: (code: string) => submitReferralCode(code) });
}
