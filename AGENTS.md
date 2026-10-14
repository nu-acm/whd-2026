# Writing

Always read `/Users/yerassyl/.codex/skills/prevent-slop/SKILL.md` at the start of a conversation and apply it to responses, progress updates, documentation, and user-facing copy. Preserve code and literal quotations.

# UI changes

Use `.agents/skills/shadcn/SKILL.md` for shadcn components. Read `DESIGN.md` before changing appearance. WHD uses Base UI with the `base-nova` registry style, custom dark branding, Lexend/Montserrat, and Kazakh glyph coverage. Preserve page layouts, translations, assets, form behavior, and existing uncommitted work.

Use the existing shared components first. Component appearance belongs in named variants or component-owned CSS; call-site `className` is for layout. Use semantic theme tokens. Keep interactive touch targets at least 44px and support `prefers-reduced-motion`.

All six `@shadcn/lint` rules are errors in `vite.config.ts`, including shared UI internals. Do not disable rules, add broad allowances, or add animation exceptions. Pass runtime motion values through CSS custom properties and consume them in stylesheets. Lint checks authored JSX and known class sites, not every declaration in plain CSS or third-party runtime internals.

Use `pnpm dlx shadcn@4.21.4 add <component> --dry-run` and `--diff` before merging registry updates. Preserve WHD variants, fonts, spacing, and behavior. Do not run `init` or `apply` over the app to reset its theme. When checking a different CLI version, review its release and diffs first.

Confirmation dialogs use Base UI Alert Dialog: focus Cancel first, ignore backdrop clicks, allow Cancel/Escape, and restore focus. Gallery uses Base UI Dialog with backdrop dismissal, keyboard image navigation, and focus restoration. Inline two-click confirmation buttons remain inline.

After changes, run `pnpm exec vp check`. For behavior changes, run the relevant tests, then the full `pnpm exec vp test` suite and `pnpm exec vp build`. Verify affected pages in RU/KK/EN at mobile and desktop sizes. Keep disposable fixtures and screenshots under ignored `output/`; do not add permanent QA routes or bypass authentication in production.
