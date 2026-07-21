# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LineaTrade is a Spanish-language, mobile-first trading-journal product, deployed to
production. The pitch: it records a trader's operations (technique, context, psychology)
and surfaces behavioral patterns — explicitly **not** a signals/prediction tool. All
copy is in Spanish (LatAm audience); keep new user-facing text in Spanish and match the
sober, evidence-first tone of the existing content.

Beyond the core journal loop (Nuevo Trade → Dashboard → Historial → Detalle de Trade),
the app has grown to include a Spanish-language news feed (`/noticias`), a public
trader-profile quiz that generates a personalized plan (`/ia-trader`), a personal
objectives/rules/strategies tracker (`/sistema`), a profile page with avatar upload
(`/perfil`), options-contract trading support, and order-ticket detail — none of this
was in the original phase roadmap (see "Beyond Fase 4" under "Roadmap phases" below).
**If you're orienting yourself in this repo, don't trust this file's phase/table counts
at face value without checking "Roadmap phases" and "Backend" below for the latest
correction** — this doc has previously gone stale relative to the code once already
(caught and resynced 2026-07-19), and the fix was to add explicit counts/dates rather
than assume prose age implies staleness.

Auth and persistence are **real, not mocked**. `Signup`/`Login`/`Recuperar`/
`ActualizarPassword` call actual `supabase.auth.*` methods; `Onboarding`, `NuevoTrade`,
`Dashboard`, `TradeDetail`, and `Historial` all read/write the real `profiles`/`trades`/
`trade_threads` tables (and `v_user_trade_stats`, a view). All private routes are gated
by `<ProtectedRoute>` (redirects to `/login` if there's no session). This was verified
end-to-end against the local stack, not just compiled: real signup → email confirmation
via Mailpit → login → onboarding persisted to `profiles` → a trade persisted to
`trades` (with its instrument correctly resolved against the seeded catalog) → visible
on Dashboard and Historial → opened in TradeDetail → added a thread comment → **closed
the trade** (exit price only — `pnl_amount`/`pnl_r` came back from a database trigger,
matching a hand-computed example exactly) → Dashboard showed real, non-null win
rate/profit factor/avg R for the first time → signed out → confirmed `/dashboard`
redirects to `/login` with no session. See "Backend" below — including **three real
RLS/security bugs and one real display bug** found and fixed during that work, worth
reading before touching RLS, adding a view, or adding a trigger.

**Fase 0 through Fase 4 are all closed** (every planned screen, the AI engine, and the
SuperAdmin panel exist and are wired to real data) and the app is deployed to production
at `https://lineartrade.vercel.app`, backed by a separate Supabase Cloud project — see
"Production" and "Roadmap phases" below. It's also an installable PWA — see "PWA" below.
The full spec lives in `docs/` and is the source of truth for anything beyond what's
currently on screen — read it before building new features. See "Planned product
architecture" below.

## Commands

```bash
npm run dev       # Vite dev server with HMR (port 5180, see vite.config.ts)
npm run build     # tsc -b (typecheck) then vite build
npm run lint      # oxlint
npm run preview   # serve the production build locally

npm run db:start  # start local Supabase stack (Docker) — applies migrations + seed
npm run db:stop   # stop it
npm run db:reset  # drop and re-apply all migrations + seed.sql from scratch
npm run db:status # print local URLs/keys (also written to .env.local manually)
npm run db:types  # regenerate src/types/database.ts from the local schema
```

There is no test setup in this repo — no test runner, no test files. `npm run build`
is the closest thing to a gate: it typechecks the whole project via `tsc -b` before
bundling, so run it to verify changes compile.

## Stack

- **React 19** (function components, `ref` as a plain prop — no `forwardRef` needed)
- **react-router-dom v7** — routing declared in `src/App.tsx` via `<BrowserRouter>`
- **Vite 8** as bundler/dev server
- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin — there is **no `tailwind.config.js`**
- **shadcn/ui foundation** (added 2026-07-20) — `components/ui/` holds Radix-primitive
  components (`button.tsx`, `accordion.tsx` so far) built with `class-variance-authority`
  + the standard `cn()` helper (`src/lib/utils.ts`, `clsx` + `tailwind-merge`). Path alias
  `@/*` → `./src/*` in `tsconfig.json`/`tsconfig.app.json`/`vite.config.ts`. **Not** a
  second design system: shadcn's standard semantic color names
  (`background`/`primary`/`destructive`/etc.) are aliased in `src/index.css`'s `@theme`
  block to the existing brand tokens, so a freshly copied shadcn component is on-brand
  with zero color edits — see `docs/lineatrade-design-system.md` §3.5 and §10 before
  adding another `components/ui/` file or touching this token bridge. This is Vite +
  react-router, **not Next.js** — copied shadcn snippets that assume `next/link` or the
  Next.js App Router need adapting, not pasting verbatim.
- **oxlint** (not ESLint) for linting; TypeScript strict mode via `tsconfig.app.json`
- **Supabase** (local, via Docker + the Supabase CLI) — Postgres, Auth, Storage, Studio.
  `@supabase/supabase-js` is installed; `src/lib/supabase.ts` is the typed client. See
  "Backend" below. The same schema also runs on a **Supabase Cloud** project that backs
  the live Vercel deployment — see "Production" below.
- **vite-plugin-pwa** — the app is an installable PWA (manifest + service worker). See
  "PWA" below.

## Architecture / conventions

Small SPA. `main.tsx` mounts `<App/>`, which is only a router:

- `/` → `pages/Landing.tsx` — includes a Spanish FAQ section (5 questions, real journal
  content, not e-commerce placeholder copy) built on the first `components/ui/`
  primitives, `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` (see
  "shadcn/ui foundation" under "Stack" above for why a copied Radix component needs no
  color edits to be on-brand). Also has an app-download section (`#descargar`, three
  entry points on the page: a hero link, the dedicated section, and a link in the
  closing CTA) with two real CTAs — an "Instalar app" button wired to `hooks/
  useInstallPrompt.ts` (listens for the `beforeinstallprompt`/`appinstalled` browser
  events; where the browser doesn't support it — Safari/iOS, Firefox — clicking falls
  back to a toast with manual instructions instead of doing nothing), and a "Descargar
  APK (Android)" link pointing at `APK_DOWNLOAD_URL` (`/downloads/lineatrade.apk`).
  **The real signed APK is committed at `public/downloads/lineatrade.apk`** (added
  2026-07-20, ~950KB, generated via PWABuilder against `com.lineartrade.app` — the same
  package/signing identity already registered in `public/.well-known/assetlinks.json`,
  see "PWA-to-APK" below for provenance). That extension is outside `vite-plugin-pwa`'s
  `globPatterns` (`**/*.{js,css,html,svg,png,ico}`, see "PWA (installable)" below), so
  it doesn't bloat the
  service-worker precache the way a stray asset elsewhere in `public/` would.
- `/registro` → `pages/Signup.tsx` (route path is Spanish)
- `/login` → `pages/Login.tsx`
- `/recuperar` → `pages/Recuperar.tsx` — calls `resetPasswordForEmail`; always shows the
  same neutral "revisa tu correo" message regardless of whether the account exists
  (Supabase itself never reveals this — don't "fix" that into a leakier message).
- `/actualizar-password` → `pages/ActualizarPassword.tsx` — lands here from the reset
  email's link. Supabase auto-detects the recovery token in the URL and opens a
  temporary session (`detectSessionInUrl`, on by default); the page just calls
  `supabase.auth.updateUser({ password })` against that session.
- `/privacidad` → `pages/Privacidad.tsx` — static privacy-policy page, not gated by
  `<ProtectedRoute>` (a legal page needs to be readable pre-signup).
- `/ia-trader` → `pages/IaTrader.tsx` — **deliberately not wrapped in `<ProtectedRoute>`**
  (`App.tsx`), unlike almost every other feature route. This is intentional, not an
  oversight: it's a public "convierte la IA en tu trader" quiz that computes a
  personalized `TraderPlan` client-side (`lib/traderPlanEngine.ts`, a deterministic
  scoring engine, explicitly "sin LLM" — no AI call involved despite the name) so an
  anonymous visitor can see value before registering. For an anonymous user, answers are
  stashed in `sessionStorage` (`lib/traderQuizStorage.ts`) and the plan renders
  "blurred" past the first section (`PlanReport`'s `blurred` prop) with a CTA to
  `/registro`; `Login.tsx` redirects back to `/ia-trader` after login so the pending
  answers get consumed and persisted to the `trader_plans` table (one insert per retake,
  no update — most recent row wins). Linked from `Landing.tsx` and `Dashboard.tsx`.
  Logged-in users can also download a `.zip` (`lib/traderPackage.ts`, via `jszip`) with
  the plan as Markdown, a prompt file meant to be pasted into an external AI chat, and —
  for crypto instruments only — a Binance price-history CSV. Don't confuse this with
  `lib/tradeExport.ts` (`Historial.tsx`'s CSV export of the user's own `trades` rows) —
  unrelated feature, same "let the user take their data out" spirit, different data.
- `/onboarding` → `pages/Onboarding.tsx` (**protected**) — post-signup profile quiz.
  Shown after login when `profiles.onboarding_done = false` (see `Login.tsx`'s
  post-signin redirect). On finish, persists answers to `profiles` and sets
  `onboarding_done = true`.
- `/nuevo-trade` → `pages/NuevoTrade.tsx` (**protected**) — broker picker → technical
  entry → contexto → psicología → aprendizaje. **The technical-entry step now requires a
  photo of the trade ticket** (`TechnicalEntryPanel.tsx`'s `handlePhotoSelected`): commit
  `7f89396` removed the old three-way `manual`/`file`/`photo` tab selector entirely,
  including the "Subir archivo" CSV-import tab. `lib/tradeImport.ts` (`parseTradesCsv`),
  the orphaned parser left behind by that removal, was **deleted outright on 2026-07-20**
  by explicit decision of the repo owner — CSV import is not "blocked" or "pending a
  decision" anymore, it doesn't exist in any form. If it's wanted again, it needs to be
  rebuilt, not resurrected. The photo is
  base64-encoded client-side and sent directly to the `extract-trade-image` Edge Function
  — it never touches Storage (see "Photo-based trade extraction" below). A failed
  extraction still unblocks the step so the user can fill the form by hand — it's the
  *photo* that's mandatory, not a successful AI read of it. The form also supports
  options contracts (`option_type`/`strike_price`/`expiration_date`, only written when
  `market === 'options'` — see "Options trading & order tickets" below) alongside spot/
  CFD. On finish, resolves/creates the `instruments` row (`lib/instruments.ts`), inserts
  into `trades`, optionally inserts an `'open'`-leg `trade_orders` row via the same
  `OrderTicketFields.tsx` used in `TradeDetail.tsx`, then routes to `/dashboard`.
- `/dashboard` → `pages/Dashboard.tsx` (**protected**) — metric cards from
  `v_user_trade_stats` (win rate/profit factor/avg R show `—`, not a fabricated number,
  when there are no closed trades yet — there's currently no "close a trade" flow, so
  this is the normal state) + last 5 trades + CTA to `/nuevo-trade`. This is where
  `Login.tsx` sends a returning user (`onboarding_done = true`).
- `/historial` → `pages/Historial.tsx` (**protected**) — full trade list, client-side
  filtered by symbol text and status (open/closed/all).
- `/trades/:id` → `pages/TradeDetail.tsx` (**protected**) — full view of one trade
  (RLS + a `.maybeSingle()` miss both render the same "not found" state, so this
  doesn't leak whether a given id belongs to someone else) plus `trade_threads`
  (hilo de seguimiento — list + insert a comment) **and** a `trade_images` gallery +
  upload control, deliberately living in the same section as the thread (see "Images"
  below). If `status === 'open'`, shows a "Cerrar trade" form (exit price only — see
  "Closing a trade" below). Also queries `trade_history` for `field_name = 'stop_loss'`
  changes and, if `moved_stop_loss` was self-reported false while the count is > 0,
  surfaces that mismatch inline — the cheapest possible demonstration of the product's
  core differentiator without needing the AI engine. Closing a trade can also capture a
  `'close'`-leg `trade_orders` row via `OrderTicketFields.tsx` (same optional, collapsed-
  by-default component used for the `'open'` leg in `NuevoTrade.tsx`) — see "Options
  trading & order tickets" below.
- `/configuracion/ia` → `pages/ConfiguracionIA.tsx` (**protected**) — BYOK management.
  See "Roadmap phases" → Fase 3 below for the RPCs/Vault details.
- `/sistema` → `pages/Sistema.tsx` (**protected**) — see "Sistema (objectives/rules/
  strategies)" below.
- `/perfil` → `pages/Perfil.tsx` (**protected**) — see "Perfil & avatar upload" below.
- `/noticias` → `pages/Noticias.tsx` (**protected**) — see "Noticias (news feed)" below.
- `/admin` → `pages/AdminPanel.tsx` (**protected**, and gated a second time by
  `<SuperAdminRoute>`/`is_superadmin()`) — see "Roadmap phases" → Fase 4 below.

All private routes are wrapped in `<ProtectedRoute>` (`components/ProtectedRoute.tsx`),
which reads session state from `<AuthProvider>` (`lib/auth.tsx`, wraps `<App/>` in
`main.tsx`) and redirects to `/login` if there's no user. `useAuth()` is how any page
reads the current user/session. `Dashboard`/`Historial`/`TradeDetail` render
`<AppHeader/>` (nav + sign-out); `Onboarding`/`NuevoTrade` render `<WizardLayout/>`
instead (progress bar + Atrás/Continuar, no nav — intentionally focus-mode). Signing out
needs no explicit `navigate()` call: `supabase.auth.signOut()` flips `AuthProvider`'s
user to `null`, and `<ProtectedRoute>` reacts to that itself — an earlier version of
`AppHeader` called `navigate('/')` after sign-out and it lost a race against
`ProtectedRoute`'s own redirect, landing on `/login` instead. Don't re-add that call.

Structure: `pages/` are route-level default exports; `components/` are named exports
shared across pages (`Nav`, `AppHeader`, `TraceLine`, `WizardLayout`, `ProtectedRoute`,
`SuperAdminRoute`, `AppFloatingNav`, `Avatar`, `Switch`, `PwaUpdatePrompt`,
`SourceAvatar`, `SettingsRow`). `components/ui/` holds shadcn/Radix primitives plus
`floating-navbar.tsx` (the Aceternity-style pill the app's primary nav is built on —
see the navigation note below).
`components/trade/` holds pieces specific to the trade-entry flow (`BrokerPicker`,
`TechnicalEntryPanel`, `PsychologySection`, `OrderTicketFields` — see "Options trading &
order tickets" below) plus `TradeListRow` (added commit `7030d01`), extracted from
near-duplicate row markup that used to live separately in `Dashboard.tsx` and
`Historial.tsx` — a 3px left rail colored `gain`/`loss` by `side`, the symbol promoted to
`font-display` for hierarchy over the metadata line, and a staggered reveal-up entrance
capped at the first 12 rows so long lists (Historial) don't turn the animation into
noise. `components/sistema/` holds `ObjectivesSection`/`RulesSection`/
`StrategiesSection` (see "Sistema" below); `components/traderQuiz/` holds `QuizStep`/
`PlanReport` (see the `/ia-trader` route entry above). `BrokerPicker` filters its 37-broker list by
both free-text search and a `category` field (`acciones`/`forex`/`cripto`/`futuros`/
`otro`, added to `data/brokers.ts`'s `Broker` type) — if you add a broker, classify it by
its dominant identity, not every asset class it technically supports (e.g. Interactive
Brokers is filed under `acciones` even though it also does futures/forex). `data/` holds
static content arrays consumed by pages (`onboarding.ts`, `brokers.ts`). `lib/` holds
backend-facing code:
`supabase.ts` (client), `auth.tsx` (provider/hook), `errors.ts` (`getErrorMessage`,
handles `AuthApiError` specially — Supabase's `PostgrestError` is a plain object, **not**
`instanceof Error`, so don't assume `error instanceof Error` catches it), `instruments.ts`
(catalog lookup-or-create).

`AppHeader` is deliberately **not** a copy-paste of the public `<Nav/>` at mobile widths
— an early version was (2 links → 4 links + wordmark) and overflowed at 375px, clipping
the "Salir" button off-screen. Its fix: hide the wordmark below `sm:`, tighter gaps on
mobile, `whitespace-nowrap` on the CTA. If you add a 5th nav item, re-check 375px before
calling it done — this product is mobile-first, and the desktop viewport won't show you
the failure.

**Navigation was redesigned twice**: commit `7f89396` first moved primary nav out of
`AppHeader` into `<BottomNav/>` (an Instagram-style island bar). It has since been
replaced by `<AppFloatingNav/>` (`components/AppFloatingNav.tsx`, built on
`components/ui/floating-navbar.tsx` — an Aceternity-style floating pill ported to
react-router + framer-motion, which is why `framer-motion` is a dependency). Current
behavior: a fixed pill centered at `top-1` (inside the `AppHeader` band — the original
`top-10` floated over page titles), which **hides when scrolling down and reappears
when scrolling up** (`useScroll` from framer-motion, with a guard for pages too short
to scroll). It links to `/dashboard`, `/historial`, `/nuevo-trade`, `/noticias`,
`/perfil` (still no direct `/sistema` or `/ia-trader` links — reachable via `Perfil`),
and shows **icons only on every breakpoint** (lucide-react icons; words were removed
by user request — each link keeps its name in `aria-label`/`title`). The right-side
button is "Salir" (`supabase.auth.signOut()` — no `navigate()` call, same race noted
above). `AppHeader` remains wordmark-only and renders together with `AppFloatingNav`
on the same pages. `components/BottomNav.tsx` was deleted; the hand-drawn
`components/icons/NavIcons.tsx` died with it (kept only for other uses like
`CameraIcon`).

Same 375px-first lesson caught a second time in `TechnicalEntryPanel`: the
Cantidad/Precio/Comisiones row was a bare `grid-cols-3`, cramming three numeric inputs
into ~80px each on a narrow phone — fixed to `grid-cols-2 md:grid-cols-3`, matching the
responsive-grid pattern already used by `MetricCard` rows on Dashboard/AdminPanel. When
adding a new fixed-column grid, default to fewer columns on mobile and widen at `md:`
rather than assuming a 3-up row fits — it usually doesn't below ~400px.

### Design system — the important part

The visual identity lives entirely in **`src/index.css`** using Tailwind v4's `@theme`
block. Colors and fonts are defined there as CSS custom properties and consumed as
Tailwind utility classes (e.g. `--color-signal` → `bg-signal`/`text-signal`,
`--font-display` → `font-display`). **Do not hardcode hex colors or font stacks in
components** — add or reuse a token in the `@theme` block instead. The one deliberate
exception is `TraceLine.tsx`, which hardcodes hex in raw SVG attributes (`stroke="#E3A94A"`)
because those aren't Tailwind-utility contexts; keep those values in sync with the tokens.

Named tokens in use: `ink`/`panel`/`panel-2` (dark backgrounds), `hairline` (borders),
`signal`/`signal-dim` (amber accent + hover), `steel`, `text-primary`/`muted`/`faint`, and
— added 2026-07-20 — `gain`/`gain-dim`/`loss`/`loss-dim` (the P&L and long/short-direction
semantic pair, replicating the Binance-style green/red trading convention; deliberately
**not** the same as `signal`, which stays reserved for brand/CTA/focus — see
`docs/lineatrade-design-system.md` §3.2 for why the two were conflated before this fix and
why that was wrong). `text-loss`/`border-loss` also cover form/system error state, replacing
what used to be hardcoded `text-red-400` across ~20 files.
Fonts: `font-display` (Space Grotesk), `font-body` (Inter), `font-mono` (JetBrains Mono),
all loaded from Google Fonts in `index.html`.

The aesthetic is intentional and opinionated (dark, editorial, monospace labels, precise
type sizes via arbitrary values like `text-[44px]`). When adding UI, match this — reuse
the existing spacing rhythm, the `max-w-5xl mx-auto px-6` container, hairline dividers,
and the `rounded-sm` + `transition-colors` interaction pattern rather than introducing
new visual conventions.

### Motion

`TraceLine.tsx` animates an SVG path draw via the `trace-draw` keyframe defined in
`index.css`. That file also contains a global `prefers-reduced-motion` guard — preserve
it and keep new animation on compositor-friendly properties. `TechnicalEntryPanel`'s
reveal uses a second hand-rolled keyframe (`reveal`) for the same reason — this project
does **not** use `tailwindcss-animate` or any animation plugin; new motion should follow
this same pattern (keyframe in `index.css`, applied via inline `style` or a plain class).

### PWA (installable)

`vite-plugin-pwa` is configured in `vite.config.ts` (`registerType: 'prompt'` — **not**
`'autoUpdate'`, deliberately: with financial data on screen the app shouldn't reload
itself out from under the user, so `PwaUpdatePrompt.tsx`'s `useRegisterSW` hook surfaces
a toast and lets the user pick when to reload instead; `injectRegister: false` because
that same hook does the SW registration by hand, not the plugin's auto-injected script;
`workbox.globPatterns` scoped to `**/*.{js,css,html,svg,png,ico}`). It only precaches the
app shell — **it deliberately never caches Supabase requests** (auth, trades, storage);
those are financial/session data that must always be fetched live, never served stale
from a service worker. `index.html` carries the iOS install meta tags
(`apple-mobile-web-app-*`, `apple-touch-icon`) since `vite-plugin-pwa` only auto-injects
the manifest link and the SW-register script, not iOS-specific tags.

**PWA-to-APK**: there is no native Android build pipeline in this repo — the APK at
`public/downloads/lineatrade.apk` is a TWA (Trusted Web Activity) generated externally
via PWABuilder.com against the live manifest, then committed by hand; this repo does
not automate that build. **This is the second generation of that package** — a first
attempt used the wrong Package ID (`app.vercel.lineartrade.twa`) and was discarded
before ever reaching Play Console (see commit `faec8e3`); the current one uses
`com.lineartrade.app` and `start_url=/dashboard`, matching
`public/.well-known/assetlinks.json`. PWABuilder also produced `LineaTrade.aab`
(Android App Bundle, required if this is ever submitted to Google Play — not needed for
the direct-download CTA) and `signing.keystore` + its password
(`signing-key-info.txt`) — **both kept outside this repo** (`.gitignore` blocks
`*.keystore`/`*.jks` as a backstop). Losing the keystore means losing the ability to
publish a future update under the same app identity; if it's ever regenerated, the new
fingerprint must be re-synced into `assetlinks.json` and redeployed, or the installed
app opens inside a Chrome Custom Tab (URL bar visible) instead of true full-screen.

The manifest icons (`public/pwa-192.png`, `public/pwa-512.png`, `public/apple-touch-icon.png`)
are rendered from `src/assets/pwa-icon-source.svg` — the app's actual amber trend-line
mark (the same path used inline in `AppHeader`/`Nav`, `stroke="#E3A94A"`) on the `--color-ink`
background, **not** `public/favicon.svg` (that file is an unrelated purple mark, unused
outside the browser tab favicon — don't mistake it for the brand's icon source).

Only put files under `public/` if they need to ship to every visitor: `vite-plugin-pwa`'s
`globPatterns` will precache anything under `public/` that matches the glob, so a large
unused asset folder there silently bloats the install payload (this happened once with
`svg-trading/`'s 50 source icons — see "Icons" below — moving them to `src/assets/`
dropped the precache list from 62 entries back to 12).

### Icons

`src/components/icons/TradeIcons.tsx` holds a handful of hand-picked, hand-extracted
icons (`BuyIcon`, `SellIcon`, `PercentageIcon`, `GrowthGraphIcon`, `RatioIcon`,
`TradeCountIcon`) cut from the 50-icon pack in `src/assets/svg-trading/` (kept there only
as a source reference, deliberately outside `public/` — see "PWA" above for why). Each
renders `fill="currentColor"` instead of the pack's original hardcoded black, so it
inherits color from a Tailwind text-color class instead of needing a new token. In use:
`BuyIcon`/`SellIcon` next to the long/short segment buttons in `TechnicalEntryPanel`, and
one icon per `MetricCard` on the Dashboard. Only 6 of the 50 icons were judged a strong,
literal fit for this product (trading-specific: buy/sell hand cursors, a candlestick
monitor, etc.) — resist the temptation to sprinkle the rest in just because they're
there; the Landing page's "Cuatro principios" numbering (001-004) is a deliberate
editorial choice and wasn't touched.

## Backend (Supabase, local via Docker)

The database is real and the frontend is wired to it. Setup:

- **Migrations**: `supabase/migrations/*.sql`, **34 files** (resynced 2026-07-20; if
  you're reading this later, recount with `ls supabase/migrations/ | wc -l` before
  trusting this number). The first 26 are as previously documented: 10 one-per-schema-
  doc-section migrations (extensions + profiles, instruments, strategies/rules, trades,
  trade_history audit trigger, trade_images + storage bucket, trade_threads, objectives,
  AI tables, audit_log) faithful to `docs/trade-journal-os-schema.md`; 4 real fixes
  discovered while wiring auth (see "Three real RLS bugs" below) plus small schema
  extensions; 2 for the stats view and the close-trade PnL trigger; 8 for Fase 3 (AI
  stats views, atomic rate limiting, BYOK key vault, service-role AI access); 1 for Fase
  4 (SuperAdmin system metrics); 1 for the Lineatrader→LineaTrade rebrand. **The 8 after
  that are newer feature work, shipped after Fase 4 closed** (see "Beyond Fase 4" under
  "Roadmap phases" below for what they back):
  1. `20260716120000_options_trading_support.sql` — adds `option_type` enum
     (`'call'|'put'`) and `strike_price`/`expiration_date` columns to `trades`; also
     rewrites `trg_calculate_trade_pnl()` to apply a ×100 contract multiplier to
     `pnl_amount` when the resolved instrument's `market = 'options'` (options quote
     per-share; `pnl_r` is unaffected since the multiplier cancels out of the ratio).
  2. `20260716130000_trade_order_tickets.sql` — adds `trade_orders`, one row per
     **order leg** (`'open'`/`'close'`, unique per `(trade_id, leg)`) — a trade is one
     row, but a broker generates two distinct orders (entry and exit), so this is a
     genuinely separate concept from `trades` itself, not a duplicate.
  3. `20260719120000_avatars_storage.sql` — creates the `avatars` Storage bucket,
     **public** (unlike `trade-images`) — see "Perfil & avatar upload" below for why
     that's a deliberate, not accidental, difference.
  4. `20260719130000_news_articles.sql` — read-only catalog table for `/noticias`; RLS
     allows `select` only, no `insert`/`update`/`delete` policy for `authenticated`
     despite the broad `GRANT` (same read-only-catalog pattern as `ai_analysis`/
     `trade_history`).
  5. `20260719140000_grant_service_role_news_access.sql` — grants `service_role` access
     to `news_articles`. Same bug class as the original grants fix: `service_role`
     bypasses RLS but Postgres never auto-grants it table privileges, so the
     `fetch-news` function's service-role upserts would otherwise fail with "permission
     denied" before RLS is even evaluated.
  6. `20260719150000_trader_plans.sql` — one row per quiz completion (`answers`/`plan`
     jsonb), owner-only RLS, insert-only (no update — a retake is a new row, most
     recent wins by `created_at`).
  7. `20260719173629_refresh_postgrest_schema_cache.sql` — a trivial migration whose
     only purpose is forcing Supabase Cloud's PostgREST to reload its schema cache; see
     "PostgREST schema cache staleness" below.
  8. `20260720144409_news_articles_add_tecnologia_category.sql` — extends
     `news_articles`' category check constraint to allow `'tecnologia'`, backing the
     Xataka/Hipertextual feeds described under "Noticias (news feed)" below.

  The schema doc (`docs/trade-journal-os-schema.md`) is the source of truth for the
  original 26; it predates migrations 27-34 and hasn't been updated for them — treat the
  migrations themselves as the source of truth for anything the doc doesn't cover. If
  you need a schema change, add a **new** migration (never edit an already-applied one,
  per the doc's own §11).
- **Seed**: `supabase/seed.sql` — a starter `instruments` catalog (forex majors, top
  crypto, common US stocks/indices/futures). Not specified verbatim in the schema doc;
  it's a reasonable default set for local dev, extend it as needed.
- **Storage bucket**: `trade-images` (private). The bucket-creation `insert` in the
  `trade_images_storage` migration isn't in the schema doc's SQL block (that doc only
  describes the bucket in prose) — it's the minimal addition needed to make the doc's own
  storage policy actually functional.
- **Client**: `src/lib/supabase.ts` — typed via `src/types/database.ts`, which is
  **generated, never hand-edited** (`npm run db:types`). It reads `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` from `.env.local` (gitignored; `.env.example` is the template)
  and throws at import time if either is missing.
- **Auth config**: `[auth]` in `config.toml` — `site_url`/`additional_redirect_urls` point
  at `http://localhost:5180` (the Vite dev port, not the `config.toml` default of
  `127.0.0.1:3000`); `[auth.email].enable_confirmations = true` (flipped from the
  scaffold's `false` default) so local behavior actually matches the "revisa tu correo"
  copy already built into `Signup`/`Recuperar`. Confirmation/reset emails land in
  Mailpit/Inbucket at `http://127.0.0.1:55324` (API: `GET /api/v1/messages`, then
  `GET /api/v1/message/{id}` for the body) — there's no real mail server, so this is the
  only way to get the confirmation link locally.

### Three real RLS/security bugs found while wiring auth and Dashboard

Worth understanding before adding a policy to a new table, or a view over one:

1. **Infinite recursion** (`20260701223000_fix_profiles_rls_recursion.sql`). The schema
   doc's original `profiles_select_superadmin` policy lived *on* `profiles` and did
   `exists (select 1 from public.profiles ...)` inside its own `using` clause — a policy
   querying its own table. Postgres has to re-evaluate `profiles`' policies to resolve
   that subquery, which triggers the same policy again, forever:
   `infinite recursion detected in policy for relation "profiles"`. **A policy must never
   query its own table inline.** Fix: a `security definer stable` helper function
   (`public.is_superadmin(uid)`) that runs with the function owner's privileges, so its
   internal query bypasses RLS instead of re-triggering it. Applied to all 7 places the
   schema repeated the same `exists (select 1 from profiles where role = 'superadmin')`
   pattern, not just the broken one.
2. **Missing `GRANT`s** (`20260701223500_grant_authenticated_privileges.sql`). Even after
   fixing the recursion, every query failed with `permission denied for table X`. RLS only
   filters *rows* — Postgres still requires a table-level `GRANT` before it evaluates any
   policy at all. Supabase's current default (both cloud and local CLI) no longer
   auto-exposes new tables to `anon`/`authenticated` (see `api.auto_expose_new_tables` in
   `config.toml`); the schema doc predates that default and never declared explicit
   grants. Fix: `grant select, insert, update, delete` on all 15 tables (that existed at
   the time) to `authenticated` only (deliberately nothing to `anon` — this product has
   no public surface). This is safe to do broadly because RLS policies (or their
   absence) still gate what's actually allowed per table/operation — e.g.
   `trade_history`/`ai_analysis`/`audit_log` have no `insert` policy, so the blanket
   grant doesn't open writes to them. Every table added since (`news_articles`,
   `trade_orders`, `trader_plans`, `user_ai_settings`, `ai_prompts`) got its own `GRANT`
   in its own migration, following this same rule — and `news_articles` needed the
   *exact same bug* fixed a second time, but for `service_role` instead of
   `authenticated` (migration `20260719140000` — see the migration list above). This bug
   class recurs any time a new role needs table access, so check for it explicitly
   whenever a new table will be read/written by a `service_role` Edge Function.
3. **Views bypass RLS by default** (`20260702120000_user_trade_stats_view.sql`). A plain
   Postgres view runs with its *creator's* privileges, not the querying user's — so a
   naive `create view public.v_user_trade_stats as select user_id, ... from trades group
   by user_id` would let any authenticated user read every user's aggregate stats,
   completely bypassing `trades_owner_all`. This one was caught in review, not by a
   failed query, which is the scary version of this bug. Fix: `create view ... with
   (security_invoker = true)` (Postgres 15+) — this makes the view evaluate the
   underlying table's RLS as the calling user, so `group by user_id` can never surface
   more than the caller's own row. **Every view over an RLS-protected table needs
   `security_invoker = true` — this is not optional, and Postgres does not warn you if
   you forget it.**

**Any new table needs both a policy *and* a grant** (bug #2) — RLS without the grant
does nothing but produce a confusing "permission denied" that looks unrelated to RLS.
**Any new view over an RLS table needs `security_invoker = true`** (bug #3) — without
it, RLS silently does nothing and the view leaks cross-user data with no error at all.

### Local ports are non-default — read this before debugging a port error

`supabase/config.toml` moves every local service off its default 5432x port range to
55321-55329. This is **not a style choice** — on this Windows dev machine, Windows/Hyper-V
dynamically reserves TCP port ranges (check with
`netsh interface ipv4 show excludedportrange protocol=tcp`), and the default Supabase
range (54321-54329) fell inside one of those reservations, so Docker couldn't bind to it
(`bind: An attempt was made to access a socket in a way forbidden by its access
permissions`). If `supabase start` fails with that error on a fresh machine, check the
excluded ranges again and shift the ports in `config.toml` to a free block — don't try to
force the default ports via netsh/system changes, that's more invasive than just moving
the ports.

Current local endpoints (`npm run db:status` to reprint):
- API: `http://127.0.0.1:55321`
- DB: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Studio: `http://127.0.0.1:55323`
- Inbucket/Mailpit (test email inbox): `http://127.0.0.1:55324`

### Verified state

At the time this section was first written, all 15 tables existed with RLS enabled on
every one (`select relrowsecurity from pg_class where relnamespace = 'public'::regnamespace
and relkind = 'r'` — all `t`), matching the schema doc's "RLS activado en TODAS las
tablas sin excepción" rule. `pgcrypto`, `pgsodium`, and `vector` extensions are all
installed successfully in the local Postgres 17 image.

**As of 2026-07-19, `src/types/database.ts` (generated, so authoritative) lists 18
tables** — `ai_analysis`, `ai_prompts`, `ai_provider_config`, `ai_usage_daily`,
`audit_log`, `instruments`, `news_articles`, `objectives`, `profiles`, `strategies`,
`trade_history`, `trade_images`, `trade_orders`, `trade_threads`, `trader_plans`,
`trader_rules`, `trades`, `user_ai_settings` — **and 4 views**, not the single
`v_user_trade_stats` this section originally described: `v_user_trade_stats`,
`v_user_stats_by_strategy`, `v_user_stats_by_emotion`, `v_rule_violations`. The RLS-
enabled-on-every-table claim above was not re-verified against the live database during
this pass (that would require a live `execute_sql`/psql check, out of scope for a docs
resync) — re-run the `pg_class` query above if you need to confirm it still holds for
the 3 newest tables specifically.

Full loop verified against the running stack, not just compiled: real `signUp` → fetched
the confirmation email from Mailpit's API → confirmed → real `signInWithPassword` →
redirected to `/onboarding` (`onboarding_done` was false) → answers persisted to
`profiles` → redirected to `/nuevo-trade` → a trade persisted to `trades`, with
`resolveInstrumentId` correctly matching the seeded `EURUSD`/`forex` catalog row instead
of creating a duplicate custom one. Also confirmed an anon (no-session) REST call to
`/rest/v1/trades` is flatly denied (`permission denied` — no grant to `anon` at all),
which is the intended posture for a product with no public surface.

### Production (Supabase Cloud + Vercel)

The app is live at **`https://lineartrade.vercel.app`**, wired to a separate Supabase
Cloud project (ref `pcmftbzpzeliurrnyidt`) — a different database from local Docker, but
the identical schema: the original 26 migrations plus `seed.sql` were pushed to it via
`supabase link --project-ref ... && supabase db push --include-seed`, authenticated with
a personal `SUPABASE_ACCESS_TOKEN` (never committed anywhere — exported inline per
command, not stored in `.env*`). Migrations 27-33 (options/order-tickets/avatars/news/
trader-plans, listed under "Backend" above) ship the features that are live in
production today (Noticias, options trading, Perfil/avatar), so treat them as pushed too
— re-run `supabase db push` against the cloud project if you ever find cloud behind
local, rather than assuming the "26 migrations" figure from the original Production
verification still bounds what's live.

**Don't run `supabase config push` against the cloud project.** `config.toml`'s
`[auth].site_url` is `http://localhost:5180`, meaningful only for local `supabase start`;
pushing that file's config wholesale would overwrite the cloud project's production Auth
settings with a localhost URL. Instead, the cloud project's `site_url` and
`uri_allow_list` were set directly via the Supabase Management API
(`PATCH /v1/projects/{ref}/config/auth`) to `https://lineartrade.vercel.app` (plus
`/actualizar-password` and a `/**` wildcard) — this is what makes signup-confirmation and
password-reset email links land on the real domain instead of `localhost:3000` (the
Supabase default for a project that's never had its Auth URLs configured).

**Vercel project `lineartrade` lives under a different Vercel account/team** than
whatever `vercel` CLI is logged into on this machine (the CLI's personal scope doesn't
have access to the team that owns the live project) — don't assume `vercel env`/
`vercel link` from a fresh shell can reach it. Env vars (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, Production + Preview) were set via the Vercel REST API with a
personal access token instead. Because Vite bakes `VITE_*` vars in at **build** time, not
runtime, adding/changing them requires a fresh deployment before they take effect — a
dashboard edit alone does nothing until the next build. GitHub → Vercel auto-deploy is
already wired for `main`; a normal `git push` is enough to ship.

Production currently uses Supabase's default built-in email sender for confirmation/reset
mail (rate-limited, not a real SMTP provider) — fine for early testing, worth replacing
with a real SMTP integration before relying on it for actual users.

### PostgREST schema cache staleness

Real incident, not hypothetical: after pushing a migration to Supabase Cloud, PostgREST
can keep serving its **old** cached schema — a newly-added table/column is invisible to
the REST API (and therefore to any Edge Function or frontend query touching it) even
though the migration applied successfully in Postgres itself. This happened for real
with `news_articles`/`trader_plans`. Fix in this repo: a deliberately trivial migration,
`20260719173629_refresh_postgrest_schema_cache.sql`, whose only job is forcing a reload.
If a migration lands cleanly but queries against its new objects still 404/error as if
they don't exist, suspect this before suspecting the migration itself — push another
no-op migration (or use the Supabase dashboard's "reload schema" action) rather than
re-debugging SQL that already worked once.

## Planned product architecture

The reference docs in `docs/` define the full system. Read the relevant one before
touching anything in its domain — they are the contract, not background reading:

- `docs/trade-journal-os-prd-v2.md` — consolidated PRD: principles, module decisions, stack, roadmap.
- `docs/trade-journal-os-schema.md` — complete Supabase schema (tables, RLS, triggers, indexes).
- `docs/trade-journal-os-context-engine.md` — the AI context engine design.
- `docs/lineatrade-plan-implementacion.md` — phased build plan and current status.
- `docs/lineatrade-design-system.md` — brand identity and design system: color tokens
  (including the semantic `gain`/`loss` pair added 2026-07-20, kept deliberately separate
  from the `signal` brand accent — see "Design system" below for the token list), typography,
  motion, component patterns, and a prioritized backlog of further UI work per screen. Read
  this before adding a color, a component variant, or touching P&L/long-short styling.

### The product in one line

A mobile-first trading journal where **the backend computes facts (SQL) and the AI only
interprets them — it never calculates and never invents.** Not signals, not predictions,
not financial advice. Positioning: *"les ayudamos a cometer menos errores."*

### Non-negotiable principles (these shape the code, not just the copy)

1. **The AI never invents.** Every number it cites must exist literally in the structured
   context handed to it. Data sufficiency is a deterministic code rule (`data_sufficiency`
   from closed-trade count), not the model's judgment.
2. **Backend calculates, AI interprets.** Win rate, profit factor, expectancy, etc. come
   only from SQL views (`v_user_stats_*`) — never from the LLM.
3. **User owns their data.** No social features, no rankings, no cross-user sharing.
   SuperAdmin access to another user's trades is **always audited** — implemented as an
   Edge Function with `service_role` that writes to `audit_log` *before* returning data,
   never as a silent RLS read policy.
4. **The journal is the only source of truth** for any analysis.

### AI context engine (the load-bearing design)

Context is built as a 4-layer structured object (aggregate SQL stats / immutable trade
snapshot / historical context / control metadata) — **never** free-text concatenation.
Prompt-injection defense is structural: `DATOS_ESTRUCTURADOS` (source of truth) is kept
strictly separate from `TEXTO_DEL_USUARIO` (user notes, explicitly "not instructions").
Output is forced into JSON with `facts_cited` — every claim links to a real context field,
so hallucinations are programmatically detectable. Each analysis stores an immutable JSONB
snapshot of the trade so it stays coherent even if the trade is later edited.

### Intended full stack (beyond the current Fase 0)

- **Frontend:** React + TS + Vite + Tailwind, plus (per PRD) Shadcn UI, React Hook Form,
  Zod, TanStack Query, TanStack Router, Recharts, Framer Motion.
- **Backend:** Supabase — Postgres, Auth, Storage (`trade-images` bucket, private),
  Edge Functions, RLS on **every** table, Realtime limited to "AI analysis done" notices.
- **AI:** own multi-provider adapter (`AIProvider` interface) over OpenAI/Anthropic/Gemini/
  Groq/DeepSeek/OpenRouter/Ollama/LM Studio. Free-tier default: GPT OSS 20B via Groq,
  3 analyses/day, rate-limited via the `ai_usage_daily` table (no Redis). BYOK removes the
  limit. Model/provider are **never hardcoded** — they live in `ai_provider_config`.
  `AdminPanel.tsx`'s `ProviderConfigSection` (added commit `12d014d`) is the first
  app-level UI for this — it's API-key entry only (via `set_provider_api_key` RPC),
  read-only for provider/model name; changing *which* provider/model is default still
  requires a direct SQL update to `ai_provider_config`, not a UI control.
- **Observability:** Sentry (errors) + PostHog (product, via an `AnalyticsEvent` interface);
  `audit_log` for security. Fixed ~12-event taxonomy in the PRD; never put financial or
  psychological values in event properties.

### Roadmap phases

**Fase 0 through Fase 4 are all closed.** Every screen in Fase 0/1 (Landing, Registro,
Login, Recuperar, Actualizar contraseña, Onboarding, Nuevo Trade, Dashboard, Historial,
Detalle de Trade) exists and is wired to real data, verified end-to-end against the
local stack. Fase 2 — schema, RLS, grants, the stats view, triggers, seed, generated
types, auth/CRUD, closing a trade, and `trade_images` Storage upload — is done and
verified locally, including a real upload → signed URL → display round trip and a
confirmed-denied anonymous request to the private bucket. See "Images" below.

**Update 2026-07-19 — the CSV-import item below is stale, kept for history:** it
described `NuevoTrade`'s "Subir archivo" tab (bulk-import from a broker CSV/statement)
as a distinct feature from `trade_images`, UI-only and blocked at save. That was
accurate through commit `3315345`, but commit `7f89396` **removed the entire tab**
(along with the `manual`/`file`/`photo` selector it was part of), leaving
`lib/tradeImport.ts` (`parseTradesCsv`) as orphaned dead code with zero importers.
**Update 2026-07-20 — fully removed:** `lib/tradeImport.ts` itself was deleted, by
explicit product decision rather than being resurrected. If asked "is CSV import done,"
the accurate answer is "it was built, then removed from the UI, then the dead parser was
deleted too — there is no CSV import path in this codebase today." See "Beyond Fase 4"
below for what replaced it as the primary trade-entry-assist mechanism (mandatory photo +
AI extraction).

**Fase 3 (motor de IA)** shipped the `analyze-trade` Edge Function
(`supabase/functions/analyze-trade`) plus `/configuracion/ia` (`ConfiguracionIA.tsx`) for
BYOK API-key management (`set_provider_api_key`/`get_byok_status`/`disable_byok` RPCs, key
material read through Vault via `read_vault_secret` — never returned in plaintext to the
client) and rate limiting via `ai_usage_daily` (`check_and_increment_ai_usage`, made
atomic and fixed for an ambiguous-column bug — see the migration list above).
`AIAnalysisPanel` on `TradeDetail` is the "Analizar con IA" entry point.

**Fase 4 (SuperAdmin)** shipped `/admin` (`AdminPanel.tsx`, gated by
`<SuperAdminRoute>`/`is_superadmin()`) showing aggregate system metrics — users, trades,
AI usage — via the `get_system_metrics()` RPC (`security definer`, so it can read across
all users deliberately, unlike the per-user `v_user_trade_stats` view). Sentry/PostHog
observability from the PRD's "Intended full stack" is **not** wired up yet — treat that
as still open if someone asks about error tracking or product analytics.

### Beyond Fase 4

None of this has a formal phase number — it shipped after the roadmap's 5 phases were
already closed, without a new phase being declared in `docs/`. Treat the list below,
not the phase table, as the current edge of the product:

- **Options trading & order tickets** — spot/CFD trades and options contracts now share
  `NuevoTrade.tsx`'s form; `trade_orders` adds one row per order leg (`'open'`/`'close'`)
  as a genuinely separate concept from `trades` (a broker generates two orders per
  trade, `trades` is still one row). See "Options trading & order tickets" below.
- **Photo-based trade extraction (AI vision)** replaced manual-only entry as the default
  path into `NuevoTrade`, and CSV import (now fully removed, not just orphaned — see
  above) as described above. See "Photo-based trade extraction" below.
- **Noticias** (`/noticias`) — a Spanish-language news feed, RSS-sourced, refreshed
  on-demand (no cron). See "Noticias (news feed)" below.
- **Sistema** (`/sistema`) — user-defined objectives/rules/strategies. See "Sistema
  (objectives/rules/strategies)" below.
- **Perfil** (`/perfil`) — profile page + avatar upload to a **public** bucket
  (deliberately different from `trade-images`' private-bucket pattern). See "Perfil &
  avatar upload" below.
- **IA Trader / trader plan engine** (`/ia-trader`) — see the route entry near the top
  of "Architecture / conventions" above; it's the one route without `<ProtectedRoute>`.
- **Navigation redesign** — `AppFloatingNav` (Aceternity-style floating pill, icons
  only, hides on scroll) took over primary nav from `AppHeader`, replacing the
  interim `BottomNav`. See the note under "Architecture / conventions" above.

### Options trading & order tickets

`trades` gained `option_type` (`'call'|'put'`), `strike_price`, `expiration_date`
(migration `20260716120000`). `TechnicalEntryPanel.tsx` conditionally renders Tipo/
Strike/Vencimiento fields when `market === 'options'`, and relabels "Contratos"/"Prima
por acción" with a note that the multiplier is automatic — `trg_calculate_trade_pnl()`
applies a ×100 contract multiplier to `pnl_amount` for options (looked up from the
resolved instrument's `market`), leaving `pnl_r` unaffected since the multiplier cancels
out of the ratio. **Real bug already found and fixed**: `new Date(trade.expiration_date)`
on a date-only string (`"2026-03-27"`) parses as UTC midnight, so `toLocaleDateString`
rendered it a day earlier in negative-UTC-offset timezones (caught with a real SPXW put
showing the wrong expiration date). Fix: `formatDateOnly()` in `lib/tradeDisplay.ts`
builds the `Date` from local y/m/d components instead of parsing the ISO string
directly — use it (or the same pattern) for **any** date-only field in this codebase,
not just this one.

`trade_orders` (migration `20260716130000`) is one row per order **leg**
(`'open'`/`'close'`, unique per `(trade_id, leg)`) — not a duplicate of `trades`, since a
broker issues two distinct orders (entry, exit) per trade. `OrderTicketFields.tsx` is an
optional, collapsed-by-default form ("+ Detalles de la orden (opcional)") reused in both
`NuevoTrade.tsx` (the `'open'` leg, inserted right after the trade row) and
`TradeDetail.tsx` (the `'close'` leg, on closing the trade). RLS uses a denormalized
`user_id = auth.uid()`, same pattern as `trade_threads`.

### Photo-based trade extraction (AI vision)

`extract-trade-image` (`supabase/functions/extract-trade-image`) takes a base64 image
(5MB cap, `jpeg`/`png`/`webp` only) and calls Groq's vision-capable model (the function's
own comment notes only `qwen/qwen3.6-27b` has vision support today — check that comment
before assuming any other configured provider works here) with `forceJson: true`,
retrying once on invalid JSON. It shares the `ai_usage_daily` rate limiter with
`analyze-trade` and resolves the API key the same way (BYOK or shared default via
Vault). It returns structured fields (market, symbol, action, option fields, date/time,
quantity, price, commission, plus order-ticket fields) and **never persists the image**
— nothing is written to Storage, unlike `trade_images`. Frontend:
`lib/tradeImageExtraction.ts` (`extractTradeFromImage`) base64-encodes client-side and
invokes the function directly. This is now the **only** entry point into
`TechnicalEntryPanel.tsx`'s step 0 — see the `/nuevo-trade` route entry above for why a
failed extraction still lets the user proceed manually.

### Noticias (news feed)

`Noticias.tsx` renders **two layouts from the same filtered list** (deliberate, by user
request — the dense feed is mobile-only): on mobile, a wire-style dense list (one row
per article — timestamp + source line, then the headline, small thumbnail or
`SourceAvatar`), and on desktop (`lg:`) a news-platform layout with the first article
as a hero card (16/9 image + large headline + summary) and the rest in a
`grid-cols-2 xl:grid-cols-3` card grid. Category pills keep the **same visual design
on every breakpoint** — the only difference is layout: a horizontally scrollable row
on mobile (`overflow-x-auto`, scrollbar hidden) vs wrapped/centered on desktop
(`lg:flex-wrap lg:justify-center lg:overflow-visible` — desktop must never use the
hidden-scrollbar scroll row, those pills are unreachable with a mouse). "Fuerza fuentes en español" (the original
design intent, still true for most sources) is **not** a runtime filter — it's the hardcoded
list of feeds in `supabase/functions/_shared/newsTypes.ts`'s `NEWS_FEEDS`. **As of
2026-07-20 this list has a deliberate exception**: Yahoo Finance and MarketWatch (English)
were added alongside the Spanish sources, at explicit product request, to cover US market
news that breaks in English before any Spanish outlet carries it. Xataka and Hipertextual
(Spanish tech blogs) were added under a new `tecnologia` category (migration
`20260720144409`, extending `news_articles`' category check constraint) — cards render
their category badge same as any other source, so the language mix is visible, not hidden.
Every feed URL in `NEWS_FEEDS` was verified live via `curl` before being added — a
plausible-looking RSS URL that 404s just silently degrades to `partial: true`, no error
surfaced to the user.

**`/noticias/:id` (`NoticiaDetail.tsx`, added 2026-07-20)** — an in-app article reading
view: full `summary` field (now capped at 800 chars server-side, up from 320 — see
`fetch-news/index.ts`), full-size image, source/category/date, a "Leer la nota completa en
{source}" external CTA, a share button (`navigator.share` with clipboard-copy fallback),
and up to 4 related articles from the same category (`getRelatedArticles` in `lib/news.ts`,
a direct `news_articles` select — the table's already `select`-authenticated by RLS, no
need to round-trip through the Edge Function for a single cached row).
**This is deliberately not full-article reproduction** — RSS feeds license a headline +
short description for syndication, not the complete copyrighted article body, and
`summary` has never been anything but that description field. The external CTA is a
required part of the page, not an afterthought: it's the only legitimate way to deliver
"read the complete article," short of scraping the source (which this app does not do).
Noticias.tsx's cards link to this internal route now (`<Link to={`/noticias/${id}`}>`)
instead of opening the source directly in a new tab — the direct-to-source link still
exists, just one tap deeper, inside the detail page.

`lib/news.ts`'s `fetchNews()` keeps a **5-minute module-level session cache**
(`CLIENT_CACHE_MS`, volatile memory only — never localStorage, same rule as the service
worker which never caches Supabase responses) so navigating list → detail → back doesn't
re-invoke the Edge Function or flash the skeleton; `getNewsArticleById`/
`getRelatedArticles` also read from that cache first, falling back to a direct
`news_articles` select (allowed by RLS). Past the cache, it calls
`supabase.functions.invoke('fetch-news')`, delegating freshness logic
entirely to the Edge Function. `fetch-news` has **no cron/pg_cron** — refresh happens
on-demand: if the newest cached row is older than `STALE_MS` (25 minutes), the *next*
page load triggers a re-fetch of all RSS feeds (`Promise.allSettled`) and an `upsert`
into `news_articles` (`onConflict: 'url'`) via a `service_role` client; otherwise it just
serves what's cached (capped at 120 articles). `news_articles` (migration
`20260719130000`) is a read-only catalog for users — `select`-only RLS policy, no
insert/update/delete for `authenticated` despite the broad table `GRANT` — matching the
`ai_analysis`/`trade_history` pattern of "grant is broad, RLS narrows it to what's
actually allowed."

### Sistema (objectives/rules/strategies)

Three tabs, each doing simple soft-delete CRUD (a `deleted_at` column, not a hard
`delete`) directly against its own table via the Supabase client — no server-side
endpoint layer:

- `ObjectivesSection.tsx` → `objectives` (title, `metric_type`:
  `win_rate`/`profit_factor`/`r_avg`/`custom`, target_value, period_start/end, and a
  manually-updated `current_value`/`achieved` toggle).
- `RulesSection.tsx` → `trader_rules` (title, description, `is_active` toggle).
- `StrategiesSection.tsx` → `strategies` (name, description, `is_active` toggle).

**`v_rule_violations` exists as a view (migration `20260703100000`) but is not consumed
anywhere in `Sistema.tsx` or `TradeDetail.tsx`** — its only consumer today is the AI
context builder (`supabase/functions/_shared/contextBuilder.ts`), which feeds it into
`analyze-trade`'s context. Per that migration's own comment, it only covers the
`stop_loss_moved` flag for now — there's no generic rules engine that cross-references
`trader_rules.title` against actual trade behavior yet. Don't assume declaring a rule in
`Sistema` automatically gets checked against trades; today it doesn't, beyond the one
hardcoded stop-loss check already described under the `/trades/:id` route above.

### Perfil & avatar upload

`Perfil.tsx` shows the avatar (click-to-upload), display name/email, onboarding-derived
facts, trade stats from `v_user_trade_stats`, and a links list to `/historial`,
`/sistema`, `/configuracion/ia`, and (superadmin only) `/admin`.

`lib/avatarUpload.ts` validates size (≤5MB) and MIME type (`image/*`), then uploads to a
**fixed** path `{userId}/avatar` with `upsert: true` — a new photo always overwrites,
never accumulates. **The `avatars` bucket is created `public: true`** (migration
`20260719120000`), unlike `trade-images`. This is deliberate, not an oversight: an RLS
storage policy still restricts insert/update/delete to the user's own folder prefix, but
reads are public and use `getPublicUrl()` + a `?v=<timestamp>` cache-busting query param,
never `createSignedUrl()`. The tradeoff (per the code's own comment) is intentional: a
signed URL would mean an extra Storage round-trip on every header/avatar render across
every page, for data (a profile photo) that isn't sensitive the way trade screenshots
are. **Don't copy this pattern onto `trade-images`** or any future genuinely private
bucket — the public-bucket choice here is specific to "this data isn't sensitive," not a
general precedent.

### Closing a trade

`TradeDetail.tsx` shows a "Cerrar trade" form (just an exit price input) when
`trade.status === 'open'`. Submitting does `update({ exit_price, status: 'closed'
}).eq('id', trade.id)` — nothing else. `pnl_amount` and `pnl_r` are **never sent by the
client**; a `before insert or update` trigger
(`trg_calculate_trade_pnl`, `20260702130000_close_trade_pnl_trigger.sql`) computes both
server-side the moment `status` becomes `'closed'` with a non-null `exit_price`, same
"backend calculates" principle as the stats view. `pnl_amount = (exit - entry) *
position_size - commission` (sign flips for `short`); `pnl_r = pnl_amount / (|entry -
stop_loss| * position_size)`, or `null` if `stop_loss` was never set — there's no risk
unit to normalize against, so it stays honestly blank rather than guessing. Verified by
hand: entry 3000, stop_loss 2900, qty 2, commission 5, exit 3300 → the trigger produced
exactly `pnl_amount = 595`, `pnl_r = 2.975`, matching the manual calculation; Dashboard
then showed `win_rate`/`profit_factor`/`avg_r` as real non-null numbers for the first
time in this project. A second trade closed at a loss with no `stop_loss` correctly
produced a non-null `pnl_amount` and a `null` `pnl_r`.

`NuevoTrade.tsx`'s technical entry form now also captures an optional `stop_loss` (it
didn't before this — a trade could never produce a meaningful `pnl_r` without it,
regardless of the trigger). `lib/tradeDisplay.ts` (`formatTradeResult`,
`tradeResultColorClass`) is the shared display logic for a trade's result across
Dashboard/Historial row lists — R if available, else the $ amount, else the entry price
for a still-open trade; don't reintroduce the entry-price fallback for a *closed* trade
that lacks `pnl_r`, that was a real bug caught in this same pass (a losing trade with no
stop_loss displayed its entry price instead of its loss, which reads as neutral/positive
at a glance).

### Images

`TradeDetail.tsx` has an image gallery + upload control living inside the "Hilo de
seguimiento" section on purpose — the images and the thread are meant to be seen
together, not as separate tabs. Upload flow (`lib/tradeImages.ts`):

1. Client-side validation first: reject anything over 5MB or not `image/*`, before
   touching the network.
2. `supabase.storage.from('trade-images').upload(path, file)`, with `path =
   {user_id}/{trade_id}/{stage}_{timestamp}_{sanitized_filename}` — this exact shape is
   required by the Storage RLS policy `(storage.foldername(name))[1] =
   auth.uid()::text` (schema doc §6), not just a convention.
3. Insert a `trade_images` row (`trade_id`, `stage`, `storage_path`) pointing at that
   object.
4. The bucket is **private** — there is no public URL. Every display of an image goes
   through `getSignedImageUrl()` (`createSignedUrl`, 1-hour TTL), generated fresh on
   each page load, never persisted. A signed-URL miss renders an inline "error"
   placeholder tile instead of a broken `<img>`.

Verified against the real bucket, not assumed: uploaded a synthetic canvas-generated
PNG, confirmed the `trade_images` row and the physical `storage.objects` row both
exist, confirmed the signed URL actually renders the image, confirmed a `.txt` file is
rejected client-side before any network call, and confirmed an anonymous REST request
for the object's path (with only the public `anon` key, no session) is denied — the
bucket being `public: false` is doing real work, not just a config flag nobody checked.

`stage` is `'before' | 'during' | 'after'`, the existing `trade_image_stage` enum from
schema §6 — no new type was added. The upload control's stage selector defaults to
`'before'` and stays wherever the user last clicked it, so uploading several images for
the same stage in a row doesn't require reselecting it each time.

### Contract-first typing — note the tension between docs

The PRD (§8) says build the frontend against **types generated from the Supabase schema**
(`supabase gen types typescript`), not hand-maintained mocks, to avoid schema↔UI drift.
The implementation plan's Fase 1 instead says build private screens with mock data using
the TypeScript types from the schema/context-engine docs. When this comes up, prefer the
PRD's contract-first stance: define the types to match the schema exactly so migrating to
real data is a data-source swap, not a rewrite. Also note the current code already diverges
from the PRD stack (it uses `react-router-dom`, not TanStack Router) — reconcile
deliberately rather than by accident.
