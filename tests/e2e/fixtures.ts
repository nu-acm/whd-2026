import { test as base, expect, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTestHarness, type TestHarness } from 'wrangler';

interface App {
  url: string;
  db: D1Database;
  codes: Map<string, string>;
  failMail: boolean;
  expectedHttpErrors: Set<number>;
  setDeadline: (deadline: string) => Promise<void>;
  observe: (page: Page) => void;
}

export const test = base.extend<{ app: App }>({
  app: async ({ browserName }, provideFixture) => {
    if (browserName !== 'chromium') throw new Error('The smoke suite uses Chromium');
    const codes = new Map<string, string>();
    const errors: string[] = [];
    const expectedHttpErrors = new Set<number>();
    let failMail = false;
    const mail = createServer(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString()) as {
        action: string;
        email: string;
        otp: string;
        secret: string;
      };
      response.setHeader('content-type', 'application/json');
      if (body.secret !== 'test-only-webhook-secret') {
        response.writeHead(401).end(JSON.stringify({ ok: false }));
      } else if (body.action === 'send-otp') {
        if (!failMail) codes.set(body.email, body.otp);
        response.end(JSON.stringify({ ok: !failMail }));
      } else {
        response.end(JSON.stringify({ ok: true, fileId: 'testDriveFile123' }));
      }
    });
    await new Promise<void>((ready) => mail.listen(0, '127.0.0.1', ready));
    const address = mail.address();
    if (!address || typeof address === 'string') throw new Error('Mail stub did not start');
    const built = JSON.parse(await readFile(resolve('dist/server/wrangler.json'), 'utf8')) as {
      compatibility_date: string;
      compatibility_flags: string[];
    };
    // Inline config avoids loading the developer's secrets or remote bindings.
    const config = {
      name: 'whd-2026-browser-test',
      main: resolve('dist/server/index.js'),
      no_bundle: true,
      find_additional_modules: true,
      rules: [{ type: 'ESModule' as const, globs: ['**/*.js', '**/*.mjs'] }],
      compatibility_date: built.compatibility_date,
      compatibility_flags: built.compatibility_flags,
      assets: { directory: resolve('dist/client') },
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'whd-2026-browser-test',
          database_id: 'local-whd-2026-browser-test',
          migrations_dir: resolve('drizzle'),
        },
      ],
      vars: {
        BETTER_AUTH_URL: 'http://localhost',
        BETTER_AUTH_SECRET: 'test-only-auth-secret-with-at-least-32-characters',
        GAS_URL: `http://127.0.0.1:${address.port}/exec`,
        GAS_SECRET: 'test-only-webhook-secret',
        ADMIN_EMAILS: 'admin@example.test',
        REGISTRATION_DEADLINE: '2099-01-01T00:00:00Z',
      },
    };
    await mkdir(resolve('output'), { recursive: true });
    const root = await mkdtemp(resolve('output/browser-'));
    let server: TestHarness | undefined;
    try {
      server = createTestHarness({ root, workers: [{ config }] });
      const { url } = await server.listen();
      config.vars.BETTER_AUTH_URL = url.origin;
      await server.update({ root, workers: [{ config }] });
      const worker = server.getWorker<{
        DB: D1Database;
        GAS_URL: string;
        BETTER_AUTH_SECRET: string;
        GOOGLE_CLIENT_ID?: string;
      }>();
      await worker.applyD1Migrations('DB');
      const testEnv = await worker.getEnv();
      expect(testEnv.GAS_URL === config.vars.GAS_URL, 'Only the local mail stub may be used').toBe(
        true,
      );
      expect(
        testEnv.BETTER_AUTH_SECRET === config.vars.BETTER_AUTH_SECRET,
        'Use test auth secrets',
      ).toBe(true);
      expect(Boolean(testEnv.GOOGLE_CLIENT_ID), 'Google OAuth is disabled in tests').toBe(false);
      let db = testEnv.DB;
      await provideFixture({
        url: url.origin,
        get db() {
          return db;
        },
        codes,
        expectedHttpErrors,
        get failMail() {
          return failMail;
        },
        set failMail(value) {
          failMail = value;
        },
        async setDeadline(deadline) {
          config.vars.REGISTRATION_DEADLINE = deadline;
          await server?.update({ root, workers: [{ config }] });
          db = (await worker.getEnv()).DB;
        },
        observe(page) {
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => {
            if (message.type() !== 'error') return;
            const text = message.text();
            const status = /server responded with a status of (\d+)/.exec(text)?.[1];
            if (!status || !expectedHttpErrors.has(Number(status))) errors.push(text);
          });
          page.on('response', (response) => {
            if (
              response.status() >= 400 &&
              ['image', 'stylesheet', 'font', 'script'].includes(response.request().resourceType())
            )
              errors.push(`Missing asset: ${response.url()}`);
          });
        },
      });
      expect(errors, 'Unexpected browser errors or missing assets').toEqual([]);
    } finally {
      await server?.close();
      await rm(root, { recursive: true, force: true });
      await new Promise<void>((done, reject) =>
        mail.close((error) => (error ? reject(error) : done())),
      );
    }
  },
  baseURL: async ({ app }, provideFixture) => provideFixture(app.url),
  page: async ({ page, app }, provideFixture) => {
    app.observe(page);
    await provideFixture(page);
  },
});
export { expect };

export async function login(page: Page, codes: Map<string, string>, email: string) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /^Email\s*\*?$/ }).fill(email);
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Enter the code' })).toBeVisible();
  const otp = codes.get(email);
  if (!otp) throw new Error('The mail stub did not receive an OTP');
  await page.getByRole('textbox', { name: 'Enter the code' }).fill(otp);
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page).toHaveURL(/\/(onboarding|dashboard|admin)$/);
}

export async function onboard(page: Page, name: string) {
  await page.getByRole('textbox', { name: 'Full name' }).fill(name);
  await page.getByRole('textbox', { name: 'IIN' }).fill('000000000001');
  await page.getByRole('textbox', { name: /^Phone\s*\*?$/ }).fill('+7 701 000 00 00');
  await page.getByRole('combobox', { name: 'Level of study' }).selectOption("Bachelor's");
  await page
    .getByRole('textbox', { name: 'School, college or university' })
    .fill('Nazarbayev University');
  await page.getByRole('textbox', { name: 'City' }).fill('Astana');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function seedEligibleTeam(db: D1Database) {
  for (const [id, name] of [
    ['captain', 'Captain'],
    ['member', 'Member'],
    ['third', 'Third'],
  ]) {
    await db
      .prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)')
      .bind(id, name, `${id}@example.test`)
      .run();
    await db
      .prepare(
        'INSERT INTO participant (id, full_name, iin, phone, city, place_of_study, education_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(id, name, '000000000001', '77010000000', 'Astana', 'University', "Bachelor's")
      .run();
  }
  await db
    .prepare(
      'INSERT INTO team (id, name, name_canonical, invite_slug, captain_id) VALUES (?, ?, ?, ?, ?)',
    )
    .bind('eligible-team', 'Eligible Team', 'eligible team', 'eligible-team', 'captain')
    .run();
  await db.prepare('UPDATE participant SET team_id = ?').bind('eligible-team').run();
}
