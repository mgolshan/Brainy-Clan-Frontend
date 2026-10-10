import { useEffect } from 'react';

import i18n, { supportedLanguages, type AppLanguage } from '@/i18n';

/** Switch the UI language to the user's saved `locale` when it is one we ship. */
export function useLocaleSync(locale: string | undefined) {
  useEffect(() => {
    const code = locale?.slice(0, 2);
    if (code && (supportedLanguages as string[]).includes(code) && i18n.language !== code) {
      void i18n.changeLanguage(code as AppLanguage);
    }
  }, [locale]);
}
