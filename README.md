# Women's Hack Day 2026

NU ACM-W's event site, registration, teams, CV uploads, and organiser tools.
TanStack Start runs on Cloudflare Workers with D1, Drizzle, and Better Auth.
The interface supports English, Russian, and Kazakh.

## Local development

Use Node 24.21.0 and Vite+ (`vp`). The repository pins Node and pnpm 12.11.2.

```sh
vp install --frozen-lockfile
cp .dev.vars.example .dev.vars
# Fill in BETTER_AUTH_SECRET; keep BETTER_AUTH_URL=http://localhost:3000.
vp run db:migrate:local
vp dev
```

Without a global `vp` command, run `pnpm install --frozen-lockfile`, then use
`pnpm exec vp` in place of `vp` below.

The server uses port 3000. Without the mail webhook, OTP codes appear in the
server console. CV upload requires the webhook. Workers AI uses the Cloudflare
account even during local development; the rest of the app works without it.

## Configuration and deployment

Local secrets belong in `.dev.vars`; deployed secrets use
`vp exec wrangler secret put <NAME>`. Never commit either.

| Setting                                    | Purpose                                                   |
| ------------------------------------------ | --------------------------------------------------------- |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`    | Session signing and the site's origin                     |
| D1 `database_id` in `wrangler.jsonc`       | Deployment database                                       |
| `GAS_URL`, `GAS_SECRET`                    | OTP mail, CV storage, and report API authentication       |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in                                   |
| `ADMIN_EMAILS`                             | Organisers allowed into `/admin` and `/checkin`           |
| `REGISTRATION_DEADLINE`                    | Optional override of October 20, 2026, 23:59:59 in Astana |

Teams have three to four members. Registration closure blocks profile, team,
AI name generation, and CV mutations on the server.

```sh
vp run db:generate         # Generate migrations after schema changes.
vp run db:migrate:local    # Apply them to local D1.
vp run db:studio:local     # Inspect the local development database.
vp run db:studio:remote    # Inspect the configured remote database.
vp run auth:generate       # Regenerate the Better Auth schema.
vp run types               # Generate Cloudflare binding types.
vp run preview             # Build and preview the Worker locally.
vp run db:migrate:remote   # Apply migrations to the deployment database.
vp run deploy              # Build and deploy.
```

Changing the D1 database ID changes the local database identity; apply local
migrations again. Keep existing migration SQL and Drizzle metadata.

## Mail and CV webhook

1. Create a project at [Google Apps Script](https://script.google.com) and paste
   `gas/Code.gs` into it.
2. Set the `GAS_SECRET` script property. Run `testSendToMe` and approve Gmail
   and Drive permissions.
3. Deploy as a web app, executing as the owner with access set to Anyone.
   Set the site's `GAS_URL` to the `/exec` URL and `GAS_SECRET` to the same secret.
4. Share the private **Women's Hack Day CVs** Drive folder with organisers as
   Viewers. To use another folder, set the `CV_FOLDER_ID` script property.

The deploying Google account sends mail and owns the PDFs. CVs must be PDFs up
to 5 MB; replacement and deletion trash the previous file. After script changes,
edit the deployment to a new version. Run `testSendToMe` again if permissions changed.
`POST /api/report` accepts `{ "secret": GAS_SECRET }` for the Sheets integration.

## Editing and verification

Copy lives in `src/i18n/locales/{en,ru,kk}.json`; keep their keys consistent.
Shared UI uses Base UI and the shadcn `base-nova` style.

```sh
vp check
vp test
vp exec playwright install chromium
vp run test:e2e
```

Server tests run in Workers with real local D1, migrations, and Better Auth.
Browser tests run Chromium against the built Worker with a local mail/Drive stub.
They use isolated storage and test secrets, without Cloudflare account access.
`vp test watch` watches server tests. Browser reports and disposable artifacts
belong under ignored `output/`.
