import { test, expect, login, onboard, seedEligibleTeam } from './fixtures';
import { REGISTRATION_POLICY_VERSION } from '@/lib/consent';
import en from '@/i18n/locales/en.json' with { type: 'json' };
import ru from '@/i18n/locales/ru.json' with { type: 'json' };
import kk from '@/i18n/locales/kk.json' with { type: 'json' };

test('registers, edits a profile, creates a team, and admits a teammate', async ({
  page,
  app,
  browser,
}) => {
  await login(page, app.codes, 'captain@example.test');
  await onboard(page, 'Captain');
  await page.getByRole('link', { name: 'Edit details' }).click();
  await page.getByRole('textbox', { name: 'City' }).fill('Almaty');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'Edit details' }).click();
  await expect(page.getByRole('textbox', { name: 'City' })).toHaveValue('Almaty');
  await page.getByRole('textbox', { name: 'Full name' }).fill('Captain Updated');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('textbox', { name: 'Team name' }).fill('Browser Team');
  await page.getByRole('button', { name: 'Create a team', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Browser Team' })).toBeVisible();
  const invite = page.getByRole('textbox', { name: 'Invite link' });
  await expect(invite).toHaveValue(/\/invite\/browser-team$/);
  const context = await browser.newContext({ baseURL: app.url, viewport: page.viewportSize() });
  const thirdContext = await browser.newContext({
    baseURL: app.url,
    viewport: page.viewportSize(),
  });
  try {
    const teammate = await context.newPage();
    app.observe(teammate);
    await login(teammate, app.codes, 'teammate@example.test');
    await onboard(teammate, 'Teammate');
    await teammate.getByRole('textbox', { name: 'Invite code' }).fill(await invite.inputValue());
    await teammate.getByRole('button', { name: 'Join a team', exact: true }).click();
    await expect(teammate.getByRole('heading', { name: 'Browser Team' })).toBeVisible();
    await expect
      .poll(
        async () =>
          (await app.db.prepare('SELECT id FROM participant WHERE team_id IS NOT NULL').all())
            .results.length,
      )
      .toBe(2);
    expect(
      await app.db
        .prepare('SELECT city FROM participant WHERE full_name = ?')
        .bind('Captain Updated')
        .first('city'),
    ).toBe('Almaty');
    const third = await thirdContext.newPage();
    app.observe(third);
    await login(third, app.codes, 'third@example.test');
    await onboard(third, 'Third');
    await third.goto(new URL(await invite.inputValue()).pathname);
    await third.getByRole('button', { name: 'Join team', exact: true }).click();
    await expect(third.getByRole('heading', { name: 'Browser Team' })).toBeVisible();
    expect(
      (await app.db.prepare('SELECT id FROM participant WHERE team_id IS NOT NULL').all()).results,
    ).toHaveLength(3);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'registration-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nregistration browser test'),
    });
    await expect
      .poll(() =>
        app.db
          .prepare('SELECT cv_url FROM participant WHERE full_name = ?')
          .bind('Captain Updated')
          .first('cv_url'),
      )
      .toBe('https://drive.google.com/file/d/testDriveFile123/view');
    await page.reload();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Click again to delete', exact: true }).click();
    await expect
      .poll(() =>
        app.db
          .prepare('SELECT cv_url FROM participant WHERE full_name = ?')
          .bind('Captain Updated')
          .first('cv_url'),
      )
      .toBeNull();
  } finally {
    await context.close();
    await thirdContext.close();
  }
});

test('requires consent and leaves legacy profiles unaccepted until they agree', async ({
  page,
  app,
}) => {
  await login(page, app.codes, 'consent@example.test');
  const consent = page.getByRole('checkbox', { name: 'I agree to the terms' });
  await expect(consent).not.toBeChecked();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByText('Please agree to the terms and personal data processing to continue.'),
  ).toBeVisible();
  expect((await app.db.prepare('SELECT id FROM participant').all()).results).toHaveLength(0);
  await onboard(page, 'Consent Participant');
  const accepted = await app.db
    .prepare('SELECT consented_at, consent_policy_version FROM participant')
    .first<{ consented_at: number; consent_policy_version: string }>();
  expect(accepted?.consented_at).toBeGreaterThan(0);
  expect(accepted?.consent_policy_version).toBe(REGISTRATION_POLICY_VERSION);

  await app.db
    .prepare('UPDATE participant SET consented_at = NULL, consent_policy_version = NULL')
    .run();
  await page.goto('/onboarding');
  await expect(consent).not.toBeChecked();
});

test('shows accessible consent and policy links in each language', async ({
  page,
  context,
  app,
}, testInfo) => {
  await login(page, app.codes, 'languages@example.test');
  for (const [locale, copy] of Object.entries({ en, ru, kk })) {
    await context.addCookies([{ name: 'locale', value: locale, url: app.url }]);
    await page.goto('/onboarding');
    const consent = page.getByRole('checkbox', { name: copy.onboarding.consent, exact: true });
    await expect(consent).not.toBeChecked();
    await expect(consent).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('a[href="/privacy"]')).toHaveAttribute('target', '_blank');
    await expect(page.locator('a[href="/terms"]')).toHaveAttribute('target', '_blank');
    await consent.focus();
    await page.keyboard.press('Space');
    await expect(consent).toBeChecked();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `output/playwright/screenshots/${testInfo.project.name}-${locale}-consent.png`,
      fullPage: true,
    });
  }
});

test('blocks protected pages and refuses saved mutations after registration closes', async ({
  page,
  app,
}) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  const mutations: { url: string; body: string; headers: Record<string, string> }[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/_serverFn/'))
      mutations.push({
        url: request.url(),
        body: request.postData() ?? '',
        headers: request.headers(),
      });
  });
  await login(page, app.codes, 'participant@example.test');
  await onboard(page, 'Participant');
  await page.getByRole('textbox', { name: 'Team name' }).fill('Deadline Team');
  await page.getByRole('button', { name: 'Create a team', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deadline Team' })).toBeVisible();
  expect(mutations).toHaveLength(2);
  await app.setDeadline('2000-01-01T00:00:00Z');
  for (const mutation of mutations) {
    const response = await page.request.post(mutation.url, {
      data: mutation.body,
      headers: mutation.headers,
    });
    expect(await response.text()).toContain('onboarding.registrationClosedError');
  }
  await page.reload();
  await expect(page.getByText('Registration is closed, so team changes are locked.')).toBeVisible();
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: 'Registration is closed' })).toBeVisible();
  app.expectedHttpErrors.add(404);
  const forbidden = await page.goto('/admin');
  expect(forbidden?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  expect((await app.db.prepare('SELECT id FROM team').all()).results).toHaveLength(1);
});

test('keeps login on the email step when mail delivery fails', async ({ page, app }) => {
  app.failMail = true;
  app.expectedHttpErrors.add(502);
  await page.goto('/login');
  await page.getByRole('textbox', { name: /^Email\s*\*?$/ }).fill('failed@example.test');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await expect(page.getByText('Could not send the code. Please try again.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Email\s*\*?$/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Enter the code' })).toHaveCount(0);
});

test('cancels attendance changes, restores focus, persists confirmation, and exports the report', async ({
  page,
  app,
}) => {
  await seedEligibleTeam(app.db);
  await login(page, app.codes, 'admin@example.test');
  await page.goto('/checkin');
  await page.getByRole('checkbox', { name: 'Mark Member as checked in', exact: true }).click();
  const checkbox = page.getByRole('checkbox', {
    name: 'Mark Member as not checked in',
    exact: true,
  });
  await expect(checkbox).toBeEnabled();
  await expect
    .poll(() =>
      app.db.prepare("SELECT attended FROM participant WHERE id = 'member'").first('attended'),
    )
    .toBe(1);
  await checkbox.click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.mouse.click(10, 10);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(checkbox).toBeFocused();
  expect(
    await app.db.prepare("SELECT attended FROM participant WHERE id = 'member'").first('attended'),
  ).toBe(1);
  await checkbox.click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(checkbox).toBeFocused();
  await checkbox.click();
  await dialog.getByRole('button', { name: 'Undo check-in', exact: true }).click();
  await expect
    .poll(() =>
      app.db.prepare("SELECT attended FROM participant WHERE id = 'member'").first('attended'),
    )
    .toBe(0);
  await expect(
    page.getByRole('checkbox', { name: 'Mark Member as checked in', exact: true }),
  ).toBeFocused();
  await page.goto('/admin');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const stream = await (await downloading).createReadStream();
  if (!stream) throw new Error('CSV download was unavailable');
  let csv = '';
  for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain('Eligible Team');
  expect(csv).toContain('Member');
});
