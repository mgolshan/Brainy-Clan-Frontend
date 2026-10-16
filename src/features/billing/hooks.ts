import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError, api } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type { Envelope, Subscription } from '@/api/types';
import { useIsAdmin, usePolicy } from '@/features/auth/hooks';
import { store } from '@/features/billing/store';
import { StoreError } from '@/features/billing/storeTypes';

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
    } catch {
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
  });

  return { run, step };
}
