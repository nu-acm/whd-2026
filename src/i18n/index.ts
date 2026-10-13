import i18n from 'i18next';
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

const isBrowser = typeof window !== 'undefined';

const instance = i18n.use(initReactI18next);
// The detector touches document/navigator, so it is browser-only. On the
// server the locale comes from the `locale` cookie, applied in __root.tsx.
if (isBrowser) {
  instance.use(LanguageDetector);
}

instance.init({
  // Hydrate in the language already rendered by the server. A first-visit
  // navigator preference must not replace that markup before hydration.
  lng: isBrowser ? document.documentElement.lang || 'en' : 'en',
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

export default i18n;
