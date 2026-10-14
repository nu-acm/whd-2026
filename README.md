# whd-2026

Landing page for Women's Hack Day, the annual three-round team competition
organized by the NU ACM-W Student Chapter.

The 2026 landing uses a dark neon style inspired by Totally Spies, with a mascot
countdown, optimized photo gallery, responsive event sections, and RU/KK/EN copy.
Design context is recorded in `PRODUCT.md` and `DESIGN.md`.

It originated from two existing projects:

- **Structure and features** come from `hacknu-2026` — the section composition
  (fixed navbar → hero → when/where/how band → about → … → footer CTA), the
  `react-i18next` setup, and the UI primitives. The current design uses a static
  hexagon background and a lightweight WebP flower cursor trail.
- **Design, copy and content** come from `acm@nu/WHD` — the pink-on-black palette
  (`#BB046C`), Montserrat, the illustrations and partner logos, and every string
  in all three languages.

## Getting started

Use Node 24 LTS and Vite+ 1.1 or newer. The project pins Node 24.21.0 in
`.node-version` and pnpm 12.11.2 in `package.json`.

```bash
vp install
cp .dev.vars.example .dev.vars     # fill in the local secrets
vp run db:migrate:local            # create the local D1 tables
vp dev                            # http://localhost:3000
```

If the global Vite+ CLI is unavailable, use the pinned pnpm version:
`pnpm install`, then `pnpm exec vp dev`. For a reproducible installation, use
`vp install --frozen-lockfile` or `pnpm install --frozen-lockfile`.

Local development runs at `http://localhost:3000` and fails if the port is occupied.
Build, test, lint and format configuration lives in `vite.config.ts`. Tests use
Node or jsdom with isolated Cloudflare bindings; application plugins load only
for development, preview and builds.

| Command                                              | What it does                                                |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `vp dev`                                             | Start the Vite+ and Workers development server              |
| `vp build`                                           | Build the client and Worker, including image optimization   |
| `vp run preview`                                     | Build and preview the production Worker locally             |
| `vp run deploy`                                      | Build and deploy with Wrangler                              |
| `vp check`                                           | Check formatting, lint rules and TypeScript types           |
| `vp test` / `vp test watch`                          | Run tests once or watch for changes                         |
| `vp lint` / `vp lint --fix`                          | Lint code or apply lint fixes                               |
| `vp fmt` / `vp fmt --check`                          | Format files or check formatting                            |
| `vp run typecheck`                                   | Run the installed TypeScript 7 compiler                     |
| `vp run db:generate`                                 | Generate a migration from the schema                        |
| `vp run db:migrate:local`                            | Apply migrations to local D1                                |
| `vp run db:migrate:remote`                           | Apply migrations to deployed D1                             |
| `vp run db:studio:local` / `vp run db:studio:remote` | Browse a database                                           |
| `vp run auth:generate`                               | Generate the Drizzle auth schema with the pinned `auth` CLI |
| `vp run types`                                       | Generate Workers binding types with Wrangler                |

Existing script names also work through `pnpm`, including `pnpm test`,
`pnpm check` and `pnpm typecheck`. Vite+ built-in commands run their own tools;
`vp run <script>` runs a project script. Use `vp run preview` when the production
build should be refreshed before previewing.

Migration findings and local verification are recorded in the
[Vite+ migration review](docs/viteplus-migration.md). UI components, lint rules,
and verification are recorded in the [shadcn migration review](docs/shadcn-migration.md).

## Architecture

The landing page is server-rendered by **TanStack Start** on **Cloudflare
Workers**, with **D1** for storage and **Better Auth** for sessions. The backend
is a port of `hacknu-2026`'s.

| Route                | Who can reach it                                                 |
| -------------------- | ---------------------------------------------------------------- |
| `/`                  | everyone — the landing page                                      |
| `/login`             | signed out (signed-in visitors are bounced onward)               |
| `/onboarding`        | signed in; also doubles as "edit my details"                     |
| `/dashboard`         | signed in **and** onboarded                                      |
| `/invite/$slug`      | signed in and onboarded; sends others through login first        |
| `/admin`, `/checkin` | emails listed in `ADMIN_EMAILS` — everyone else gets a 404       |
| `/terms`, `/privacy` | everyone                                                         |
| `/api/auth/*`        | Better Auth's handler                                            |
| `/api/report`        | `POST` with `{ "secret": GAS_SECRET }`: JSON for the Sheets sync |

An invite link opened while signed out survives the detour: `/login` and
`/onboarding` carry `?redirect=/invite/<slug>` (Google sign-in included) and
return there afterwards. Only invite paths are honoured; see `src/lib/redirect.ts`.

Guards live in `beforeLoad` on the `_protected` and `_admin` layout routes, and
every server function re-checks the session itself — the layout protects
navigation, the server function protects the data.

Registration is gated on `REGISTRATION_DEADLINE`: once it passes, onboarding and
every team mutation are refused **on the server**, so the client cannot bypass it.

### What you must provide

Local development needs none of these — OTP codes are printed to the server
console, exactly as `hacknu-2026` does when its mail webhook is unset.

| Secret                                      | Needed for                                         |
| ------------------------------------------- | -------------------------------------------------- |
| `BETTER_AUTH_SECRET`                        | signing sessions (any long random string)          |
| `database_id` in `wrangler.jsonc`           | deploying; run `wrangler d1 create whd-db`         |
| `GAS_URL` / `GAS_SECRET`                    | OTP emails; `GAS_SECRET` also guards `/api/report` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional "Sign in with Google"                     |
| `ADMIN_EMAILS`                              | who can open `/admin` and `/checkin`               |

Run `vp run db:migrate:local` again whenever `database_id` changes: the local
database is keyed on it, so a new id starts from an empty database.

The dashboard's "suggest a team name" button uses **Workers AI** through the `AI`
binding in `wrangler.jsonc`. AI bindings always call Cloudflare, even in local
dev, so they need `wrangler login` and are billed to the account (a few tokens per
click). The server allows one request per five seconds and 30 suggestions per
hour for each participant. The allowance is stored in D1 and applies across tabs
and Worker instances. Without AI access the button shows a friendly error and
nothing else breaks.

### Dashboard and admin

- **Dashboard:** status, team and event cards; inline two-step confirm for remove,
  leave and dissolve; success and error banners; open team slots; team changes
  hidden once registration closes. The landing hero points each visitor at their
  next step (register → finish profile → find a team → dashboard).
- **`/admin`:** sortable columns, show/hide columns, eligible/not-eligible filters,
  jump between a participant and their team, CSV export, cached for 5 minutes with
  a throttled Refresh in the shared admin header.
- **`/checkin`:** only eligible teams (at least `MIN_TEAM_SIZE` members); attendance
  and team-status filters (ready / partial / no-show); ticking is optimistic and
  un-ticking asks first.

### Teams

Women's Hack Day competes in teams of **3 to 4** (`MIN_TEAM_SIZE` /
`MAX_TEAM_SIZE` in `src/db/schema.ts`), where HackNU uses 2 to 4. A team below
the minimum is created and visible but flagged as not yet eligible.

Invite slugs transliterate Cyrillic, including the Kazakh letters — "Қыздар
Коды" becomes `kyzdar-kody` — so invite links stay URL-safe in all three
languages.

## Editing content

**All copy lives in `src/i18n/locales/{en,ru,kk}.json`.** The three files share an
identical key structure — add a key to one and add it to all three.

Two inline tags are available inside any string:

```
<pink>emphasised</pink>
<link href="https://...">label</link>
```

They are rendered by `parseTextWithLinks` in `src/lib/text.tsx`, which keeps
emphasis and links in the hands of translators rather than hard-coded in JSX.

**Links, dates and other non-text settings live in `src/lib/event.ts`** —
registration URL, the countdown deadline, the map link, and the social links.

> The hero countdown targets `REGISTRATION_DEADLINE` in `src/lib/event.ts`,
> currently WHD 2025's deadline of 22 October 2025. Because that date has
> passed, the hero shows the `countdown.ended` message instead of a timer.
>
> That constant only drives the countdown display. The **server-side** deadline
> that actually blocks registration is the `REGISTRATION_DEADLINE` secret in
> `.dev.vars`; set both when rolling the site over to a new edition.

## Sections

| Component   | Section         | Notes                                                          |
| ----------- | --------------- | -------------------------------------------------------------- |
| `Navbar`    | —               | Fixed pink bar, anchor links, language switcher, mobile drawer |
| `Hero`      | `#top`          | Hexagon backdrop, countdown, registration CTA                  |
| `InfoCards` | `#info`         | When / Where / How, in oversized type                          |
| `About`     | `#about`        | Three stat cards plus the description and organiser blurb      |
| `Timeline`  | `#timeline`     | Registration → confirmation → event day                        |
| `Schedule`  | `#schedule`     | The event-day running order                                    |
| `Benefits`  | `#benefits`     | Prize pool, packages, certificates, coaching                   |
| `FAQ`       | `#faq`          | WHD's ten questions, grouped into four categories              |
| `Partners`  | `#partners`     | General sponsor plus info partners                             |
| `Footer`    | `#registration` | Closing CTA, socials, copyright                                |

Schedule times and the section ordering are structural and live in the
components; everything a reader sees as words lives in the locale files.

## Fonts

The site uses **JetBrains Mono**, matching `hacknu-2026`, self-hosted via
`@fontsource-variable/jetbrains-mono` — no third-party request on load, and it
renders correctly offline. Each subset ships as one variable file with
`unicode-range` set, so a visitor downloads only what the page uses (4 files for
Latin + Cyrillic + the Kazakh patch).

### The Kazakh patch

`public/fonts/jetbrains-mono-kazakh-wght-normal.woff2` is copied from
`hacknu-2026` and is **not optional**. Fontsource's `cyrillic-ext` subset
declares a unicode-range that covers Kazakh but is missing twelve of the
glyphs — Әә Ғғ Ққ Ңң Ұұ Һһ. Without the patch they fall back to a system font
mid-word, breaking the monospace grid. The `@font-face` block at the top of
`styles.css` layers the patch over the fontsource faces for exactly those
codepoints. Verified: all Kazakh letters render at the 38.41px mono advance.

### Known gap: the tenge sign

JetBrains Mono has no glyph for ₸ (U+20B8), and there is nothing to subset
because the upstream font lacks it. It appears in `about.prizeUnit` and
`benefits.prizePool`, where it falls back to a system font and sits slightly off
the mono grid (35.59px vs 38.41px). It renders and is legible, just visibly
lighter than the digits beside it. Montserrat covered it; this is the one thing
lost in the switch.

Montserrat also had no U+2192 (→), which is why the "show on map" arrow is an
inline SVG in `InfoCards.tsx` rather than a character in the locale strings.
That still holds — JetBrains Mono has no arrow either.

Italics are not imported, matching `hacknu-2026`; the footer's `italic` class is
synthesised by the browser.

## Stack

Vite+ · React 19.3 · TypeScript · TanStack Start · Cloudflare Workers/D1 ·
Tailwind CSS v4 · shadcn Base UI/Nova · TanStack Table v9 · react-i18next ·
Motion · Fontsource

The cursor trail uses a fixed DOM image pool and CSS animations. React Three
Fiber is no longer a dependency.

## UI maintenance

`components.json` selects `base-nova`. WHD keeps its dark surfaces, pink accents,
fonts, and RU/KK/EN content. Shared component appearance belongs in named
variants or component-owned CSS; call-site classes may adjust layout.

Run `pnpm exec vp lint` for the six blocking `@shadcn/lint` rules, or
`pnpm exec vp check` for formatting, lint, and types together. Lint loads the
actual `src/styles.css` theme and checks all source files, including UI components.
Vendored upstream skills are excluded.

The official project skill lives in `.agents/skills/shadcn`; `SOURCE.md` records
its upstream revision. Read it with `AGENTS.md` and `DESIGN.md` before UI changes.
Preview registry updates before merging them:

```bash
pnpm dlx shadcn@4.21.4 add button --dry-run
pnpm dlx shadcn@4.21.4 add button --diff button.tsx
```

Merge relevant upstream changes while keeping WHD variants and behavior. Do not
run `init` over the existing app or overwrite its fonts and theme.
