import en from '@/i18n/locales/en.json' with { type: 'json' };
import ru from '@/i18n/locales/ru.json' with { type: 'json' };
import kk from '@/i18n/locales/kk.json' with { type: 'json' };
import { test, expect } from './fixtures';

for (const [locale, copy] of Object.entries({ en, ru, kk })) {
  test(`renders landing and login in ${locale}`, async ({ page, context, app }, testInfo) => {
    await context.addCookies([{ name: 'locale', value: locale, url: app.url }]);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(
      page.getByRole('link', { name: copy.hero.cta.register, exact: true }).first(),
    ).toBeVisible();
    const eventDetails = page.getByRole('region', { name: copy.infoCards.label });
    await expect(eventDetails.getByRole('definition').first()).toHaveText('14');
    await expect(eventDetails.getByRole('definition').last()).toHaveText('3');
    await expect(eventDetails.getByText(copy.infoCards.monthYear, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.timeline.items.event, { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('A viewport is required');
    const timeline = page.getByRole('region', { name: copy.timeline.title });
    for (const width of new Set([viewport.width, 320, 375, 414, 768, 1024, 1280, 1920])) {
      await page.setViewportSize({ ...viewport, width });
      for (const selector of ['#about-title', '.footer-two-brand h2']) {
        const eventName = await page.locator(selector).evaluate((heading) => {
          const name = Array.from(heading.childNodes).find((node) =>
            node.textContent?.includes('Women’s Hack Day'),
          );
          if (!name) throw new Error('The heading must include the event name');
          const range = document.createRange();
          range.selectNodeContents(name);
          return {
            lines: range.getClientRects().length,
            right: range.getBoundingClientRect().right,
            containerRight: heading.getBoundingClientRect().right,
          };
        });
        expect(
          eventName.lines,
          `${selector} keeps the name on one line at ${width}px in ${locale}`,
        ).toBe(1);
        expect(
          eventName.right,
          `${selector} fits the name at ${width}px in ${locale}`,
        ).toBeLessThanOrEqual(eventName.containerRight + 1);
      }
      const cta = page.locator('.hero-spy-cta');
      const labelBounds = await cta.locator('.hero-cta-label').boundingBox();
      const arrowBounds = await cta.locator('.hero-cta-arrow').boundingBox();
      expect(labelBounds).not.toBeNull();
      expect(arrowBounds).not.toBeNull();
      expect(
        labelBounds!.x + labelBounds!.width,
        `Registration label clears its arrow at ${width}px in ${locale}`,
      ).toBeLessThanOrEqual(arrowBounds!.x);
      const clippedContent = await timeline.locator('.date-stat').evaluateAll((cards) =>
        cards.flatMap((card, index) => {
          const bounds = card.getBoundingClientRect();
          return Array.from(
            card.querySelectorAll('.date-stat-icon, .date-stat-value, .date-stat-label'),
          )
            .filter((child) => {
              const rect = child.getBoundingClientRect();
              return (
                rect.left < bounds.left - 1 ||
                rect.right > bounds.right + 1 ||
                rect.top < bounds.top - 1 ||
                rect.bottom > bounds.bottom + 1 ||
                child.scrollWidth > child.clientWidth + 1
              );
            })
            .map((child) => ({ card: index, element: child.classList.value }));
        }),
      );
      expect(clippedContent, `Timeline content fits at ${width}px in ${locale}`).toEqual([]);
    }
    await page.setViewportSize(viewport);
    await page.locator('#about-title').screenshot({
      path: `output/playwright/screenshots/${testInfo.project.name}-${locale}-about-title.png`,
    });
    await page.locator('.footer-two-brand h2').screenshot({
      path: `output/playwright/screenshots/${testInfo.project.name}-${locale}-footer-title.png`,
    });
    await timeline.screenshot({
      path: `output/playwright/screenshots/${testInfo.project.name}-${locale}-timeline.png`,
    });
    await page.getByRole('heading', { name: copy.gallery.title }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: copy.gallery.title })).toBeVisible();
    const brokenImages = await page.locator('img').evaluateAll(async (images) => {
      const failures = await Promise.all(
        images.map(async (element) => {
          const image = element as HTMLImageElement;
          image.loading = 'eager';
          try {
            await image.decode();
            return null;
          } catch {
            return image.src;
          }
        }),
      );
      return failures.filter(Boolean);
    });
    expect(brokenImages).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `output/playwright/screenshots/${testInfo.project.name}-${locale}-landing.png`,
      fullPage: true,
    });
    await page.goto('/login');
    await expect(
      page.getByRole('textbox', { name: `${copy.login.emailLabel}*`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: copy.login.sendCode, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `output/playwright/screenshots/${testInfo.project.name}-${locale}-login.png`,
      fullPage: true,
    });
  });
}

test('navigates gallery photos by keyboard and restores focus on dismissal', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'View photos', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('img', { name: 'Photo from Women’s Hack Day 1', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(
    dialog.getByRole('img', { name: 'Photo from Women’s Hack Day 6', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(
    dialog.getByRole('img', { name: 'Photo from Women’s Hack Day 1', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
