import { test, expect, login, onboard, seedEligibleTeam } from './fixtures';

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
  } finally {
    await context.close();
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
