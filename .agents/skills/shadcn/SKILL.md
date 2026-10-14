---
name: shadcn
description: Maintain this WHD project's shadcn Base UI components and styling while preserving its base-nova theme, variants, and behavior.
---

# WHD shadcn maintenance

Read the existing component before editing. Project aliases and
registry settings live in `components.json`. Use Base UI, `base-nova`, semantic
WHD tokens, and existing Lexend/Montserrat fonts with Kazakh coverage.

Reuse installed components first. Put appearance in component-owned CSS or named
variants; call-site classes arrange layout. Keep all six shadcn lint rules as errors.
Runtime motion values use CSS custom properties consumed by stylesheets.

Use Base UI's `render` composition rather than Radix `asChild`. Preserve ref and
prop forwarding, accessible names, and linked labels/hints/errors. Use Field
composition for forms and the existing FormField adapter for translated fields.
Card header, content, and footer are siblings. Button icons use `data-icon` and
component-owned sizing. Preserve WHD variants and disabled/loading behavior.

For unfamiliar component APIs, run `pnpm dlx shadcn@4.21.4 docs <component>` and
read the returned official documentation before changing its composition.
For registry updates, inspect both:

```sh
pnpm dlx shadcn@4.21.4 add <component> --dry-run
pnpm dlx shadcn@4.21.4 add <component> --diff
```

Merge only the needed changes while retaining project variants, spacing, fonts,
and behavior. Do not run `init` or `apply` over the app to reset its theme.
Review the release and diffs before using a different CLI version.

Confirmation uses Alert Dialog: Cancel receives initial focus; backdrop clicks do
nothing; Cancel/Escape dismiss; focus returns to the trigger. Gallery uses Dialog
with backdrop dismissal, arrow-key navigation, and focus restoration. Keep inline
two-click confirmation controls inline. Keep interactive targets at least 44px and
honour reduced motion.

Run the verification commands in `README.md`. Check affected pages in RU/KK/EN
at mobile and desktop sizes; put disposable artifacts under ignored `output/`.
