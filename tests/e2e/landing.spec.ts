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
