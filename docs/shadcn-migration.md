# shadcn and Base UI migration

WHD now uses Base UI components with the shadcn Nova configuration. The migration
keeps its routes, Workers/D1 services, authentication, React 19.3, translations,
fonts, assets, custom grids, and existing product behavior.

## Reference and versions

A disposable TanStack Start reference was generated outside WHD:

```bash
pnpm dlx shadcn@4.21.4 init --preset b0 --template start --pointer --base base --name whd-shadcn-reference --no-monorepo
```

The reference provided component APIs and composition patterns. Its neutral
palette and Inter font were replaced with WHD semantic tokens and existing
Lexend/Montserrat/JetBrains Mono imports, including Kazakh glyph coverage.

| Package                 | Version            | Purpose                                          |
| ----------------------- | ------------------ | ------------------------------------------------ |
| `@base-ui/react`        | 1.9.0              | Controls, accordions, dialogs, tabs, and toggles |
| `@shadcn/lint`          | 0.2.1              | Blocking UI rules in Vite+ Oxlint                |
| `@tanstack/react-table` | 9.3.1              | Admin sorting and column visibility              |
| `cn`                    | Existing 0.4 range | Class merging re-exported by `src/lib/utils.ts`  |

Direct `radix-ui`, `clsx`, and `tailwind-merge` dependencies were removed once
source imports no longer used them. Existing Vite+, Workers, and D1 configuration
was retained.

## Component behavior

Shared components own their appearance through variants and CSS. Button, Field,
Input, Native Select, Input Group, Checkbox, Tabs, Toggle Group, Card, Separator,
Spinner, Empty, and Table compose account screens and admin desks. The canonical Field family is available for upstream recipes; the WHD
`FormField` adapter retains label/error wiring, OTP paste and resend, conditional guardian fields,
team-name cancellation and cooldowns, upload/drop validation, and registration
locks. Inline two-click confirmation buttons still use their existing timeout.

Button exposes upstream default variants and sizes, icon sizes, and
`buttonVariants` from its standard module. Legacy WHD aliases remain. Card exposes
`size` and `CardAction`; account headers, content, and footers are siblings,
with descriptions inside headers and spacing in owned variants. FormField keeps the existing render-prop
API above Field, FieldLabel, FieldDescription, and FieldError.

The Button helper lives in a separate module and is re-exported for recipe
compatibility. A file-specific React Fast Refresh rule allows that named export;
all six shadcn rules remain errors without additional allowances.

Both accordion compositions use Base UI value arrays and allow one open item.
Keyboard verification covers Tab, Enter, Space, and collapse. Base UI 1.9 removed
roving focus following updated APG guidance; arrow keys are not used to move
between accordion questions. CSS uses `data-open`/`data-closed` and
`--accordion-panel-height`.

Confirmation uses Alert Dialog, starts with Cancel focused, ignores backdrop
clicks, and dismisses with Cancel/Escape. Its content scrolls internally on
short screens, including long translated participant names. Gallery uses Dialog, retains keyboard
image navigation and crossfades, dismisses on backdrop/Escape, locks scrolling,
and restores focus. Portals use component-owned stacking. Native dialogs and
Radix state selectors are gone.

Admin tables use TanStack Table v9 sorting and visibility features with shadcn
Table markup. Typed, memoized column definitions own accessors, headers, cells,
and labels. The shared renderer uses header groups, `flexRender`, visible cells,
and stable participant/team IDs. Attendance cells consume pending state through
context so a mutation does not remount their confirmation dialog or checkbox.
Search fields, natural case-insensitive comparisons, numeric and
attendance comparisons, counts, row links, CSV export, refresh, and attendance
updates retain their existing behavior. All matching rows remain visible; there
is no pagination or selection.

Gallery offsets and flower positions, dimensions, rotations, drift, and duration
use CSS custom properties consumed by stylesheets. CSS and JavaScript both
respect reduced motion. The flower trail retains its bounded image pool.

## Strict lint and updates

`vite.config.ts` registers the actual `@shadcn/lint` plugin. All six rules are
errors across source files, including shared UI components:

- `no-restyle`, allowing layout overrides at call sites
- `no-raw-colors`
- `no-arbitrary-values`
- `no-inline-styles`
- `no-unknown-classes`
- `require-static-classes`

None of these six rules has suppressions or animation allowances. Lint resolves
`components.json`, `src/styles.css`, and its imports. Plain CSS is where WHD owns
its component geometry and tokens; these JSX/class rules do not inspect every
CSS declaration or third-party runtime style.

```bash
pnpm exec vp lint
pnpm exec vp check
```

The official `shadcn-ui/ui` skill is installed in `.agents/skills/shadcn` at
revision `30a58d4498f270af1c1e981a7d78a15cf5740841`. Its source record is in
`SOURCE.md`. Vendored skill sources are excluded from project formatting/lint.
WHD-specific instructions live in `AGENTS.md` and `DESIGN.md`.

Preview upstream changes before merging:

```bash
pnpm dlx shadcn@4.21.4 add button --dry-run
pnpm dlx shadcn@4.21.4 add button --diff button.tsx
```

Review changed APIs and merge relevant source changes while preserving local
variants, fonts, accessibility, and behavior. Review the release before moving
to a different CLI version.

## Validation

- Formatting, strict lint, and TypeScript through `pnpm exec vp check` pass with
  no warnings, theme discovery failures, or fallback diagnostics.
- The full test suite covers existing forms, OTP, CV, server behavior, and
  check-in, plus new accordion/dialog interactions, Table v9 sorting/search/
  visibility, team-name cancellation/cooldowns, flower motion gates, and React
  19.3 SSR hydration with controlled state and a portal.
- The production client and Worker build pass.
- Live TanStack Start `/`, `/login`, and `/faq` were checked in EN/RU/KK at
  320, 390, 768, and 1440px. Fresh navigation logs show no application or
  hydration errors.
- Dashboard, no-team, locked registration, onboarding, OTP, report, and check-in
  were checked in the same language/width matrix using real components and
  synthetic local fixture data. Narrow member actions were raised to 44px.
- Browser checks verified gallery arrow navigation, scroll locking, Escape,
  backdrop dismissal, and restored focus. Attendance confirmation verified
  initial Cancel focus, retained state after backdrop clicks, and Escape focus
  restoration. Admin sorting, search, filters, and column visibility were
  exercised without attendance writes.
- Reduced-motion CSS and the JavaScript media-query branch were exercised in a
  disposable fixture. It produced static gallery offsets and no active CSS
  animations. No OS preference was changed.

Screenshots, responsive measurements, and command logs are under ignored
`output/shadcn/`. Disposable fixture source and its server are removed after QA;
there is no permanent preview route. Protected screens use fixtures and tests,
so the review does not claim live email delivery, OAuth, Drive uploads, or
real-account mutations.

No database migration or deployment was performed. Existing uncommitted work
was preserved.

## Review fixes, 2026-10-14

All six migration-review findings are addressed. Hidden column toggles and Field
helper text use the readable muted foreground; the enabled unpressed column state
measures 9.37:1 against the page background. A 320x220 Russian confirmation with
a 96-character synthetic name scrolls internally and keeps both 44px actions
reachable. Cancel focus, backdrop retention, Escape dismissal, and restored focus
were verified in the browser.

Regression tests render the actual Gallery, report route, and check-in route.
They cover photo selection and crossfades, wrapping keyboard/button navigation,
all gallery dismissal paths, natural/numeric/attendance sorting, hidden search
fields, eligibility/readiness filters, column visibility, linked rows, complete
CSV export, concurrent attendance rollback, and focus after a confirmed update.
A standard Card/Field/Button recipe checks public API composition and accessible
validation wiring.

The updated suite passes 182 tests across 34 files. `vp check` passes formatting,
strict lint, and TypeScript without theme-discovery or fallback warnings; the
production client and Worker build pass. Updated account/admin fixtures were
checked in EN/RU/KK at 320, 390, 768, and 1440px, including locked and pending
states. Evidence is under `output/shadcn/fix-*`. The disposable fixture uses
synthetic data and never writes attendance or account data. Live TanStack Start
login also passes all 12 language/width combinations after fresh SSR navigation,
with no application or hydration warnings.
