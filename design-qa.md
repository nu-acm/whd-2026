# Hero QA — 2026-10-12

## Source and scope

- Source visual truth: `/Users/nursultansarsenbay/Downloads/hero layout.jpg`, 5998 × 3583 px.
- Source assets: supplied `Clip path group-1.png` (1996 × 1029, transparent) and `mascot_hero.svg` (5221 × 6327 viewBox), copied unchanged into public/whd.
- User explicitly requests the composition with the existing site background and style. Black reference canvas and gray placeholder CTA are therefore not color targets.
- Implementation: http://localhost:3001/, guest, RU, registration open without configured deadline.
- Desktop viewport: 1440 × 1000 CSS px. Hero element screenshot: 1280 × 700 px at CSS screenshot scale (one output pixel per CSS pixel).
- Source normalized uniformly to 1280 × 765 px in `output/design/hero-reference-normalized.png`; implementation `output/playwright/hero-section-final.png`. No distortion or selective crop. Hero is intentionally more compact vertically to fit the existing header and facts section.

## Comparison evidence

Source normalization and final hero screenshot opened together in one image comparison input, alongside `output/playwright/hero-360-final.png`. Reviewed source asset preview and full-size desktop/mobile captures for the gadget region; saved focused implementation capture at `output/playwright/hero-gadget-final.png`. Small screen text is a live status/date or timer, replacing the mock's placeholder label.

## Required fidelity surfaces

- Typography: supplied script wordmark reproduced from the original asset, not substituted with a font. UI retains Montserrat/Lexend; countdown uses existing tabular monospace. Localized text fits the gadget.
- Spacing: dominant logo left, broad centered CTA below, upright mascot right. Desktop two-column balance matches the reference hierarchy; compact vertical padding and existing 64 px button height are intentional. At widths below 1024 px the composition stacks, maintaining CTA before the illustration.
- Colors: existing #0e0e13 background, pink CTA, and restrained star-glow retained. Supplied pink logo palette retained. No new outline buttons or decorative frames.
- Images: both supplied originals used without cropping/stretching. PNG transparency and SVG edges remain clean. No generated or approximated illustration.
- Copy: visual hero reduced to branding and primary action; existing event description remains screen-reader accessible. No invented deadline. Gadget fallback uses existing event date/location plus localized registration status. Existing closed and account-progress CTA behavior remains in Hero.

## Findings and comparison history

1. **P2, narrow mobile gadget:** first 360 px RU rendering wrapped the date and crowded the bottom line (`output/playwright/hero-360-before.png`). Reduced internal gaps and allowed the date to scale to 12 px minimum. Reopened final 360 px screenshot: date fits one line and all content sits inside the screen (`output/playwright/hero-360-final.png`). Resolved.
2. **Responsive prevention:** use a stacked hero below 1024 px so the illustrated screen does not become too narrow at tablet widths. Verified 768 and 1024 px.
3. No remaining actionable P0/P1/P2 visual findings. Different canvas color, rounded filled CTA, functional panel copy and reduced vertical whitespace are intentional adaptations to the user's request to keep the current site style.

## Functional checks

- RU/EN/KK at 360, 390, 768, 1024, 1440 px: no horizontal overflow, loaded hero images, visible primary CTA, fallback text fits panel.
- Registration CTA clicked: navigates to `/login`.
- Countdown component rendered in a disposable browser copy of the same gadget: four units appear in all languages and sizes, deadline expiry calls the handler and removes the countdown. Screenshots: `output/playwright/hero-countdown-360.png`, `output/playwright/hero-countdown-1440.png`. Synthetic future deadline exists only in browser QA, not saved in app configuration.
- TypeScript check, Hero ESLint and local-config Vite production build passed.
- Final browser console: existing two 404s for TanStack devtools fonts (BricolageGrotesque/Inter); no new application errors after clean navigation. An initial disposable fixture was mounted before hydration and discarded; clean mounted fixture passed.
- Residual scope: authenticated CTA states retain the prior implementation; no new signed-in session created for this visual change.

## Implementation checklist

- [x] Preserve supplied wordmark and mascot.
- [x] Match composition with existing site styling.
- [x] Fit gadget status and timer on mobile.
- [x] Verify languages, registration navigation and countdown expiry.
- [x] Recompare after mobile fix.

final result: passed

## User-directed neon revision

The user explicitly requested stronger neon light, animated neon eyes, a neon countdown display, and a Totally Spies inspired gadget button. This supersedes the static/no-glow constraints in the earlier comparison.

- Effective registration deadline confirmed by the user: October 20, 2026, 23:59:59 Astana (UTC+5). Server gating and the live countdown share the same default; an environment override still takes precedence.
- Existing supplied SVG paths were retained. Iris paths gained CSS glow/animation; the screen fill changed to dark violet with a pink glow. No replacement illustration or image generation.
- Original composition retained. Logo has a stronger pink halo, and CTA has an angled, asymmetric silhouette, highlight, neon shadow and arrow disc.
- Final visual evidence: `output/playwright/neon-hero-desktop.png` (1440 × 1000) and `output/playwright/neon-hero-mobile.png` (360 × 844), both CSS screenshot scale. Opened and reviewed for font, layout, palette, asset fidelity and content. Countdown digits and labels fit the existing screen, and the CTA remains above the fold.
- RU/EN/KK at 360, 768 and 1440 px: no horizontal overflow; four countdown units visible; primary CTA visible.
- Countdown seconds change over time. Actual SVG eye animation was inspected at two timeline positions: pink and pale neon; reduced-motion returns animation-name none. CTA navigation to /login passed.
- TypeScript, changed-file ESLint and four meaningful registration deadline tests passed (default timezone, closing boundary, explicit override, invalid override fallback).
- No remaining P0/P1/P2 findings from the neon revision.

final result: passed

## Full-screen sizing revision

User requested full viewport width/height and larger mascot/countdown. Removed the hero's shared 1280 px container limit, introduced viewport-aware min-height and proportional mascot sizing, increased countdown type by 25%. Existing neon styling and original asset proportions remain intact.

Evidence: `output/playwright/fullscreen-hero-desktop.png` (1440 × 900), `fullscreen-hero-1920.png` (1920 × 1080), `fullscreen-hero-768.png` (768 × 1024), `fullscreen-hero-390.png` (390 × 844). Desktop, mobile and tablet images opened and visually reviewed. No asset clipping, text collisions or incorrect scaling. At 1440 px the mascot grows from about 435 to 567 px in width.

Viewport checks: 1920 × 1080, 1440 × 900, 1366 × 768, 1024 × 600, 768 × 1024, 390 × 844, 360 × 667. Hero reaches the viewport bottom, occupies available page width (excluding scrollbar), primary action stays visible, timer fits, and no horizontal overflow occurs. Initial 360 × 667 layout extended below the viewport; compact short-phone logo/spacing rules corrected this without cropping the mascot.

final result: passed

## Gallery reference pass — 2026-10-13

- Source visual truth: `/Users/nursultansarsenbay/Downloads/tengilemalamala-6f1a1e.mp4`, extracted frame at 2 s: `output/gallery-reference/frame.jpg` (1200×748 from a 1920×1196 video).
- Implementation: `output/gallery-reference/desktop.png` (1194×824 pixels; IAB viewport override 1200×828), `output/gallery-reference/mobile.png` (390×844 viewport).
- Full-view side-by-side comparison: `output/gallery-reference/comparison.png`. Source scaled to 600×374; implementation below the 80px header scaled with contain into 600×374. Captures represent the gallery at rest after closing its viewer. Screenshot backend excludes a few pixels of browser gutters; normalization preserves aspect ratios.
- Scope: recreate composition and motion with WHD assets and existing dark branding, not the reference's wildlife content or cream palette.

### Findings

No actionable P0/P1/P2 issues in the scoped gallery comparison. Six asymmetric image positions frame the central heading and action; the typography, larger photo scale and dark palette intentionally follow WHD. Three existing source photos are reused in six frames with detail crops. Unique additional photos were not available.

### Required fidelity surfaces

- Typography: existing WHD font and weight retained; central title/action readable, RU/KK/EN fit on a 320px screen.
- Spacing: asymmetric upper/lower clusters and clear central space follow the reference; checked 1200×828, 390×844 and 320×700. No photo/text overlap or horizontal overflow in the narrow-screen DOM check.
- Colors: existing WHD dark and pink tokens retained as required by session context.
- Image quality: original local WebP photographs, six lightweight DOM frames. Native viewer uses object-fit contain to show uncropped originals.
- Copy/content: existing title/kicker; translated photo controls added. No new event claims.
- Focused comparison: separate mobile capture inspected for title/photo spacing, readable button and image crops. Full-view comparison shows all six simple frames clearly; no additional detail crop required.

### Interaction verification

- Central action opens the viewer; next button changes 1/3 to 2/3.
- ArrowLeft wraps 1/3 to 3/3; Escape and close button dismiss the dialog and return focus.
- Pointer/scroll transforms observed in the browser. Reduced-motion static branch and touch exclusion reviewed in source.
- All source images decoded; responsive image frames remain inside viewport.
- TypeScript, changed-component ESLint, and local production build passed.
- Initial Vite hot-reload cache hook errors cleared by restarting the development server. Fresh reload logs contain no errors or warnings.

### Comparison history

First visual comparison passed; no visual revision was required. Development-server restart was operational troubleshooting, not a design iteration.

### Follow-up polish

Optional: replace the three repeated detail frames when more event photographs are available.

final result: passed

## Bento-02 — 2026-10-13

Partners and benefits combined into four tiles. Desktop and mobile visually checked; all sponsor images loaded. RU/KK/EN checked at mobile/tablet widths. Fixed the narrow tablet extras tile with a two-column layout; no remaining tile overflow in checked views. TypeScript, component ESLint and local production build passed. Screenshot: output/bento/desktop.png.

## FAQ-6 — 2026-10-13

Ten questions retained with existing localized answers. Desktop/mobile visually checked, Kazakh long answer checked at 320 px without overflow, English checked at 768 px. Enter opens answers, opening another closes the previous answer, plus/minus state updates correctly. Telegram link remains present. TypeScript, targeted ESLint and local production build passed. Screenshot: output/faq/desktop.png.

## Footer-2 — 2026-10-13

Two-panel footer checked visually at 1440, 768 and 320 px; Kazakh also checked for overflow at 390 px. Fixed long legal-link overflow with a stacked link-group layout at <=1100 px. Inspected all section, legal, social and login hrefs; existing session/registration conditions remain in Footer.tsx. TypeScript, targeted ESLint and local production build passed. Screenshot: output/footer/desktop.png.

## CTA-4 — 2026-10-13

Verified the new CTA on desktop 1440 px and phone 390 px; Kazakh text checked at 320 px without section overflow. Both hero and CTA timer values matched and ticked. Guest action href is /login; remaining funnel/closed conditions were reviewed in source. Original hero visually checked at 320 px after shared-mascot extraction. TypeScript, targeted ESLint and production build passed. Screenshot: output/cta/desktop.png.

## Whole landing spy styling — 2026-10-13

Reviewed facts/about, dates/schedule, bento, gallery, FAQ open state, CTA/footer on desktop and mobile. Narrow 320 px RU/KK checks found and resolved schedule panel overflow and a 5px decorative flower extension. Gallery inspected at 390 px; photos do not cover heading or action. Global style is scoped to landing components, preserving routes, original content, photos, partners and existing countdown behavior. Production build passed; no new interactive logic was introduced. Proof: output/spy-theme/desktop.png and output/spy-theme/footer.png.


## FAQ showcase and full page — 2026-10-13

Compared the supplied reference with the desktop implementation: retained illustrated left panel and five separated cards on the right, with intentional WHD palette, typography, mascot and two requested actions. Checked desktop 1440 px, mobile 390 px and narrow 320 px; no FAQ horizontal overflow at 320 px. Verified five preview questions, navigation to /faq, ten full-page questions, direct refresh, Enter accordion activation, RU/EN/KK switching and return to /#faq. Telegram href preserved. TypeScript, targeted ESLint, local production build and git diff --check passed. Build reports existing inputValidator deprecation warnings in unrelated routes. Screenshot: output/faq-showcase/desktop.png.

final result: passed


## Interaction motion — 2026-10-13

Defined the missing shared accordion animations (280 ms open / 220 ms close), crossfaded FAQ plus/minus states, added reversible mobile-menu grid transitions with inert closed content, and native dialog entry/exit transitions. Gallery content remains mounted for exit and photographs crossfade over 220 ms. Reduced-motion CSS and the existing useReducedMotion hook suppress movement. No new library.

Verified accordion computed open/close animation names and durations, mobile menu open/Escape/rapid toggle at 390 px, gallery next-photo controls and Escape dismissal. Native dialog stays displayed during exit, then becomes display:none; its image persists for the fade. The shared confirmation-dialog class uses the same native-dialog CSS; destructive confirmation was not submitted during visual QA. TypeScript, targeted ESLint, local production build and diff whitespace checks passed.

BeUniq raw audit: AI slop 100, copy slop 58, taste 18, design quality 76. The global style/copy audit is not passing; neon/gradient/eyebrow findings belong to the approved custom brand and unchanged content. TASTE-A11Y-001 flags in motion.css/accordion/Gallery are scanner false positives: CSS has an explicit reduced-motion block, accordion chevrons have motion-reduce utilities, and Gallery uses useReducedMotion. Existing unrelated findings remain outside this interaction-only change. Functional motion verification: passed.


## Login and dashboard — 2026-10-13

Reviewed live /login at desktop 1440, tablet 768 and mobile 390/320 px, including Russian/Kazakh text and invalid-email feedback. Reviewed the actual dashboard components in an isolated local Vite fixture harness: no team, team ready, registration locked, CV present/absent, invite layout and OTP entry. English tablet and Kazakh narrow-phone text checked. Fixed narrow member actions so full names have a readable column. Closed state retains informational content and removes team mutation controls. Fixture create/validation interactions were exercised; no actual account, Google OAuth, email delivery, team mutations or CV upload were performed. The fixture code is ignored and does not add routes/auth bypasses to the production app.

Six existing email/OTP tests, TypeScript, targeted ESLint, production build and git diff --check passed. Existing TanStack deprecation and bundle-size warnings remain. Raw BeUniq full-workspace scores: AI slop 100, copy 79, taste 26, design quality 76; scanner includes local fixture sources. It is not a passing global audit. Brand-specific bold/italic headings, pink gradients, glow and asymmetric cards are intentional under the custom profile. Missing-alt reports for multiline decorative images are false positives (alt is provided); reduced-motion rules are present. Typography, responsive layout and real component behavior were visually reviewed separately.

Screenshots: output/account-redesign/login.png and dashboard.png. Implementation/visual QA: passed.

Account form animation is keyed by the stable email/OTP step, not translated titles; switching language preserves the mounted form and entered values. Browser DOM confirmed the filled input remained populated after language switch.

## CV file drop — 2026-10-13

- Installed Watermelon `file-upload-2` via shadcn and adapted it to the account design; preserved custom Button/Card/utils. Removed the unused generated Badge dependency file.
- Single-PDF drag/drop and native picker, 5 MB limit, inline errors, real pending filename/status, duplicate-request guard, replacement and confirmed deletion. Locked registration hides upload controls. RU/EN/KK copy; reduced-motion support.
- Four component tests cover dropped files, concurrent drops, invalid format/size/multiple files, same-file retry after network failure, deletion confirmation and closed registration. All passed; TypeScript and production build passed. External Drive upload was mocked in tests.
- Visual check: desktop preview, Russian 390 px and Kazakh 320 px. No horizontal overflow in either mobile view. Proof: `output/account-redesign/file-drop-mobile.png` (isolated UI fixture, no live account mutation).

## Dashboard support navigation — 2026-10-13

- Removed the separate help card; moved FAQ and Telegram contact links into the dashboard header via the explicit `showHelp` option. Login and other auth pages keep their existing header.
- Desktop inline navigation; mobile second row with 44 px link targets. Checked at 1440 and 320 px in the local dashboard fixture; no horizontal overflow. TypeScript, targeted ESLint and diff checks passed.
- Screenshot: `output/account-redesign/dashboard-header.png`.

## Login OTP — 2026-10-13

- Installed Watermelon `input-otp-7` with the requested pnpm/shadcn command, corrected its registry import paths and wired it to the existing OtpForm state and shared Field label/error.
- Two groups of three digits, WHD filled surfaces, thin pink active ring, error borders, reduced-motion caret. Paste strips spaces/separators; native one-time-code autocomplete and numeric keyboard retained. No auto-submit or authentication changes.
- Four OTP tests passed: digit entry, formatted paste/correction/pending state, failed verification, resend cooldown/retry. TypeScript, targeted ESLint and production build passed. Browser review of the local fixture at desktop and narrow viewport; no real code requested or submitted. Proof: `output/account-redesign/otp-input.png`.
