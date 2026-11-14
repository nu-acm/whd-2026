import { test, expect, login, seedEligibleTeam } from './fixtures';
import en from '@/i18n/locales/en.json' with { type: 'json' };
import ru from '@/i18n/locales/ru.json' with { type: 'json' };
import kk from '@/i18n/locales/kk.json' with { type: 'json' };

test('uses configured jury access before assignments and preserves scores when access is revoked', async ({
  page,
  app,
}) => {
  await login(page, app.codes, 'judge@example.test');
  await expect(page).toHaveURL(/\/jury$/);
  await expect(page.getByText(en.scoring.noAssignments)).toBeVisible();
  await seedEligibleTeam(app.db);
  await app.db.prepare("UPDATE team SET number = 1 WHERE id = 'eligible-team'").run();
  await app.db
    .prepare(
      "INSERT INTO jury_assessment (team_id, juror_email, scores) VALUES ('eligible-team', 'judge@example.test', '[20,25,20,25,10]')",
    )
    .run();
  await page.reload();
  await expect(page.getByRole('button', { name: en.scoring.rowSaved, exact: true })).toBeVisible();
  await app.setJuryEmails('');
  app.expectedHttpErrors.add(404);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  expect(await app.db.prepare('SELECT juror_email, scores FROM jury_assessment').first()).toEqual({
    juror_email: 'judge@example.test',
    scores: '[20,25,20,25,10]',
  });
  await app.setJuryEmails(' JUDGE@example.test,judge@example.test ');
  await page.goto('/login');
  await expect(page).toHaveURL(/\/jury$/);
  await expect(page.getByRole('button', { name: en.scoring.rowSaved, exact: true })).toBeVisible();
});

test('keeps ICPC and Math with admins, Product Design with jury, and publishes corrections', async ({
  page,
  app,
  browser,
}) => {
  await seedEligibleTeam(app.db);
  await app.db
    .prepare("UPDATE team SET number = 1, contest_password = 'ABC234' WHERE id = 'eligible-team'")
    .run();
  await app.setDeadline('2000-01-01T00:00:00Z');
  await page.goto('/results');
  await expect(page.getByText(en.scoring.notPublished)).toBeVisible();
  await login(page, app.codes, 'admin@example.test');
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/scoring');
  await page.getByRole('textbox', { name: en.scoring.icpc, exact: true }).fill('480');
  await page.getByRole('textbox', { name: en.scoring.math, exact: true }).fill('54.5');
  await page.getByRole('button', { name: en.scoring.saveRoundScores }).click();
  await expect(page.getByText(en.scoring.saved, { exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: en.scoring.rankings, exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: /^Email/ })).toHaveCount(0);
  await page.getByRole('button', { name: en.scoring.distribute, exact: true }).click();
  await expect(page.getByText(en.scoring.distributed, { exact: true })).toBeVisible();
  await expect(page.getByText('judge@example.test · Pending', { exact: true })).toBeVisible();
  // Reassignment is available only before grading, with cancel and confirmation.
  await page.getByRole('button', { name: en.scoring.distribute, exact: true }).click();
  const redistribution = page.getByRole('alertdialog');
  await expect(redistribution.getByText(en.scoring.redistributeBody)).toBeVisible();
  await redistribution.getByRole('button', { name: en.common.cancel, exact: true }).click();
  await expect(redistribution).toHaveCount(0);
  await page.getByRole('button', { name: en.scoring.distribute, exact: true }).click();
  await redistribution.getByRole('button', { name: en.scoring.distribute, exact: true }).click();
  await expect(page.getByText(en.scoring.distributed, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: en.scoring.rankings, exact: true }).click();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: en.scoring.publish, exact: true })).toBeDisabled();
  await expect(page.getByRole('cell', { name: '0 / 1', exact: true })).toBeVisible();
  const context = await browser.newContext({ baseURL: app.url, viewport: page.viewportSize() });
  try {
    await context.addCookies([{ name: 'locale', value: 'en', url: app.url }]);
    const jury = await context.newPage();
    app.observe(jury);
    await login(jury, app.codes, 'judge@example.test');
    await expect(jury).toHaveURL(/\/jury$/);
    await expect(jury.getByRole('textbox', { name: en.scoring.icpc, exact: true })).toHaveCount(0);
    await expect(jury.getByRole('textbox', { name: en.scoring.math, exact: true })).toHaveCount(0);
    await expect(jury.getByRole('button', { name: en.scoring.saveRoundScores })).toHaveCount(0);
    for (const [key, score] of [
      ['understanding', '20'],
      ['value', '25'],
      ['prototype', '20'],
      ['validation', '25'],
      ['presentation', '10'],
    ] as const)
      await jury.getByRole('textbox', { name: en.scoring.criteria[key] }).fill(score);
    await jury
      .getByRole('textbox', { name: en.scoring.comment, exact: true })
      .fill('Private jury feedback');
    await jury.getByRole('button', { name: en.common.save, exact: true }).click();
    await expect(jury.getByRole('button', { name: en.scoring.rowSaved })).toBeVisible();
    expect(
      await app.db
        .prepare(
          "SELECT p.id FROM participant p JOIN user u ON u.id = p.id WHERE u.email = 'judge@example.test'",
        )
        .first(),
    ).toBeNull();
    await page.getByRole('link', { name: en.scoring.adminTitle, exact: true }).click();
    await expect(
      page.getByRole('button', { name: en.scoring.distribute, exact: true }),
    ).toBeDisabled();
    await expect(page.getByText(en.scoring.distributionLocked)).toBeVisible();
    const table = page.getByRole('table', { name: en.scoring.roundScores, exact: true });
    await expect(table.getByText('Private jury feedback')).toBeVisible();
    await expect(table.getByRole('textbox', { name: en.scoring.icpc, exact: true })).toHaveValue(
      '480',
    );
    await expect(table.getByRole('textbox', { name: en.scoring.math, exact: true })).toHaveValue(
      '54.5',
    );
    for (const label of Object.values(en.scoring.criteria))
      await expect(table.getByRole('textbox', { name: label })).toHaveCount(0);
    await page.getByRole('link', { name: en.scoring.rankings, exact: true }).click();
    await expect(page.getByRole('cell', { name: '91.25', exact: true })).toBeVisible();
    await page.getByRole('button', { name: en.scoring.publish, exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: en.common.confirm, exact: true })
      .click();
    await expect(page.getByText(en.scoring.published, { exact: true })).toBeVisible();
    await jury.reload();
    await expect(
      jury.getByRole('textbox', { name: en.scoring.comment, exact: true }),
    ).toBeDisabled();
    await expect(jury.getByRole('button', { name: en.scoring.rowSaved })).toBeDisabled();
    await expect(jury.getByRole('button', { name: en.scoring.saveRoundScores })).toHaveCount(0);
    await page.getByRole('link', { name: en.scoring.adminTitle, exact: true }).click();
    await expect(page.getByRole('button', { name: en.scoring.saveRoundScores })).toBeDisabled();
    await page.getByRole('link', { name: en.scoring.rankings, exact: true }).click();
    await jury.goto('/results');
    await expect(jury.getByText('Private jury feedback')).toHaveCount(0);
    await expect(jury.getByRole('cell', { name: '91.25', exact: true })).toBeVisible();
    await page.getByRole('button', { name: en.scoring.unpublish, exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: en.common.confirm, exact: true })
      .click();
    await expect(page.getByText(en.scoring.unpublished, { exact: true })).toBeVisible();
    await page.getByRole('link', { name: en.scoring.adminTitle, exact: true }).click();
    await page.getByRole('textbox', { name: en.scoring.math, exact: true }).fill('60');
    await page.getByRole('button', { name: en.scoring.saveRoundScores }).click();
    await expect(page.getByText(en.scoring.saved, { exact: true })).toBeVisible();
    await page.getByRole('link', { name: en.scoring.rankings, exact: true }).click();
    await expect(page.getByRole('cell', { name: '94.00', exact: true })).toBeVisible();
    await page.getByRole('button', { name: en.scoring.publish, exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: en.common.confirm, exact: true })
      .click();
    await expect(page.getByText(en.scoring.published, { exact: true })).toBeVisible();
    app.expectedHttpErrors.add(404);
    for (const path of ['/admin', '/scoring', '/rankings']) {
      await jury.goto(path);
      await expect(jury.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    }
    await page.goto('/jury');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('saves admin round scores independently and validates table forms', async ({ page, app }) => {
  await seedEligibleTeam(app.db);
  await app.db.prepare("UPDATE team SET number = 1 WHERE id = 'eligible-team'").run();
  await app.db
    .prepare(
      "INSERT INTO team (id, name, name_canonical, invite_slug, captain_id, number) VALUES ('second-team', 'Second Team', 'second team', 'second-team', 'captain', 2)",
    )
    .run();
  await login(page, app.codes, 'admin@example.test');
  await page.goto('/scoring');
  const table = page.getByRole('table', { name: en.scoring.roundScores, exact: true });
  const first = table.getByRole('row', { name: 'Table 01 · Eligible Team', exact: true });
  const second = table.getByRole('row', { name: 'Table 02 · Second Team', exact: true });
  await first.getByRole('textbox', { name: 'ICPC', exact: true }).fill('0');
  const firstMath = first.getByRole('textbox', { name: 'Math', exact: true });
  await expect(firstMath).toHaveAttribute('pattern', '[0-9]{1,2}([.][0-9])?');
  await expect(firstMath).toHaveAttribute('inputmode', 'decimal');
  await firstMath.fill('54');
  await firstMath.pressSequentially('.5');
  await expect(firstMath).toHaveValue('54.5');
  for (const value of ['61', '60.1', '100', '-1', '0.55', '1.001', '1e1', 'abc']) {
    await firstMath.fill(value);
    await expect(firstMath).toHaveValue('54.5');
  }
  await firstMath.fill('60.0');
  await expect(firstMath).toHaveValue('60.0');
  await firstMath.fill('0.1');
  await expect(firstMath).toHaveValue('0.1');
  await firstMath.fill('54,5');
  await expect(firstMath).toHaveValue('54.5');
  await second.getByRole('textbox', { name: 'ICPC', exact: true }).fill('55');
  await first.getByRole('textbox', { name: 'Math', exact: true }).press('Enter');
  await expect(page.getByText(en.scoring.saved, { exact: true })).toBeVisible();
  expect(await app.db.prepare('SELECT team_id, icpc, math FROM round_score').all()).toMatchObject({
    results: [{ team_id: 'eligible-team', icpc: 0, math: 54.5 }],
  });
  await expect(second.getByRole('textbox', { name: 'ICPC', exact: true })).toHaveValue('55');
  const secondIcpc = second.getByRole('textbox', { name: 'ICPC', exact: true });
  await expect(secondIcpc).toHaveAttribute('pattern', '[0-9]{1,3}');
  await expect(secondIcpc).toHaveAttribute('autocomplete', 'off');
  for (const value of ['601', '-1', '0.72', '1e2', 'abc', '0000']) {
    await secondIcpc.fill(value);
    await expect(secondIcpc).toHaveValue('55');
  }
  await secondIcpc.fill('600');
  await expect(secondIcpc).toHaveValue('600');
  await secondIcpc.pressSequentially('1');
  await expect(secondIcpc).toHaveValue('600');
  await secondIcpc.clear();
  await expect(secondIcpc).toHaveValue('');
  expect(
    await app.db.prepare("SELECT * FROM round_score WHERE team_id = 'second-team'").first(),
  ).toBeNull();
  await second.getByRole('textbox', { name: 'ICPC', exact: true }).fill('55');
  await second.getByRole('button', { name: en.scoring.saveRoundScores }).click();
  await expect(page.getByText(en.scoring.saved, { exact: true })).toBeVisible();
  expect(
    await app.db
      .prepare("SELECT icpc, math FROM round_score WHERE team_id = 'second-team'")
      .first(),
  ).toEqual({ icpc: 55, math: null });
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: en.scoring.math, exact: true }).first(),
  ).toHaveValue('54.5');
});

test('saves jury Product Design rows independently and enforces criterion limits', async ({
  page,
  app,
}) => {
  await seedEligibleTeam(app.db);
  await app.db.prepare("UPDATE team SET number = 1 WHERE id = 'eligible-team'").run();
  await app.db
    .prepare(
      "INSERT INTO team (id, name, name_canonical, invite_slug, captain_id, number) VALUES ('second-team', 'Second Team', 'second team', 'second-team', 'captain', 2)",
    )
    .run();
  await app.db
    .prepare(
      "INSERT INTO jury_assessment (team_id, juror_email) VALUES ('eligible-team', 'judge@example.test'), ('second-team', 'judge@example.test')",
    )
    .run();
  await login(page, app.codes, 'judge@example.test');
  const table = page.getByRole('table', { name: en.scoring.juryTitle, exact: true });
  const first = table.getByRole('row', { name: 'Table 01 · Eligible Team', exact: true });
  const second = table.getByRole('row', { name: 'Table 02 · Second Team', exact: true });
  for (const label of Object.values(en.scoring.criteria)) {
    await first.getByRole('textbox', { name: label, exact: true }).fill('0');
    await second.getByRole('textbox', { name: label, exact: true }).fill('1');
  }
  const firstComment = first.getByRole('textbox', { name: en.scoring.comment, exact: true });
  const secondComment = second.getByRole('textbox', { name: en.scoring.comment, exact: true });
  await firstComment.fill('First team feedback');
  await secondComment.fill('Second team draft');
  await first
    .getByRole('textbox', { name: en.scoring.criteria.presentation, exact: true })
    .press('Enter');
  await expect(first.getByRole('button', { name: en.scoring.rowSaved, exact: true })).toBeVisible();
  await expect(
    first.getByRole('button', { name: en.scoring.rowSaved, exact: true }),
  ).toBeDisabled();
  await expect(first.getByRole('status')).toHaveText('0 / 100');
  expect(
    await app.db
      .prepare("SELECT comment FROM jury_assessment WHERE team_id = 'eligible-team'")
      .first(),
  ).toEqual({ comment: 'First team feedback' });
  await expect(secondComment).toHaveValue('Second team draft');
  await firstComment.fill('Updated feedback\nNext steps');
  await expect(first.getByRole('button', { name: en.common.save, exact: true })).toBeEnabled();
  await first.getByRole('button', { name: en.common.save, exact: true }).click();
  await expect(
    first.getByRole('button', { name: en.scoring.rowSaved, exact: true }),
  ).toBeDisabled();
  await expect(secondComment).toHaveValue('Second team draft');
  const firstScore = first.getByRole('textbox', {
    name: en.scoring.criteria.understanding,
    exact: true,
  });
  await firstScore.fill('1');
  await expect(first.getByRole('button', { name: en.common.save, exact: true })).toBeEnabled();
  await expect(first.getByRole('status')).toHaveText('1 / 100');
  await firstScore.fill('0');
  await expect(
    first.getByRole('button', { name: en.scoring.rowSaved, exact: true }),
  ).toBeDisabled();

  await expect(
    second.getByRole('textbox', { name: en.scoring.criteria.understanding, exact: true }),
  ).toHaveValue('1');
  for (const [criterion, max] of [
    ['understanding', 20],
    ['value', 25],
    ['prototype', 20],
    ['validation', 25],
    ['presentation', 10],
  ] as const) {
    const input = second.getByRole('textbox', {
      name: en.scoring.criteria[criterion],
      exact: true,
    });
    await input.fill(String(max));
    await expect(input).toHaveValue(String(max));
    for (const value of [String(max + 1), '-1', '0.72', '1e1', 'abc', '0000']) {
      await input.fill(value);
      await expect(input).toHaveValue(String(max));
    }
    await input.pressSequentially('9');
    await expect(input).toHaveValue(String(max));
    await input.press('Backspace');
    await expect(input).toHaveValue(String(max).slice(0, -1));
    await input.clear();
    await expect(input).toHaveValue('');
    await expect(second.getByRole('button', { name: en.common.save, exact: true })).toBeDisabled();
    await input.pressSequentially('1');
    await expect(input).toHaveValue('1');
  }
  expect(
    await app.db
      .prepare("SELECT scores FROM jury_assessment WHERE team_id = 'second-team'")
      .first(),
  ).toEqual({ scores: null });
  await second.getByRole('button', { name: en.common.save, exact: true }).click();
  await expect(
    second.getByRole('button', { name: en.scoring.rowSaved, exact: true }),
  ).toBeVisible();
  expect(await app.db.prepare('SELECT count(*) AS n FROM round_score').first()).toEqual({ n: 0 });
  await page.reload();
  await expect(firstComment).toHaveValue('Updated feedback\nNext steps');
  await expect(secondComment).toHaveValue('Second team draft');
  await firstComment.clear();
  await first.getByRole('button', { name: en.common.save, exact: true }).click();
  await expect(
    first.getByRole('button', { name: en.scoring.rowSaved, exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(firstComment).toHaveValue('');
});

for (const [locale, copy] of Object.entries({ en, ru, kk })) {
  test(`renders scoring screens and accessible criteria in ${locale}`, async ({
    page,
    app,
    isMobile,
  }) => {
    await seedEligibleTeam(app.db);
    await app.db.prepare("UPDATE team SET number = 1 WHERE id = 'eligible-team'").run();
    await app.db
      .prepare(
        "INSERT INTO jury_assessment (team_id, juror_email) VALUES ('eligible-team', 'judge@example.test')",
      )
      .run();
    await login(page, app.codes, 'judge@example.test');
    await page.context().addCookies([{ name: 'locale', value: locale, url: app.url }]);
    await page.goto('/jury');
    await expect(page.getByRole('heading', { name: copy.scoring.juryTitle })).toBeVisible();
    const juryTable = page.getByRole('table', { name: copy.scoring.juryTitle, exact: true });
    await expect(juryTable).toBeVisible();
    await expect(juryTable.getByRole('columnheader')).toHaveCount(10);
    await expect(juryTable.getByText(copy.scoring.pending, { exact: true })).toHaveCount(0);
    await expect(juryTable.getByRole('status')).toHaveText('0 / 100');
    await expect(juryTable.getByRole('row')).toHaveCount(2);
    await expect(juryTable.getByRole('textbox')).toHaveCount(6);
    for (const input of await juryTable.locator('input').all()) {
      await expect(input).toHaveCSS('appearance', 'textfield');
      await expect(input).toHaveAttribute('pattern', '[0-9]{1,2}');
      await expect(input).toHaveAttribute('autocomplete', 'off');
      const acceptsAuthenticationCode = await input.evaluate((element) => {
        const pattern = new RegExp(`^(?:${(element as HTMLInputElement).pattern})$`);
        return ['1234', '123456', '12345678'].some((code) => pattern.test(code));
      });
      expect(acceptsAuthenticationCode).toBe(false);
      await expect(input).toHaveAttribute('inputmode', 'numeric');
    }
    await expect(
      juryTable.getByRole('textbox', { name: copy.scoring.comment, exact: true }),
    ).toBeVisible();
    for (const [criterion, label] of Object.entries(copy.scoring.criteria)) {
      const trigger = juryTable.getByRole('button', {
        name: new RegExp(
          `^${copy.scoring.criteriaShort[criterion as keyof typeof copy.scoring.criteriaShort]} /`,
        ),
      });
      if (isMobile) await trigger.tap();
      else await trigger.hover();
      const hint = page.getByRole('dialog', {
        name: copy.scoring.criteriaShort[criterion as keyof typeof copy.scoring.criteriaShort],
        exact: true,
      });
      await expect(hint).toBeVisible();
      await expect(hint.getByText(label, { exact: true })).toBeVisible();
      const bounds = await hint.boundingBox();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );
      if (isMobile) {
        await juryTable.getByRole('rowheader', { name: 'Eligible Team', exact: true }).tap();
      } else {
        await page.keyboard.press('Escape');
      }
      await expect(hint).toBeHidden();
    }
    const firstCriterion = juryTable.getByRole('button', {
      name: new RegExp(`^${copy.scoring.criteriaShort.understanding} /`),
    });
    await page.getByRole('button', { name: copy.admin.refresh, exact: true }).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(firstCriterion).toBeFocused();
    await expect(
      page.getByRole('dialog', { name: copy.scoring.criteriaShort.understanding, exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(firstCriterion).toBeFocused();
    await expect(page.getByRole('textbox', { name: copy.scoring.icpc, exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('textbox', { name: copy.scoring.math, exact: true })).toHaveCount(
      0,
    );
    for (const label of Object.values(copy.scoring.criteria))
      await expect(page.getByRole('textbox', { name: label })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.goto('/results');
    await expect(page.getByRole('heading', { name: copy.scoring.resultsTitle })).toBeVisible();
    await expect(page.getByText(copy.scoring.notPublished)).toBeVisible();
    await page.context().clearCookies();
    await page.context().addCookies([{ name: 'locale', value: 'en', url: app.url }]);
    await login(page, app.codes, 'admin@example.test');
    await page.context().addCookies([{ name: 'locale', value: locale, url: app.url }]);
    await page.goto('/scoring');
    await expect(page.getByRole('heading', { name: copy.scoring.adminTitle })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(2);
    await expect(
      page.getByRole('button', { name: copy.scoring.distribute, exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: copy.scoring.math, exact: true })).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: `${copy.scoring.icpc} / 600`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: `${copy.scoring.math} / 60`, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('table', { name: copy.scoring.rankings, exact: true })).toHaveCount(
      0,
    );
    expect(await page.evaluate(() => window.innerWidth)).toBe(page.viewportSize()?.width);
    await page.getByRole('link', { name: copy.scoring.rankings, exact: true }).click();
    await expect(page).toHaveURL(/\/rankings$/);
    await expect(
      page.getByRole('heading', { name: copy.scoring.rankings, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('table', { name: copy.scoring.rankings, exact: true }),
    ).toBeVisible();
    for (const [round, max, weight] of [
      ['icpc', 600, 30],
      ['math', 60, 30],
      ['product', 100, 40],
    ] as const) {
      await expect(
        page.getByRole('columnheader', {
          name: `${copy.scoring[round]} / ${max} (${weight}%)`,
          exact: true,
        }),
      ).toBeVisible();
    }
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: copy.scoring.publish, exact: true }),
    ).toBeDisabled();
    expect(await page.evaluate(() => window.innerWidth)).toBe(page.viewportSize()?.width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
