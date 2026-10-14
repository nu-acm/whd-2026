# Working conventions

- Follow existing codebase conventions and reuse shared components and helpers.
- Keep changes focused. Avoid speculative abstractions, dependencies, and tests.
- Preserve unrelated working-tree changes.
- Do not create or edit ANY documentation unless the user explicitly asks.
- Use `vp` for development, checks, tests, and builds; `vp run <script>` for package scripts and `vp exec <binary>` for installed tools.
- For shadcn work, follow `.agents/skills/shadcn/SKILL.md`. Preserve Base UI, WHD variants, semantic tokens, accessibility, and RU/KK/EN support.
- Run `vp check` after changes. For behavior changes, run relevant tests, then `vp test` and `vp run test:e2e` (includes the production build).
- Write tests for important behavior and regression risks. Use real local D1 and auth; mock external services at their boundaries.
- Keep disposable fixtures, screenshots, and reports under ignored `output/`.
- Use Conventional Commits: `type(scope): summary`, with an optional scope. Subject only; no body, footers, or co-author trailers.
- Name branches `<type>/<short-kebab-case>`, such as `feat/team-invites`, `fix/otp-delivery`, or `chore/dependencies`.
