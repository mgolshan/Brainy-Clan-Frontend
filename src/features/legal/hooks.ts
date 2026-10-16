import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { api, ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Envelope, LegalAcceptanceBody, LegalInfo, MeExport, MePayload } from '@/api/types';
import { saveExportFile } from '@/features/legal/saveExport';
import { legalLang, legalPath, localizedLegalUrl } from '@/features/legal/url';
import i18n from '@/i18n';

/**
 * `GET /legal` (public): current Terms / Privacy Policy versions and URLs, in the app language
 * (`?lang=fr` localizes `summary` and the page URLs). `null` when the backend doesn't serve it yet
 * (404), so callers simply hide the links.
 */
export function useLegal() {
  const language = useTranslation().i18n.language;
  return useQuery({
    queryKey: [...queryKeys.legal, legalLang(language) ?? 'en'],
    queryFn: async ({ signal }): Promise<LegalInfo | null> => {
      try {
        return (await api.get<Envelope<LegalInfo>>(legalPath(language), { signal })).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 60 * 60_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

/** Opens a URL in the in-app browser (falls back to the system browser). */
export function openInAppBrowser(url: string) {
  void WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url).catch(() => {}));
}

/** Opens a backend legal page (from `GET /legal`) in the app language. */
export function openLegalPage(url: string) {
  openInAppBrowser(localizedLegalUrl(url, i18n.language));
}

/**
 * `POST /me/legal-acceptance` with the versions the user just saw (must equal the current ones).
 * On success the `me` cache stops asking, then `/me` is refetched for the server's view.
 */
export function useAcceptLegal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: LegalAcceptanceBody) => {
      await api.post<void>('/me/legal-acceptance', body);
      return body;
    },
    onSuccess: (body) => {
      client.setQueryData<MePayload>(queryKeys.me, (prev) =>
        prev
          ? {
              ...prev,
              legal: {
                needs_acceptance: false,
                terms_version: body.terms_version,
                privacy_version: body.privacy_version,
                accepted_terms_version: body.terms_version,
                accepted_privacy_version: body.privacy_version,
              },
            }
          : prev,
      );
      void client.invalidateQueries({ queryKey: queryKeys.me, exact: true });
    },
  });
}

export type ExportResult = 'downloaded' | 'shared';

/** `brainy-clan-my-data-2026-10-16.json`, dated by the export's `exported_at` when valid. */
export function exportFileName(exportedAt: string | undefined): string {
  const time = exportedAt ? Date.parse(exportedAt) : NaN;
  const date = new Date(Number.isNaN(time) ? Date.now() : time).toISOString().slice(0, 10);
  return `brainy-clan-my-data-${date}.json`;
}

/**
 * `GET /me/export` (any non-child user, rate-limited to 1 per hour → 429): fetches the user's data
 * and hands the `data` object as a JSON file to the platform (web download, native share sheet /
 * save to Files). The records are saved as received, never interpreted.
 */
export function useExportMyData() {
  return useMutation({
    mutationFn: async (): Promise<ExportResult> => {
      const { data } = await api.get<Envelope<MeExport>>('/me/export', { timeoutMs: 60_000 });
      return saveExportFile(exportFileName(data.exported_at), JSON.stringify(data, null, 2));
    },
  });
}
