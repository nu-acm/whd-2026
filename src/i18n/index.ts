import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '@/i18n/locales/en.json';
import kk from '@/i18n/locales/kk.json';
import ru from '@/i18n/locales/ru.json';

export const supportedLngs = ['en', 'ru', 'kk'] as const;
export type SupportedLng = (typeof supportedLngs)[number];

/** Labels shown in the switcher, in each language's own script. */
export const languageNames: Record<SupportedLng, string> = {
  en: 'EN',
  ru: 'РУС',
  kk: 'ҚАЗ',
};

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  kk: { translation: kk },
};

/** Each router owns its translations, including each concurrent SSR request. */
export function createI18n() {
  const isBrowser = typeof window !== 'undefined';
  const instance = createInstance().use(initReactI18next);
  if (isBrowser) instance.use(LanguageDetector);
  void instance.init({
    // Hydrate in the language already rendered by the server. A first-visit
    // navigator preference must not replace that markup before hydration.
    lng: isBrowser ? document.documentElement.lang || 'en' : 'en',
    initImmediate: false,
    resources,
    fallbackLng: 'en',
    supportedLngs: [...supportedLngs],
    ...(isBrowser && {
      detection: {
        order: ['cookie', 'navigator'],
        lookupCookie: 'locale',
        caches: ['cookie'],
        cookieOptions: { path: '/', maxAge: 365 * 24 * 60 * 60 },
      },
    }),
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}
