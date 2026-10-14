# Vite+ migration review

Implemented and verified on October 14, 2026, using Node 24 LTS. Registry stable
releases were checked before upgrading. Node 24 and its matching types follow
the selected LTS line; Vite+ components retain their bundled versions.

| Component                  | Version               |
| -------------------------- | --------------------- |
| Node                       | 24.21.0               |
| pnpm                       | 12.11.2               |
| Project and global Vite+   | 1.1.0                 |
| Bundled Vite / Vitest      | 8.3.3 / 5.0.3         |
| TypeScript                 | 7.0.2                 |
| Node types                 | 24.19.2               |
| Oxlint / Oxfmt             | 1.87.0 / 0.72.0       |
| Better Auth / auth CLI     | 1.7.7                 |
| Local Studio SQLite driver | better-sqlite3 13.0.3 |

## Migration sequence and findings

Imported the npm lockfile with `pnpm import`, upgraded standalone Vite to 8.3.4
while retaining Vitest 4.1.11, and validated type checking, all 163 tests and the
production build. Then ran the versioned migrator from the
[official workflow](https://viteplus.dev/guide/migrate):

```bash
pnpm dlx --package=vite-plus@1.1.0 vp migrate --no-interactive --no-agent --no-editor --no-hooks
```

The migrator reported three configuration updates and 28 rewritten import files.
Its review findings were:

```text
Skipped 4 rules:
  no-dupe-args: Superseded by strict mode.
  no-octal: Superseded by strict mode.
  react-hooks/config: Oxlint uses fixed, valid React Compiler options; add this rule when compiler options become configurable.
  react-hooks/gating: Oxlint does not expose React Compiler gating options; add this rule when compiler options become configurable.
.prettierignore found — Oxfmt supports .prettierignore, but using the `ignorePatterns` option is recommended.
```

Strict ESM and TypeScript retain the first two protections. Native Oxlint rules
cover the recommended Hooks checks used by the application. The `config` and
`gating` rules validate [React Compiler configuration](https://react.dev/reference/eslint-plugin-react-hooks/lints/config)
and [gating options](https://react.dev/reference/eslint-plugin-react-hooks/lints/gating); this project has no React
Compiler or gating configuration. Following comparison with a fresh Vite+
React starter, those two configuration rules and their JS plugin were removed.
The remaining Hooks rule severities and route Fast Refresh exception are
preserved. Formatting ignores moved into `vite.config.ts`, and new type-aware
warnings were resolved in application code.

The unified test configuration passed with the generated Vitest compatibility
setting, then passed again after removing `clearMocks: false` and adopting the
Vitest 5 default. Node and per-file jsdom environments remain; tests import
`vite-plus/test` and use the existing isolated Workers alias. No assertions or
skips were changed.

Application plugins load through dynamic `lazyPlugins` imports. The image
optimizer is restricted to the client environment and receives its output
directory, so public images are processed in TanStack Start's shared build.
The verified build saved 607.16 KiB, or 69% of assets where recompression reduced
their size. Larger recompressions retain the original files.

pnpm records build permissions for esbuild, workerd and better-sqlite3. The
SQLite driver is explicit because local Drizzle Studio needs its native binary.
The unused Prisma adapter's build remains disabled. Exact release-age exceptions
record the packages selected for this upgrade. Stable Wrangler's own Miniflare
version is retained, including its upstream beta suffix.

The global CLI was upgraded from 0.3.3 with `vp upgrade`; `vp toolchain --global`
confirms the same 1.1.0 toolchain as the project. Managed Node and pnpm remain at
the pinned versions above.

## Fresh starter comparison

Created an isolated React TypeScript application with the upgraded global CLI:

```bash
vp create vite --no-interactive --no-agent --no-editor --no-git --no-hooks --package-manager pnpm -- app --template react-ts
```

Its manifest has no ESLint or Prettier dependencies, and its lint block uses
native Oxlint React rules with the built-in Vite+ import plugin. Its catalog and
Vite core override match this project's setup. Reference files are saved under
`output/viteplus-reference/`. The project retains its verified TypeScript 7 and
stable dependency versions, which are newer than the template's declarations.

Removed `eslint-plugin-react-hooks`, its ESLint peer and their dependency tree.
The optional Rollup provider of `unplugin@3.4.0` is excluded with pnpm's
[peer-removal override](https://pnpm.io/settings/dependency-resolution#overriding-peer-dependencies)
because the application uses its Vite/Rolldown integration.
Rollup and its native packages are absent from the resulting lockfile.

## Remaining tooling references

Standalone ESLint, Prettier and Vitest configurations and their project command
workflows are removed. The environment example uses `vp dev`, and the route
generator emits an Oxlint header instead of an ESLint header.

- Prettier remains transitively through TanStack's router generator and the
  `auth` CLI. Both import its formatting API directly; removing it would break
  route-tree and auth-schema generation. Project formatting runs through Oxfmt.
- esbuild remains where Wrangler and Drizzle Kit require it. The application
  build uses Vite+ and Rolldown.
- Vitest packages, `VITEST` detection and `@vitest-environment` annotations belong
  to Vite+'s bundled runner. The `npm:` core alias is a package alias protocol.
- Historical design and QA notes retain the names of tools used for those checks.
  The saved migration logs and baseline files also preserve the original tooling.

## Verification

- Clean `pnpm install --frozen-lockfile` under the pinned Node and pnpm versions.
- `vp check`: formatting, type-aware linting and type checking pass without warnings.
- `tsc --noEmit` using TypeScript 7.0.2 passes.
- All 26 test files and 163 tests pass; watch mode reruns a changed test file.
- Static checks and tests do not initialize Workers application services.
- Production client and Worker builds pass with image optimization enabled.
- Development on port 3000 and production preview on port 4173 render and hydrate.
- EN, RU and KK switch correctly and survive reloads; SSR HTML uses each locale cookie.
- Signed-out dashboard and onboarding requests redirect to login; safe invite
  destinations survive the redirect. Unauthorized admin access returns 404.
- The auth session endpoint returns a successful anonymous response. Browser
  checks report no warnings or errors.
- Auth generation with explicit Drizzle/SQLite options produces the same schema
  declarations as the existing auth tables, ignoring formatting.
- Local Drizzle Studio starts and its SQLite driver executes an in-memory query.
- Formatter idempotence, peer resolution and `git diff --check` pass.

Workers compatibility is set to `2026-10-13`. During verification the local date
was October 14 in Asia/Almaty, but Cloudflare's UTC date was still October 13.
Miniflare rejected `2026-10-14` with `ERR_FUTURE_COMPATIBILITY_DATE`. October 13
allows both development and preview to start with the same deployed configuration.

Raw migration, installation, build and test logs, temporary generated schema and
the production preview screenshot are preserved under the ignored
`output/viteplus-migration/` directory. No production deployment or remote
database migration was performed.
