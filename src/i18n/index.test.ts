import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { describe, expect, it } from 'vite-plus/test';
import { createI18n, supportedLngs } from '@/i18n';
import { TEAM_ERRORS } from '@/lib/team-errors';
import { AI_RATE_LIMIT_ERROR } from '@/lib/ai';

function Heading() {
  const { t, i18n } = useTranslation();
  return createElement('h1', { lang: i18n.language }, t('login.title'));
}

describe('request-local translations', () => {
  it('renders concurrent languages without changing another request', async () => {
    const instances = supportedLngs.map(() => createI18n());
    await Promise.all(instances.map((instance, i) => instance.changeLanguage(supportedLngs[i])));
    const expected = ['Sign in', 'Вход', 'Кіру'];
    instances.forEach((instance, i) => {
      const html = renderToStaticMarkup(
        createElement(I18nextProvider, { i18n: instance }, createElement(Heading)),
      );
      expect(html).toBe(`<h1 lang="${supportedLngs[i]}">${expected[i]}</h1>`);
    });
    await instances[0].changeLanguage('kk');
    expect(instances[1].language).toBe('ru');
  });

  it('provides all team and rate-limit errors in each language', async () => {
    for (const language of supportedLngs) {
      const instance = createI18n();
      await instance.changeLanguage(language);
      for (const key of [...Object.values(TEAM_ERRORS), AI_RATE_LIMIT_ERROR]) {
        expect(instance.exists(key, { lng: language, fallbackLng: false })).toBe(true);
        expect(instance.t(key)).not.toBe(key);
      }
    }
  });
});

// Compare the complete key structure so missing copy cannot be hidden by English fallback.
function translationKeys(value: object, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return child !== null && typeof child === 'object' ? translationKeys(child, path) : [path];
    })
    .sort();
}

it('keeps every locale key consistent with English', () => {
  const instance = createI18n();
  const englishKeys = translationKeys(instance.getResourceBundle('en', 'translation'));
  for (const language of ['ru', 'kk']) {
    expect(translationKeys(instance.getResourceBundle(language, 'translation'))).toEqual(
      englishKeys,
    );
  }
});
