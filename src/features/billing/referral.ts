import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ApiError, api } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import type { Envelope, ReferralCodeBody, ReferralCodeResult } from '@/api/types';

/**
 * Referral / affiliate codes (F8, API "Referral / affiliate codes (B10)"). A code typed at
 * sign-up is kept on the device until the family exists, then sent once with
 * `POST /family/referral-code` (admin). The server decides whether it counts.
 */

/** Contract: letters/digits/dash, ≤ 20, case-insensitive. */
const CODE_PATTERN = /^[A-Z0-9-]{1,20}$/;
export const REFERRAL_CODE_MAX_LENGTH = 20;

/** The typed code, upper-cased and trimmed, or null when empty / not a possible code. */
export function normalizeReferralCode(input: string | null | undefined): string | null {
  const code = (input ?? '').trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** Keeps only characters a code can have while typing (letters, digits, dash). */
export function cleanReferralInput(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, REFERRAL_CODE_MAX_LENGTH);
}

export type ReferralFailure = 'invalid' | 'locked';

/**
 * Why the server refused a code: `referral_code_invalid` (unknown/inactive, or a malformed code
 * rejected by validation) or `referral_code_locked` (already set / family already paid). Null for
 * anything else (network, server errors: worth retrying).
 */
export function referralFailure(error: unknown): ReferralFailure | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'referral_code_invalid') return 'invalid';
  if (error.code === 'referral_code_locked') return 'locked';
  if (error.code === 'validation_failed' && error.fieldErrors.code) return 'invalid';
  return null;
}

/** i18n key of the friendly message for a refused code. */
export function referralFailureKey(failure: ReferralFailure) {
  return failure === 'invalid'
    ? ('billing.referral.invalid' as const)
    : ('billing.referral.locked' as const);
}

/** `POST /family/referral-code` (admin). Refreshes the family (admin view has `referral_code`). */
export async function submitReferralCode(code: string): Promise<ReferralCodeResult> {
  const body: ReferralCodeBody = { code };
  const result = (await api.post<Envelope<ReferralCodeResult>>('/family/referral-code', body)).data;
  await queryClient.invalidateQueries({ queryKey: queryKeys.family, exact: true });
  return result;
}

interface ReferralState {
  /** Code typed at sign-up, waiting for the family to exist. */
  pendingCode: string | null;
  /** The last pending code the server refused (shown once to the admin). */
  failure: { code: string; reason: ReferralFailure } | null;
  setPending: (code: string | null) => void;
  setFailure: (failure: ReferralState['failure']) => void;
  clear: () => void;
}

/** Device-local, not server data: only the code the user typed before the family existed. */
export const useReferralStore = create<ReferralState>()(
  persist(
    (set) => ({
      pendingCode: null,
      failure: null,
      setPending: (pendingCode) => set({ pendingCode }),
      setFailure: (failure) => set({ failure }),
      clear: () => set({ pendingCode: null, failure: null }),
    }),
    {
      name: 'brainyclan.referral',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

let inFlight: Promise<void> | null = null;

/**
 * Sends the code typed at sign-up, once the family exists (after `POST /families`, and again
 * from the admin's Family tab if that attempt failed for network reasons). A refused code is
 * dropped and remembered as `failure`; transient errors keep it for the next try. Never throws.
 */
export function applyPendingReferral(): Promise<void> {
  inFlight ??= (async () => {
    const { pendingCode } = useReferralStore.getState();
    if (!pendingCode) return;
    try {
      await submitReferralCode(pendingCode);
      useReferralStore.getState().clear();
    } catch (error) {
      const reason = referralFailure(error);
      if (reason) {
        useReferralStore.setState({ pendingCode: null, failure: { code: pendingCode, reason } });
      } else if (error instanceof ApiError && error.code === 'forbidden') {
        // Not an admin of this family: the code can't be set from this account.
        useReferralStore.getState().clear();
      }
      // Network / server errors: keep the code and try again later.
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
