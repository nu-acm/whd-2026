# Working conventions

- Follow existing codebase conventions and reuse shared components and helpers.
- Keep changes focused. Avoid speculative abstractions, dependencies, and tests.
- Preserve unrelated working-tree changes.
- Do not create or edit ANY documentation unless the user explicitly asks.
- Use `vp` for development, checks, tests, and builds; `vp run <script>` for package scripts and `vp exec <binary>` for installed tools.
- For shadcn work, follow `.agents/skills/shadcn/SKILL.md`. Preserve Base UI, WHD variants, semantic tokens, accessibility, and RU/KK/EN support.
- Run `vp check` after changes. For behavior changes, run relevant tests, then `vp test` and `vp run test:e2e` (includes the production build).
- `main` is production: every push to it migrates the remote D1 and deploys. Never run `vp run deploy` or `vp run db:migrate:remote` by hand.
- Migrations reach production before the code that uses them. When a migration drops, renames, or rebuilds a table, point it out (see README, Deployment).
- Write tests for important behavior and regression risks. Use real local D1 and auth; mock external services at their boundaries.
- Keep disposable fixtures, screenshots, and reports under ignored `output/`.
- Use Conventional Commits: `type(scope): summary`, with an optional scope. Subject only; no body, footers, or co-author trailers.
- Name branches `<type>/<short-kebab-case>`, such as `feat/team-invites`, `fix/otp-delivery`, or `chore/dependencies`.
