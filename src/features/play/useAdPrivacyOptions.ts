import { useMutation } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';

import type { Policy } from '@/api/types';
import { rewardedAds } from '@/features/play/rewardedAd';

/**
 * Profile → Privacy → "Privacy choices for ads": shown only to members who can see rewarded ads
 * (server policy `second_chance.ad_allowed`, in a build that can show ads — the same condition
 * as the ad option in play) and only when Google UMP says privacy options are required (e.g.
 * GDPR regions, known once consent was gathered before an ad). Never for children (the server
 * never allows them ads), never on web / Expo Go.
 */
export function useAdPrivacyOptions(policy: Policy) {
  const { consent } = rewardedAds;
  const enabled = policy.second_chance.ad_allowed === true && rewardedAds.available;
  const required = useSyncExternalStore(
    consent.subscribe,
    consent.privacyOptionsRequired,
    consent.privacyOptionsRequired,
  );

  useEffect(() => {
    // Reads the stored status only: no network, no consent message.
    if (enabled) void consent.refreshPrivacyOptions();
  }, [enabled, consent]);

  const open = useMutation({ mutationFn: () => consent.showPrivacyOptions() });

  return {
    visible: enabled && required,
    open: () => open.mutate(),
    pending: open.isPending,
    failed: open.isError,
  };
}
