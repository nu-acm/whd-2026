import { test, expect, login, seedEligibleTeam } from './fixtures';

test('finalizes teams, exports them for proctoring, and keeps the contest card for good', async ({
  page,
  app,
  browser,
}) => {
  await seedEligibleTeam(app.db);
  await login(page, app.codes, 'admin@example.test');
  await app.setDeadline('2000-01-01T00:00:00Z');
  await page.goto('/admin');
  await expect(page.getByText('Numbered: 0 · awaiting a number: 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export for proctoring' })).toBeDisabled();
  await page.getByRole('button', { name: 'Finalize teams' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Finalize', exact: true })
    .click();
  await expect(page.getByText('Teams numbered: 1.')).toBeVisible();

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export for proctoring' }).click();
  const stream = await (await downloading).createReadStream();
  if (!stream) throw new Error('CSV download was unavailable');
  let csv = '';
  for await (const chunk of stream) csv += chunk.toString();
  const code =
    /^id,number,login,code,name\neligible-team,1,team01,([A-HJKMNP-Z2-9]{6}),Eligible Team$/.exec(
      csv,
    )?.[1];
  expect(code, csv).toBeDefined();

  const context = await browser.newContext({ baseURL: app.url, viewport: page.viewportSize() });
  try {
    await context.addCookies([{ name: 'locale', value: 'en', url: app.url }]);
    const captain = await context.newPage();
    app.observe(captain);
    await login(captain, app.codes, 'captain@example.test');
    await expect(captain.getByRole('heading', { name: 'Table 01' })).toBeVisible();
    await expect(captain.getByRole('textbox', { name: 'Codeforces login' })).toHaveValue('team01');
    const password = captain.getByLabel('Codeforces password');
    await expect(password).toHaveAttribute('type', 'password');
    await captain.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue(code ?? '');
    // No contest start is configured, so there is nothing to upload yet.
    await expect(captain.getByRole('link', { name: 'Upload video' })).toHaveCount(0);

    // Reopening registration never hides the card.
    await app.setDeadline('2099-01-01T00:00:00Z');
    await captain.reload();
    await expect(captain.getByRole('heading', { name: 'Table 01' })).toBeVisible();
  } finally {
    await context.close();
  }
});
