import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

export type AppLanguage = keyof typeof resources;
export const supportedLanguages = Object.keys(resources) as AppLanguage[];
const fallbackLng: AppLanguage = 'en';

function detectLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode ?? fallbackLng;
  return (supportedLanguages as string[]).includes(code) ? (code as AppLanguage) : fallbackLng;
}

if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member -- standard i18next instance API
  void i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    fallbackLng,
    interpolation: { escapeValue: false }, // React already escapes output
    returnNull: false,
  });
}

export default i18n;
