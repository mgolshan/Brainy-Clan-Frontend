import 'i18next';

import type en from '@/i18n/locales/en.json';

// Makes t('...') keys type-checked against the English catalogue.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
