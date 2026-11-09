import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { queryKeys } from '@/api/queryKeys';
import type { SupportMessage } from '@/api/types';
import { APP_VERSION } from '@/config/env';
import { fetchSupportMessages } from '@/features/support/api';
import { sendSupportDraft, type SupportContext } from '@/features/support/draft';
import {
  apiPlatform,
  appVersionField,
  deviceSummary,
  sendErrorKind,
  upsertMessage,
} from '@/features/support/model';

/** `GET /support/messages` (admins only: pass `enabled = isAdmin`). */
export function useSupportMessages(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.supportMessages,
    queryFn: ({ signal }) => fetchSupportMessages(signal),
    enabled,
    staleTime: 30_000,
    // 403 (no longer an admin) won't change by retrying.
    retry: (count, error) => sendErrorKind(error) !== 'forbidden' && count < 2,
  });
}

/** App version, platform and device model + OS sent with a message (and shown before sending). */
export function useSupportContext(): SupportContext {
  return useMemo(
    () => ({
      app_version: appVersionField(APP_VERSION),
      platform: apiPlatform(Platform.OS),
      device: deviceSummary({
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
      }),
    }),
    [],
  );
}

/**
 * Sends the persisted draft (`sendSupportDraft`: same `client_id` on a retry). The stored message
 * goes to the top of "Your messages"; 403 refreshes `me` (the role may have changed).
 */
export function useSendSupportMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (context: SupportContext) => sendSupportDraft(context),
    retry: false,
    onSuccess: (message) => {
      client.setQueryData<SupportMessage[]>(queryKeys.supportMessages, (list) =>
        upsertMessage(list, message),
      );
      void client.invalidateQueries({ queryKey: queryKeys.supportMessages });
    },
    onError: (error) => {
      if (sendErrorKind(error) === 'forbidden') {
        void client.invalidateQueries({ queryKey: queryKeys.me });
      }
    },
  });
}
