import en from '@/i18n/locales/en.json' with { type: 'json' };
import ru from '@/i18n/locales/ru.json' with { type: 'json' };
import kk from '@/i18n/locales/kk.json' with { type: 'json' };
import { test, expect } from './fixtures';

for (const [locale, copy] of Object.entries({ en, ru, kk })) {
  test(`serves consistent page metadata in ${locale}`, async ({ page, context, app }) => {
    await context.addCookies([{ name: 'locale', value: locale, url: app.url }]);
    for (const path of ['/', '/faq', '/privacy', '/terms']) {
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);
      const head = await page.evaluate(
        (html) => {
          const document = new DOMParser().parseFromString(html, 'text/html');
          return {
            title: document.title,
            description: document
              .querySelector('meta[name="description"]')
              ?.getAttribute('content'),
            titles: document.querySelectorAll('title').length,
            descriptions: document.querySelectorAll('meta[name="description"]').length,
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
            meta: Object.fromEntries(
              Array.from(document.querySelectorAll('meta[property], meta[name]')).map((meta) => [
                meta.getAttribute('property') ?? meta.getAttribute('name'),
                meta.getAttribute('content'),
              ]),
            ),
          };
        },
        await response!.text(),
      );

      const canonical = `https://whd.nuacmw.kz${path}`;
      expect(head.titles).toBe(1);
      expect(head.descriptions).toBe(1);
      expect(head.title).not.toMatch(/[—–]/);
      expect(head.description).toBeTruthy();
      expect(head.description).not.toMatch(/[—–]/);
      expect(head.canonical).toBe(canonical);
      expect(head.meta['og:url']).toBe(canonical);
      expect(head.meta['og:title']).toBe(head.title);
      expect(head.meta['twitter:title']).toBe(head.title);
      expect(head.meta['og:description']).toBe(head.description);
      expect(head.meta['twitter:description']).toBe(head.description);
      expect(head.meta['og:locale']).toBe({ en: 'en_US', ru: 'ru_RU', kk: 'kk_KZ' }[locale]);
      expect(head.meta['og:image']).toBe('https://whd.nuacmw.kz/social-preview.png');
      expect(head.meta['twitter:image']).toBe(head.meta['og:image']);
      if (path === '/') {
        expect(head.title).toBe(copy.metadata.title);
        expect(head.description).toBe(copy.metadata.description);
        expect(head.description).toContain('425 000 ₸');
        const image = await page.request.get('/social-preview.png');
        expect(image.ok()).toBe(true);
        expect(image.headers()['content-type']).toContain('image/png');
        const png = await image.body();
        expect(png.readUInt32BE(16)).toBe(1200);
        expect(png.readUInt32BE(20)).toBe(630);
      }
      if (path === '/faq') {
        expect(head.title).toBe(`${copy.faq.allTitle} | Women’s Hack Day 2026`);
        expect(head.description).toBe(copy.metadata.faqDescription);
      }
      await expect(page.locator('body')).not.toContainText(/[—–]/);
    }
    await page.goto('/');
    await page.getByRole('link', { name: copy.faq.viewAll, exact: true }).click();
    await expect(page).toHaveURL(`${app.url}/faq`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://whd.nuacmw.kz/faq',
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      `${copy.faq.allTitle} | Women’s Hack Day 2026`,
    );
  });
}

test('updates page metadata when switching language without reloading', async ({ page }) => {
  for (const path of ['/', '/faq']) {
    await page.goto(path);
    for (const [locale, copy, label] of [
      ['ru', ru, 'РУС'],
      ['kk', kk, 'ҚАЗ'],
      ['en', en, 'EN'],
    ] as const) {
      const language = page.getByRole('button', {
        name: new RegExp(`/ ${label}$`),
      });
      if (!(await language.isVisible())) {
        await page.locator('.menu-toggle').click();
      }
      await language.click();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      const title =
        path === '/' ? copy.metadata.title : `${copy.faq.allTitle} | Women’s Hack Day 2026`;
      const description = path === '/' ? copy.metadata.description : copy.metadata.faqDescription;
      await expect(page).toHaveTitle(title);
      for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
        await expect(page.locator(selector)).toHaveAttribute('content', title);
      }
      for (const selector of [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ]) {
        await expect(page.locator(selector)).toHaveAttribute('content', description);
      }
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
        'content',
        { en: 'en_US', ru: 'ru_RU', kk: 'kk_KZ' }[locale],
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://whd.nuacmw.kz${path}`,
      );
    }
  }
});
