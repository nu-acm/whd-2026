import { test, expect, login, seedEligibleTeam } from './fixtures';
import en from '@/i18n/locales/en.json' with { type: 'json' };
import ru from '@/i18n/locales/ru.json' with { type: 'json' };
import kk from '@/i18n/locales/kk.json' with { type: 'json' };

test('lets check-in staff mark attendance, blocks other workspaces, and revokes access immediately', async ({
  page,
  app,
}) => {
  await seedEligibleTeam(app.db);
  await app.db.prepare("UPDATE team SET number = 1 WHERE id = 'eligible-team'").run();
  await login(page, app.codes, 'checkin@example.test');
  await expect(page).toHaveURL(/\/checkin$/);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/checkin$/);
  await expect(page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
  for (const path of ['/admin', '/scoring', '/rankings', '/dashboard'])
    await expect(page.locator(`header a[href="${path}"]`)).toHaveCount(0);
  await expect(page.getByRole('button', { name: en.admin.refresh, exact: true })).toBeVisible();
  const saving = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().includes('/_serverFn/'),
  );
  await page.getByRole('checkbox', { name: 'Mark Member as checked in', exact: true }).click();
  const mutation = await saving;
  await expect
    .poll(() =>
      app.db.prepare("SELECT attended FROM participant WHERE id = 'member'").first('attended'),
    )
    .toBe(1);
  expect(
    await app.db
      .prepare("SELECT id FROM participant WHERE id NOT IN ('captain', 'member', 'third')")
      .all(),
  ).toMatchObject({ results: [] });
  app.expectedHttpErrors.add(404);
  for (const path of ['/admin', '/scoring', '/rankings', '/jury']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  }
  await app.setCheckinEmails('');
  await app.db.prepare("UPDATE participant SET attended = 0 WHERE id = 'member'").run();
  const denied = await page.request.fetch(mutation);
  expect(await denied.text()).toContain('Forbidden');
  expect(
    await app.db.prepare("SELECT attended FROM participant WHERE id = 'member'").first('attended'),
  ).toBe(0);
  await page.goto('/checkin');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await app.setCheckinEmails(' CHECKIN@example.test ');
  await page.goto('/checkin');
  await expect(
    page.getByRole('checkbox', { name: 'Mark Member as checked in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: en.common.signOut, exact: true }).click();
  await page.getByRole('button', { name: en.common.confirm, exact: true }).click();
  await expect(page).toHaveURL(app.url + '/');
  await page.goto('/checkin');
  await expect(page).toHaveURL(/\/login$/);
});

for (const [locale, copy] of Object.entries({ en, ru, kk })) {
  test(`renders the check-in staff workspace in ${locale}`, async ({ page, app }) => {
    await seedEligibleTeam(app.db);
    await app.db.prepare("UPDATE team SET number = 1 WHERE id = 'eligible-team'").run();
    await login(page, app.codes, 'checkin@example.test');
    await page.context().addCookies([{ name: 'locale', value: locale, url: app.url }]);
    await page.goto('/checkin');
    await expect(page.getByRole('heading', { name: copy.admin.checkinTitle })).toBeVisible();
    await expect(page.getByText(copy.admin.checkinScope)).toBeVisible();
    await expect(page.getByRole('button', { name: copy.admin.refresh, exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: copy.common.signOut, exact: true }),
    ).toBeVisible();
    await page.getByRole('textbox').fill('01');
    await expect(page.getByRole('checkbox')).toHaveCount(3);
    for (const path of ['/admin', '/scoring', '/rankings'])
      await expect(page.locator(`header a[href="${path}"]`)).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
