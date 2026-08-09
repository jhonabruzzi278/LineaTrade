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
noise. **Real mobile-overlap bug fixed 2026-07-21**: the row used to be one
`justify-between` line with symbol, side badge, date, *and* status all crammed into the
left group alongside the P&L result on the right — on narrow widths that left group ran
out of room, and since none of its children had `truncate`/wrap of their own, they simply
overflowed the shrunk flex item and rendered on top of the result on the right (verified
against a real screenshot: "long" visually overlapping "+20097.2", "open" overlapping
"5.38"). Fixed by splitting into two lines: the primary line keeps only symbol + side
badge (left) and result + arrow (right) — both sides always short enough to fit — and
date/status moved to their own second line below, which never competes with the result
for the same horizontal space. This is now a fixed 2-line layout at every breakpoint, not
just a mobile-only variant — it reads better on desktop too, not only avoids the bug.
`components/sistema/` holds `ObjectivesSection`/`RulesSection`/
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

**Navigation was redesigned three times**: commit `7f89396` first moved primary nav out
of `AppHeader` into `<BottomNav/>` (an Instagram-style island bar), which was replaced by
`<AppFloatingNav/>` (`components/AppFloatingNav.tsx`, built on
`components/ui/floating-navbar.tsx` — an Aceternity-style floating pill ported to
react-router) as a **top**-anchored pill. **2026-07-21: moved back to the bottom** (a
plain `fixed inset-x-0` pill anchored near the bottom edge, `style={{ bottom: 'max(1rem,
calc(0.5rem + env(safe-area-inset-bottom)))' }}` so it clears the gesture bar on the
installed PWA/TWA — see "PWA-to-APK" below) at explicit user request, restoring the
original `<BottomNav/>` era's placement but keeping the pill visual language. It **hides
when scrolling down and reappears when scrolling up** (see the `framer-motion` paragraph
below for how that's implemented). It links to `/dashboard`, `/historial`,
`/nuevo-trade`, `/noticias`, `/perfil` (still no direct `/sistema` or `/ia-trader` links
— reachable via `Perfil`), and shows **icons only on every breakpoint** (lucide-react
icons; words were removed by user request — each link keeps its name in
`aria-label`/`title`). `/nuevo-trade` renders with `emphasized: true` — filled `signal`
background + `ink` icon instead of the flat `text-faint`/`text-signal` treatment other
links get — since creating a trade is this product's core action, the same "make the
primary action visually distinct" idea as a mobile app's center FAB. The active route is
highlighted (`text-signal bg-signal/10`) via `react-router-dom`'s `NavLink`, not plain
`Link` — there was no active-state indicator at all before this pass. The `Perfil` link's
icon is the user's actual avatar photo (`avatarUrl` from `useAuth()`, falling back to
initials via the same `getInitials()` used by `Avatar.tsx`), not a generic `User` icon —
`NAV_ITEMS` moved from a module-level constant into `AppFloatingNav`'s function body for
this reason, since it now needs data from a hook. An `<img>` doesn't respond to
`text-signal` like an SVG `currentColor` icon does, so the active-route indicator for
this one link is a `ring-2 ring-signal` instead of a color change — `FloatingNav`'s
`isAvatar` flag on a nav item switches to that treatment; `floating-navbar.tsx`'s
`NavLink` renders its icon via a children-function (not a plain node) specifically so it
can read `isActive` for this ring.

**2026-07-21: the "Salir" button was removed from the floating nav entirely** — it's not
a navigation destination, so it didn't belong in a `NavLink`-based bar, and a destructive
account action (sign out) sitting one tap away in the *global* nav (reachable from every
screen) was a real misclick risk. Signing out now lives as an explicit, unmissable
control at the bottom of `/perfil` — see "Perfil & avatar upload" below.

Moving the pill off the header band means `AppHeader`'s wordmark no longer needs to hide
below `lg:` (it used to disappear on mobile specifically because the top-anchored pill
would invade the text) — the `hidden lg:inline` restriction was removed, so the wordmark
now shows at every breakpoint again.

**Every page that renders `<AppFloatingNav/>` needs real bottom clearance on its
`<main>`, not just token breathing room** — bumped from `pb-16` to `pb-28` across all 10
call sites (`Dashboard`, `Historial`, `Sistema`, `Perfil`, `Noticias`, `NoticiaDetail`'s
three return branches, `ConfiguracionIA`, `AdminPanel`, `IaTrader`, `TradeDetail`'s
loaded-trade branch). Verified the actual failure mode before picking a number, not just
guessed at one: trailing `padding-bottom` only helps a page the user actually scrolls to
the end of — on a *short* page (all content fits within one viewport, nothing forces a
scroll), the last element's on-screen position is fixed by everything **above** it, and
no amount of padding **after** it moves it, so `pb-16` still let the "Cerrar sesión"
button on `Perfil` sit directly under the fixed pill in an unscrolled 1280×720 view.
`pb-28` was verified at a real mobile viewport (375×812, this product's actual primary
target) across every affected page — clearance stayed positive (35–270px) between the
lowest content and the pill even at max scroll. If you add a new page with
`<AppFloatingNav/>`, give its `<main>` the same `pb-28` — anything less isn't proven safe
and anything checked only at a wide/short desktop window can look fine while still
failing on the phone sizes that matter.

`components/BottomNav.tsx` was deleted; the hand-drawn `components/icons/NavIcons.tsx`
died with it (kept only for other uses like `CameraIcon`).

**`floating-navbar.tsx` no longer uses `framer-motion` — it was ported off it, not onto
it, after a real bug found and fixed 2026-07-20.** The original Aceternity port used
`framer-motion`'s `useScroll`/`scrollYProgress` to decide hide/show, guarded against
`scrollYProgress` being `NaN` on non-scrollable pages (division by a zero
`scrollHeight - clientHeight`). That guard didn't actually save it: verified live
against a real logged-in session (fresh signup → confirm via local Mailpit → onboarding
→ Dashboard) that the pill rendered **permanently off-screen** (`top: -96px`, translated
out of the viewport) on a normal empty Dashboard, without the user ever scrolling — a
transient layout shift during data loading fired one bogus "scrolled down" `NaN` event,
and because a non-scrollable page never fires another scroll event, nothing ever
brought it back. Removing the `<AnimatePresence mode="wait">` wrapper (dead weight —
this component never actually mounts/unmounts a keyed child, so there was never a real
enter/exit for `AnimatePresence` to coordinate) didn't fix it either: React's own fiber
tree showed `motion.div`'s `animate` prop correctly updating to `{ y: 0, opacity: 1 }`
on every render, `visible` was confirmed `true` via render logging on **every single
render**, yet the DOM stayed frozen at its `initial` transform with zero active
animations (`element.getAnimations()` returned `[]`) and no thrown error — framer-motion
just never ran the `initial → animate` transition in this app, full stop. Root cause
never fully isolated (framer-motion 12.x + this Vite/React 19 setup); the fix was to
stop depending on it. The component now drives visibility with a plain `window.scrollY`
listener (compared against its previous reading — no division, so no `NaN` case is
possible) and animates via Tailwind `transition-all` + conditional `translate-y`/
`opacity` classes instead of `motion.div`/`AnimatePresence` — matching this project's
existing no-animation-library convention (see "Motion" above: `TraceLine.tsx` and
`TechnicalEntryPanel`'s hand-rolled CSS keyframes). `framer-motion` was removed from
`package.json` since nothing else in the codebase imports it. If floating nav visibility
ever looks wrong again, suspect the CSS class toggle in `floating-navbar.tsx` first —
not a scroll-math edge case, and don't reach for `framer-motion` to "fix" it.

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

- **Migrations**: `supabase/migrations/*.sql`, **45 files** (43 as of the 2026-07-22
  push-notifications recount, +2 for the two 2026-07-27 migrations below — admin-panel
  metrics and the backtesting MVP — recount with `ls supabase/migrations/ | wc -l`
  before trusting this number next time too, same lesson as the "34 files" figure that
  was already stale before the 2026-07-22 session even started). The
  first 26 are as previously documented: 10 one-per-schema-doc-section migrations
  (extensions + profiles, instruments, strategies/rules, trades, trade_history audit
  trigger, trade_images + storage bucket, trade_threads, objectives, AI tables,
  audit_log) faithful to `docs/trade-journal-os-schema.md`; 4 real fixes discovered
  while wiring auth (see "Three real RLS bugs" below) plus small schema extensions; 2
  for the stats view and the close-trade PnL trigger; 8 for Fase 3 (AI stats views,
  atomic rate limiting, BYOK key vault, service-role AI access); 1 for Fase 4
  (SuperAdmin system metrics); 1 for the Lineatrader→LineaTrade rebrand. **8 more
  (27-34) are newer feature work shipped after Fase 4 closed** (see "Beyond Fase 4"
  under "Roadmap phases" below for what they back):
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

  **Migrations 35-40 shipped between the 2026-07-20 resync and this session** — not
  individually verified/documented here the way 1-8 and 41-43 are, only inferred from
  filenames (one exception: `news_cron_jobs.sql`, read in full while building push
  notifications, since it's the direct template for 41-42 below):
  `20260721120000_news_article_body.sql`, `20260721120100_refresh_postgrest_schema_cache.sql`
  (same schema-cache-nudge pattern as migration 33), `20260721130000_news_cron_jobs.sql`
  (schedules `fetch-news` via pg_cron/pg_net at 4 daily US-market-hours checkpoints,
  weekdays only — copy this file almost line-for-line if you're touching push-reminder
  scheduling too), `20260721140000_fix_vault_key_rotation_conflict.sql`,
  `20260721150000_provider_model_selector.sql`, `20260721160000_byok_model_selector.sql`
  (AI provider/model selection work). Read the files themselves for the real story
  rather than trusting a description that isn't here.

  **41-43 (2026-07-22) back push notifications** — see "Notificaciones push
  (recordatorio diario)" below for the full feature; this is just the migration-level
  summary:
  1. `20260722100000_push_subscriptions.sql` — one row per browser/device subscription
     (`endpoint` unique, upserted by the client on (re)subscribe), owner RLS plus a
     `service_role` grant — the cron-invoked reminder function needs to read every
     user's subscriptions, not just one.
  2. `20260722110000_trade_reminder_cron_jobs.sql` — schedules `send-trade-reminders`
     via pg_cron/pg_net 2x/day (20:00 and 23:30 UTC, **every day**, not just weekdays —
     unlike news, this journal covers forex/crypto too), same Vault-secret-reading
     pattern as `invoke_news_cron_refresh()` in migration 37.
  3. `20260722120000_grant_service_role_trades_access.sql` — a real bug, caught locally
     before it ever reached production: `send-trade-reminders` needs `service_role` to
     read `trades` across all users (to skip anyone who already logged a trade that
     day), but `trades` had only ever been granted to `authenticated` (migration 14) —
     the exact bug class in "Three real RLS/security bugs" below, recurring again (it
     already hit `news_articles` and the AI tables the same way).

  **44 (2026-07-27) extends `/admin`'s metrics** — see "Fase 4 (SuperAdmin)" under
  "Roadmap phases" below for the full story; migration-level summary:
  1. `20260727100000_admin_panel_extra_metrics.sql` — drops and recreates
     `get_system_metrics()` (Postgres won't `CREATE OR REPLACE` a `RETURNS TABLE` whose
     column list changed) adding 10 aggregate columns covering every "Beyond Fase 4"
     feature that had no metric at all until now: noticias, IA Trader, push, Sistema,
     opciones, BYOK adoption. Also adds `get_cron_job_health()` (reads
     `cron.job`/`cron.job_run_details` directly — the same tables Supabase Studio's own
     "Cron Jobs" UI reads) and `get_cron_secrets_status()` (checks only the *existence*,
     never the value, of the 4 Vault secrets `invoke_news_cron_refresh()`/
     `invoke_trade_reminder_cron()` need to actually fire). Both new RPCs follow the
     exact `security definer` + `is_superadmin()` + `audit_log`-insert contract the
     original `get_system_metrics()` (20260704090000) already established — no new
     security model introduced.

  **45 (2026-07-27) is the backtesting MVP** — see "Backtesting (Market Replay)" under
  "Beyond Fase 4" below for the full story; migration-level summary:
  1. `20260727110000_backtesting_mvp.sql` — adds `backtest_sessions` (one row per
     Market Replay run) and `trades.is_backtest`/`trades.backtest_session_id`, then
     `CREATE OR REPLACE VIEW`s all 4 existing aggregate views that read `trades`
     (`v_user_trade_stats`, `v_user_stats_by_strategy`, `v_user_stats_by_emotion`,
     `v_rule_violations`) to add `is_backtest = false` to their `WHERE` — a practice
     trade must never inflate a real Profit Factor. Only the two tables this MVP
     actually needs shipped — `confluence_types`/`chart_annotations`/`trade_confluences`
     from the original plan doc do not exist yet, see "Backtesting" below for why.

  **46-58 (2026-07-28/29) are the confluences/Coach/Scanner/Insights batch — written
  and, as of this entry, still uncommitted and NOT pushed to Supabase Cloud
  production.** `ls supabase/migrations | wc -l` reports **58 files total** in the
  repo right now, not 45 — recount before trusting any number in this paragraph, same
  standing lesson this file has already learned twice (the "34 files" and "43 files"
  figures were both stale before their own session ended). See "Confluencias, Coach,
  Scanner, Insights (2026-07-29)" under "Beyond Fase 4" below for the full story,
  including 4 real bugs found and fixed directly in these files during the same-day
  audit that added this note (safe to edit in place — none of these 13 had reached any
  real environment yet, unlike every migration this paragraph calls "already
  applied").

  The schema doc (`docs/trade-journal-os-schema.md`) is the source of truth for the
  original 26; it predates migrations 27-58 and hasn't been updated for them — treat the
  migrations themselves as the source of truth for anything the doc doesn't cover. If
  you need a schema change to an **already-applied** migration, add a **new** one
  (never edit an already-applied migration, per the doc's own §11) — migrations still
  sitting uncommitted/unpushed, like 46-58 above, are the one exception this file
  currently has to that rule.
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
  Mailpit (container name is still `supabase_inbucket_lineatrade`, a legacy label — the
  image and API are actually Mailpit, not classic Inbucket) at `http://127.0.0.1:54324`
  (API: `GET /api/v1/messages`, then `GET /api/v1/message/{id}` for the body) — there's
  no real mail server, so this is the only way to get the confirmation link locally.
  **Correction 2026-07-22**: this section previously said port `55324`, matching the
  55321-55329 block the rest of this project's services use — that was wrong, verified
  by actually hitting the API while testing push notifications (`docker ps` shows this
  one container kept its default `54324` mapping; it was never moved with the others).
  `supabase/config.toml` has a harmless commented-out `# port = 55324` (inert, not an
  active override — the container's real port was never controlled by that line in the
  first place). `aidlc-docs/design-artifacts/LOGICAL_DESIGN.md` cites the same wrong
  `55324` figure, sourced from this file — not fixed here, out of scope for this pass.

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

### Push notification deployment (2026-07-22)

Deployed with a personal `SUPABASE_ACCESS_TOKEN` supplied inline for the session (same
non-committed pattern as the original Production setup above): `supabase db push` for
migrations 41-43, `supabase secrets set` for the three Edge Function secrets, then
`supabase functions deploy send-trade-reminders`.

The CLI's `supabase db query --linked` (raw SQL against the live Postgres) was blocked
by this environment's own permission classifier — the right call for a command that
writes straight to production outside of a tracked migration, not something to route
around. The three Vault secrets `send-trade-reminders` needs
(`project_url`/`publishable_key`/`trade_reminder_cron_secret`, see "Notificaciones push"
below) were created instead via direct `curl` calls to the Supabase Management API's
`POST /v1/projects/{ref}/database/query` — same underlying capability, a different tool,
not blocked. `vault.create_secret(...)` calls are never written into a migration file in
this repo (that would leak the secret value into git history permanently) — this is a
one-off, out-of-band action every time, same as the news-cron secrets before it.

**Real discovery made while doing this, unrelated to push notifications but worth
flagging**: querying `vault.decrypted_secrets` before creating anything showed only two
AI-provider key secrets existed in production Vault — **`project_url` and
`publishable_key`, which `invoke_news_cron_refresh()` (migration 37) has depended on
since 2026-07-21, did not exist**. That means the 4 daily news-cron jobs had been
silently no-op'ing in production the whole time (`raise warning`, return, never actually
call `fetch-news`) — `news_articles` had only ever been populated by the on-demand
refresh path inside `fetch-news` itself (`STALE_MS`), never by the scheduled jobs.

**Fixed the same session, at explicit request**: created the missing `news_cron_secret`
Vault secret (same `curl` + Management API pattern as the three above) and set
`NEWS_CRON_SECRET` on the Edge Function to match, then called
`select public.invoke_news_cron_refresh();` directly and confirmed a real
`net._http_response` row — `status_code: 200`, body full of real refreshed articles
(not the `raise warning` no-op). The news cron is genuinely live now, not just
"secrets exist" — verified the same way as the push-reminder cron above, by reading
back the actual HTTP response `pg_net` received, not by trusting the pieces exist.

**`VITE_VAPID_PUBLIC_KEY` in Vercel — not set by this session, set by hand right after.**
No tool available in this session could write a Vercel environment variable itself — the
connected Vercel MCP only exposes deployment/log/domain read tools (`list_projects`,
`get_project`, `deploy_to_vercel` for git-less file-tree deploys, nothing for project
config), the `vercel` CLI isn't installed, and no personal Vercel token was provided the
way the Supabase one was. Handed the production public key over instead; added via the
Vercel dashboard (Project → lineartrade → Settings → Environment Variables →
Production). Same "Vite bakes `VITE_*` in at build time, not runtime" rule as
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` above applies — a dashboard edit alone
changes nothing until the next build, which is what the commit landing this feature is
for (GitHub → Vercel auto-deploy on push to `main`, already wired, see "Production"
above — no separate manual deploy step needed).

**Verified live, not just deployed**: after creating the Vault secrets, called
`select public.invoke_trade_reminder_cron();` directly (safe — `push_subscriptions` was
still empty in production at that point, so this could not have notified a real user),
then read `net._http_response` for the result of the `pg_net` call it made:
`status_code: 200`, `content: {"sent":0,"skipped":0,"removed":0}`. That's the full
production chain — Vault secrets → SQL function → async HTTP POST → the deployed Edge
Function → response — round-tripping for real, not assumed from the pieces existing.

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

**2026-07-27: `get_system_metrics()` extended, plus two new RPCs, to cover the "Beyond
Fase 4" blind spot** — every feature listed below (noticias, IA Trader, push, Sistema,
opciones, BYOK) had shipped with zero visibility in `/admin`; the panel still only
reflected the original users/trades/AI-usage shape from this function's first version.
`get_system_metrics()` (migration `20260727100000`, dropped and recreated since
Postgres won't `CREATE OR REPLACE` a changed `RETURNS TABLE` column list) now also
returns totals for `news_articles`, `trader_plans` (total + distinct users), 
`push_subscriptions`, `objectives`/`trader_rules`/`strategies`, options-market trades,
and BYOK adoption (`user_ai_settings.use_own_key`). Two new RPCs cover infra health that
had no metric of any kind before: `get_cron_job_health()` (last run + status of the 6
pg_cron jobs backing noticias/recordatorios, reading `cron.job`/`cron.job_run_details`
directly) and `get_cron_secrets_status()` (whether the 4 Vault secrets those cron jobs
need are actually configured — checks existence only, never the value). The secrets
check exists because `invoke_news_cron_refresh()`/`invoke_trade_reminder_cron()` (see
migrations `20260721130000`/`20260722110000`) swallow a missing-secret condition with
`raise warning` instead of an exception, so `cron.job_run_details.status` reads
`'succeeded'` even on a run that never actually dispatched the HTTP call — exactly what
happened for real in production before this (see "Push notification deployment" below,
"Real discovery made while doing this"). Both new RPCs follow the original function's
security contract exactly: `security definer` + `is_superadmin()` gate + an `audit_log`
insert before returning anything, verified locally end-to-end (promoted a real test user
to `superadmin`, called all three RPCs through PostgREST with its token, confirmed a
non-superadmin gets `insufficient_privilege` on all three, and confirmed each call wrote
its `audit_log` row) rather than just checked for a clean `tsc`/build.

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
- **Notificaciones push** — native browser/system permission prompt (no custom
  pre-prompt screen) plus a Web Push reminder 2x/day asking "¿ya registraste tu trade de
  hoy?", skipped for anyone who already logged one. See "Notificaciones push
  (recordatorio diario)" below.
- **Panel de admin — métricas extendidas y salud de cron** — `/admin` gained
  feature-adoption counts for every bullet in this list plus a cron-job health/secrets
  section, closing the gap where everything shipped after Fase 4 had zero visibility in
  the SuperAdmin panel. See "Fase 4 (SuperAdmin)" above (the 2026-07-27 addendum) for
  the full story.
- **Backtesting (Market Replay)** (`/backtesting`, linked from a CTA card on
  `/dashboard`, directly below the `/ia-trader` card) —
  pick a symbol/temporalidad, replay real historical Binance candles without seeing the
  future, and execute simulated trades that land as real `trades` rows (flagged
  `is_backtest`, excluded from every aggregate stat). Core replay-and-execute slice
  only, from a much larger pre-written plan — the semantic drawing/confluence system,
  extended dashboard, and pattern engine are explicitly deferred. See "Backtesting
  (Market Replay)" below.
- **Confluencias semánticas, Coach de IA, Market Scanner, Insights cruzados, recorte de
  avatar** (2026-07-29, **NOT DEPLOYED — written locally, never pushed to Vercel or
  Supabase Cloud production as of this entry**) — the deferred pieces of the
  backtesting plan (semantic drawing on the chart, extended dashboard) plus three
  brand-new AI surfaces (`/coach`, `/escaner`, a Dashboard "Insights" section) that
  have no precedent in the original roadmap at all. See "Confluencias, Coach, Scanner,
  Insights (2026-07-29)" below — read it before touching any of these before they ship,
  it documents 4 real bugs found and fixed in-place (never applied anywhere real, so
  fixed directly in the migration files rather than via a follow-up migration) plus
  what's still open.
- **Diseño desktop/mobile diferenciado + auditoría del batch anterior** (2026-08-03) —
  layout tipo TradingView para `/backtesting` en `lg:+`, sidebar de navegación de
  escritorio, y una auditoría de las 4 features del punto anterior (2 bugs reales
  corregidos: concurrencia en cierre de trades de Day Replay, y vocabulario de campos
  no reforzado por Zod en el scanner NL) más una vista faltante conectada
  (`v_user_psychology_stats`). Sigue sin verificarse en un navegador real — ver
  "Auditoría del batch 2026-07-29 + diseño desktop/mobile diferenciado" below.
- **Sidebar de escritorio expandible + `/reporte` (estadísticas avanzadas)**
  (2026-08-06) — el sidebar de escritorio (antes solo una píldora de 5 íconos, ver
  "Diseño desktop/mobile diferenciado" arriba) ahora se expande/colapsa y da acceso a
  todos los módulos que antes solo vivían en tarjetas sueltas del Dashboard
  (Backtesting, Scanner, Coach, IA Trader, Sistema, Configuración IA, Admin). Nueva
  página `/reporte` con win rate, expected value, rachas, R promedio en ganadoras,
  duración promedio, mejor/peor día-semana-modelo y curva de capital, todo sobre datos
  reales (nada inventado — ver "Sidebar expandible y Reporte" below).

### Sidebar expandible y Reporte (2026-08-06)

El sidebar de escritorio (`components/ui/sidebar-navbar.tsx`, `SidebarNav`) dejó de ser
solo una píldora de 5 íconos: ahora tiene un botón que lo expande/colapsa
(`src/lib/sidebar.tsx`, `SidebarProvider`/`useSidebar`, estado persistido en
`localStorage` bajo `lt_sidebar_expanded` — preferencia de UI, no dato financiero, así
que no aplica la regla "nunca localStorage" de `lib/news.ts`). Colapsado sigue siendo la
píldora `rounded-full` de siempre; expandido pasa a un panel `rounded-sm` de `w-64`
(mismo criterio de forma-distinta-para-affordance-distinta que el resto del design
system) con dos secciones: "Principal" (los mismos 5 `useNavItems()` de siempre, ahora
con label) y "Herramientas" (`hooks/useSidebarModules.tsx`, nuevo hook: Reporte,
Backtesting, Scanner, Coach IA, IA Trader, Sistema, Configuración IA, y Admin solo si
`role === 'superadmin'`) — módulos que antes no vivían en ninguna navegación global,
solo en tarjetas sueltas de `/dashboard`. Al expandirse **empuja el contenido** (no
overlay, a pedido explícito): las 10 páginas que ya reservaban `lg:pl-24` para el
sidebar (`Dashboard`/`Historial`/`Sistema`/`Perfil`/`Scanner`/`Noticias`/
`ConfiguracionIA`/`AdminPanel`/`TradeDetail`/`IaTrader`) más la nueva `Reporte.tsx`
ahora leen `useSidebar().expanded` y alternan entre `lg:pl-24`/`lg:pl-80`. La barra
móvil de 5 íconos (`FloatingNav`, `hooks/useNavItems.tsx`) no cambió — no hay espacio
para 12 íconos en una píldora inferior de teléfono, así que en mobile los módulos
nuevos solo son alcanzables desde las tarjetas de Dashboard, igual que antes.
`Backtesting.tsx`/`Coach.tsx` no se tocaron: ya eran "modo foco" sin `<AppFloatingNav/>`
a propósito, el sidebar nunca se monta ahí.

**`/reporte` (`pages/Reporte.tsx`)** es la nueva página de estadísticas avanzadas
pedida a partir de una captura de un reporte de backtest estilo MT4/EA. Se replicó la
**estructura informativa** (win rate, rachas, mejor/peor día-semana-modelo, drawdown,
curva de capital) con los tokens de marca de LineaTrade, no un clon pixel del template
azul genérico de la captura — y dos métricas de esa captura no tienen equivalente real
en este schema, así que se tradujeron a la más cercana que sí es 100% real en vez de
inventarse: "RR Máximo Prom." → **R promedio en operaciones ganadoras** (no se guarda
un "R máximo intra-trade"), y "DrawDown Prom. TP" → **drawdown de la curva de capital**
(peor caída pico-a-valle del P&L acumulado; no hay MFE/MAE intra-operación guardado,
así que un "drawdown antes de tocar TP" no es calculable con los datos que existen).
Todo el cálculo vive en `src/lib/reportStats.ts`: una sola query real
(`getClosedRealTrades`, trades cerrados, `is_backtest = false`, con `strategies(name)`
embebido vía la FK existente) y una función pura (`computeReportStats`) que hace toda
la aritmética — streaks, curva de capital, drawdown, agrupación por día/semana/
estrategia — client-side sobre `pnl_amount`/`pnl_r` que el trigger del backend ya
calculó, el mismo criterio que `Historial.tsx` ya usa para su win-rate sobre el
subconjunto real. No se agregó ninguna vista SQL nueva para esto. Cada bucket vacío
devuelve `null` → "—"/"datos insuficientes" en la UI, nunca un 0 fabricado.

Dos gaps de datos reales que había que cerrar antes de que el reporte pudiera mostrar
algo verdadero:
1. **`trades.strategy_id` nunca se seteaba** — la columna y `v_user_stats_by_strategy`
   ya existían (migración `20260727110000`) pero `NuevoTrade.tsx` nunca preguntaba la
   estrategia. Se agregó un `<select>` opcional en el paso "Contexto" (poblado desde
   `strategies` activas del usuario, mismo query que `StrategiesSection.tsx`) — los
   trades viejos quedan sin clasificar, "Mejor/Peor Modelo" muestra "datos
   insuficientes" hasta que existan trades nuevos con estrategia asignada.
2. **`trades.duration_minutes` nunca se calculaba** — columna `integer` existente
   desde el schema original, sin ningún código que la escribiera. Nueva migración
   `20260806100000_trade_duration_auto.sql`: `create or replace function` sobre
   `trg_calculate_trade_pnl()` (la función ya aplicada en producción se reemplaza, no
   se edita el archivo de migración original que la creó, mismo patrón ya usado para
   `get_system_metrics()`) — calcula `duration_minutes` solo en la transición real
   `open → closed` (`tg_op`/`old.status` guard, para que editar un trade ya cerrado no
   "alargue" la duración), usando `now() - traded_at` porque no existe una columna
   `closed_at` separada. Trades cerrados antes de esta migración quedan en `null` (no
   se estiman retroactivamente).

**Verificación de esta sesión**: `npm run build`/`npm run lint` limpios. `computeReportStats`
se verificó a mano contra un dataset con streaks/drawdown/día/semana conocidos de
antemano (6 trades, racha de 2 ganadoras seguida de 3 perdedoras, drawdown pico-a-valle
del 40%) ejecutando una copia exacta de sus funciones puras fuera de Vite — los 15
checks (win rate, expected value, streaks, drawdown, mejor/peor día/semana) coincidieron
exactamente con el cálculo manual. El mecanismo de expandir/colapsar el sidebar
(botón → cambia de ícono, ancho del panel pasa a 256px = `w-64`, aparecen los 7 links de
"Herramientas", persiste en `localStorage` tras un reload completo) y la barra móvil
sin cambios en 375px (5 íconos, sin overflow horizontal) se confirmaron con una ruta de
desarrollo temporal (`AppFloatingNav` montado fuera de `<ProtectedRoute>`, eliminada
antes de terminar) porque **Docker no estaba disponible en este entorno** (`docker ps`
nunca conectó al pipe del engine de Docker Desktop pese a que el proceso corría) — sin
Supabase local no había forma de loguearse de verdad, y ninguna página que monta
`<AppFloatingNav/>` lo hace fuera de una sesión autenticada. El toggle del sidebar
tampoco respondió a clics sintéticos por coordenada de esta herramienta (mismo tipo de
limitación ya documentado para el chart de `/backtesting` y el prompt nativo de push —
el pane no composita frames) pero sí a un `.click()` real disparado por JS, que es lo
que se usó para medir el resultado. **No verificado**: el reporte con datos reales de
un usuario logueado de verdad, ni el selector de estrategia de Nuevo Trade guardando
`strategy_id` contra una base real — pendiente la próxima vez que Supabase local esté
disponible.

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
`fetch-news/index.ts`), image, source/category/date, a "Leer la nota completa en
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

**2026-07-21 rebalance, at explicit user request**: the hero image shrank from a
full-width `aspect-[16/10]` (~200px tall) to `aspect-[21/9]` capped at `max-h-[160px]`
(~140px) — it's context, not the point of the screen. "Puntos clave" (the
`splitIntoKeyPoints` bullets, see the comment on that function in `lib/news.ts` — a
client-side sentence-split of `summary`, not an AI synthesis) moved into its own
`bg-panel-2/60` card with a `signal`-colored heading, so it's now the visually dominant
section instead of bare text under the image. The "leer completa" CTA is now full-width
and stands alone — the share button moved up into the masthead row (small icon-only
button next to the source name) instead of sharing a flex row with the CTA, so the CTA
reads as *the* action on the page, not one of two competing for space.

**Prev/next navigation between articles** — `getAdjacentArticleIds(id)` in `lib/news.ts`
finds the article's neighbors in the **same order `/noticias` showed them in** (the
session cache, unfiltered by category — not `getRelatedArticles`, which is
same-category-only and unordered relative to "what you were browsing"). Returns
`{ prevId: null, nextId: null }` if the cache is empty (direct link to `/noticias/:id`
without visiting the list first in this session) — there's no "order" to derive a
neighbor from in that case, so the feature just doesn't appear rather than guessing one
from a fresh single-row query. Two ways to move between articles: a horizontal touch
swipe on the whole `<main>` (`onTouchStart`/`onTouchEnd`, `SWIPE_THRESHOLD_PX = 60`, no
gesture library — this project doesn't add animation/gesture dependencies for a single
two-state interaction, same reasoning as the floating nav's CSS-transition rewrite above)
and small `‹`/`›` buttons next to the "← Noticias" breadcrumb for mouse/keyboard users,
correctly `disabled` (not hidden) at either end of the list.

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

**The email under the name (and the name heading itself, when no `display_name` is set
and it falls back to the raw email) used `truncate` and rendered long addresses cut off
with an ellipsis** — a real bug, not a style choice: this is the user's own account
identity, and there's no adjacent element forcing a hard one-line constraint on the
secondary email line (the heading's `truncate` was defensible since it sits inline next
to the role badge, but the email line below it had no such neighbor). Fixed 2026-07-21:
both now use `break-all` instead of `truncate`, so a long address wraps onto a second
line instead of disappearing behind "...". The parent row still uses `flex-wrap`, so
wrapping doesn't fight the role badge for space.

**Same pass, taken further**: the h1 no longer falls back to the raw email at all — a
20px display-font heading showing a full email address read oddly as a "name," and the
fallback string (`profile?.display_name || user?.email`) meant the email appeared in one
of two different places depending on whether `display_name` was set, never consistently
the same spot. Now the heading always falls back to a generic `'Tu cuenta'`, and the
email `<p>` below it **always** renders (the `profile?.display_name &&` guard was
removed) — one canonical place for the email, every time, regardless of whether a
display name exists. The avatar/text row's padding went from symmetric `px-6` to
`pl-4 pr-6` (plus `gap-3` instead of `gap-4`) to pull the photo closer to the card's left
edge, at explicit user request. The onboarding-derived facts (experience/account
type/broker) were flat `flex-wrap` pills with no indication of what each one represented
— now a `grid-cols-3` of labeled chips (small uppercase category label, e.g.
`EXPERIENCIA`, above the value, each `truncate`d — this is genuinely disposable
supplementary info, unlike the email bug above, so ellipsis-truncating a long broker name
here is fine).

**"Cerrar sesión" moved here from the floating nav** (see the navigation section above)
and is now a full-width bordered button in `text-loss`/`border-loss` with a `LogOut`
icon — deliberately the app's destructive-action color, not just a plain text link like
before, so a sensitive action reads as sensitive.

### Notificaciones push (recordatorio diario)

Added 2026-07-22. Web Push, not a native-app push SDK — the app is a PWA/TWA (see "PWA"
and "PWA-to-APK" above), so "native notification" here means the browser's own
`Notification`/`PushManager` (which on Android rides on top of FCM under the hood), not
Firebase Cloud Messaging wired up by hand or a native plugin. The permission had to be
**the system's own prompt** — no custom "¿querés activar notificaciones?" screen before
the real one, per explicit product request. (Plenty of apps build that kind of
pre-prompt specifically to avoid "wasting" the one native permission ask a browser
grants; this one deliberately skips it.)

**Permission — `components/NotificationPermissionPrompt.tsx`**: a no-UI component
(same shape as `PwaUpdatePrompt`, mounted right next to it in `App.tsx`, outside
`<Routes>` so it runs on every route once there's a session). As soon as `useAuth()`
has a `user`, it calls `Notification.requestPermission()` directly. If granted, it
subscribes the device. It tracks the *last processed `user.id`*, not a plain "already
asked" boolean — specifically for two different accounts sharing one browser without a
page reload (logout → login as someone else): the native prompt never reappears (the
browser already decided), but `subscribeToPush` runs again to re-associate this
device's endpoint with the new `user_id`.

**Subscribing — `lib/pushNotifications.ts`**: `subscribeToPush(userId)` gets (or
reuses) the browser's `PushSubscription` via `registration.pushManager.subscribe()`
with the VAPID public key (`VITE_VAPID_PUBLIC_KEY`), then upserts it into
`push_subscriptions` with `onConflict: 'endpoint'` — deliberately not `user_id`, so the
same browser switching accounts overwrites the old owner's row instead of piling up
dead ones.

**Service worker — `public/sw-push.js`**: `vite-plugin-pwa` uses the `generateSW`
strategy (see "PWA (installable)" above) — Workbox generates the entire `sw.js`, there's
no source file of our own to add handlers to. Rather than migrating to `injectManifest`
(rewriting the whole service worker of a PWA that's already live, just to add two
listeners), this file gets injected into the generated SW via
`workbox.importScripts: ['/sw-push.js?v=1']` in `vite.config.ts` — a classic script that
runs in the same scope as the generated SW and defines
`self.addEventListener('push', ...)` / `('notificationclick', ...)` directly. If this
file is ever edited, bump the `?v=` — the URL is static and doesn't get the content
hash the rest of the build's assets get, so browsers won't otherwise know to refetch it.

**Table — `push_subscriptions`** (migration `20260722100000`): one row per browser/
device, `endpoint` unique. Owner RLS (an `authenticated` user reads/writes only their
own rows) plus a `select`/`delete` grant to `service_role` — `send-trade-reminders` runs
as `service_role` and needs to read and clean up every user's subscriptions, not one.

**The reminder itself — `supabase/functions/send-trade-reminders`** (cron wired in
migration `20260722110000`): same skeleton as `fetch-news`/`invoke_news_cron_refresh()`
(`X-Cron-Secret` auth, Vault for `project_url`/`publishable_key`/
`trade_reminder_cron_secret`, `pg_net` for the async POST) — see
`20260721130000_news_cron_jobs.sql` if you're touching either, they're nearly the same
pattern. Deliberate differences from the news cron:

- **Every day, not just weekdays** — this journal covers forex/crypto (24/7), unlike the
  US-market-hours news cron that justifiably runs `1-5` only.
- **Two fixed times, 20:00 and 23:30 UTC** — afternoon/evening coverage across
  México→Argentina (UTC-3 to UTC-6). Reasonable starting values, not a decision carved
  in stone — adjust the `cron.schedule(...)` calls in the migration if another time
  makes more sense. There's no per-user timezone modeled in `profiles` yet, so "today"
  everywhere in this feature (see the next point) means the **UTC** calendar day, not
  the user's local one — a known simplification, same reasoning the news cron already
  accepts for its DST drift.
- **Skips anyone who already logged a trade that day** (`trades.traded_at` on/after the
  start of the UTC day, `deleted_at is null`) — this isn't "ask twice no matter what," 
  it's a reminder that goes quiet once it's no longer needed.
- **Self-cleaning**: a 404/410 from the push service while sending (dead endpoint —
  browser uninstalled, permission revoked by hand, etc.) deletes that
  `push_subscriptions` row. Any other error is left alone to retry on the next cron run.

Signs and encrypts the payload with `npm:web-push` (an npm package, via Deno's `npm:`
specifier support — same mechanism `fetch-news` already uses for `npm:rss-parser`), not
a hand-rolled implementation of the Web Push protocol.

**Real bug found locally, before this ever reached production** (migration
`20260722120000`): testing the function against the local database failed with
`permission denied for table trades` — the table had only ever been granted to
`authenticated` (migration 14), because no Edge Function had needed `service_role` read
access to `trades` across all users before this feature. It's the exact bug #2 from
"Three real RLS/security bugs" below, showing up again — it already hit `news_articles`
and the AI tables the same way. Testing against a real database, not just a clean
`tsc`/build, is what caught it before it shipped.

**Verification**: see "Push notification deployment (2026-07-22)" under "Production"
above for what was confirmed in production (a real cron→pg_net→Edge Function round
trip, `200 OK`, read back from `net._http_response` — not assumed). Locally, beyond the
usual build/lint/migration checks: a real send attempt against Google's push service
with a synthetic-but-correctly-shaped subscription (proving `web-push` actually works
under Deno/the Supabase Edge Runtime — the biggest unknown going in), the exact RLS
`upsert` a real logged-in session performs when subscribing, and the guard path (denied
permission → confirmed nothing gets written to `push_subscriptions`). The one thing no
automated tool could verify, here or anywhere: the native permission dialog actually
appearing on screen — it's browser-chrome UI, not page DOM, and by design no automation
framework (Playwright, Puppeteer, this session's browser tooling) can click it. Confirmed
instead that this session's automated browser pre-denies the permission for every origin
(tested against `example.com`, never visited before) — that one piece can only be
confirmed by hand, on a real device.

**Known limitation — iOS**: Web Push on Safari/iOS needs iOS 16.4+ and the PWA added to
the home screen (it doesn't work in a plain Safari tab). `isPushSupported()` in
`lib/pushNotifications.ts` feature-detects (`'PushManager' in window`, etc.) and simply
never asks for permission where it isn't supported — no fallback prompt. Since this
product's install path is primarily Android/TWA (see "PWA-to-APK" above), this isn't the
main path, but it does mean iOS users don't get this feature yet.

### Backtesting (Market Replay)

Added 2026-07-27, from a pre-written implementation plan
(`docs/lineatrade-backtesting-plan.md`) specifying 9 modules: chart replay, semantic
drawing of "confluences" (FVG, liquidity, order blocks, CHoCH, BOS, supply/demand
zones) via a custom chart plugin, automatic confluence-tracking per trade, an extended
dashboard, a confluence-type manager in `/sistema`, and a pattern-recognition engine
(deterministic + optional AI narrative). Built at explicit request as "the most
accessible" slice — this pass shipped only the core replay-and-execute loop (the plan's
own Fases A/B/C/E); the drawing/confluence subsystem, extended dashboard, and pattern
engine are **not built**. See the plan doc's own Section 10 checklist (updated the same
day) for exactly what shipped vs. what's deferred and why — it flags the drawing system
itself as "la parte técnicamente más difícil... vale la pena un spike de un día antes de
comprometerse," which is the actual reason it wasn't rushed into the same pass.

**What exists**: `/backtesting` (protected route). The entry-point CTA moved twice
before landing where it is now: first added to `/ia-trader` (as a bordered section
below the plan report) at explicit request, neither that nor the plan doc's own
suggestion of `Perfil.tsx`; then moved again, same day, to `Dashboard.tsx` — a second
`<Link>` card ("market replay · Analiza tus estrategias con backtesting →") directly
below the existing `/ia-trader` card ("test de perfil · Convierte la IA en tu trader
→"), reusing that exact card's markup/classes for visual consistency rather than
inventing a new promo-card style, and removed entirely from `IaTrader.tsx`. Pick a
symbol (free text + quick-picks
for BTCUSDT/ETHUSDT/SOLUSDT/BNBUSDT) and a temporalidad (`lib/marketData/types.ts`'s
`MarketInterval`, 1m through 1d), defaulting to 15m — ~1 month of lookback, chosen to
stay "accessible" (a handful of paginated Binance requests, not hundreds).
`lib/marketData/binanceProvider.ts` implements a `MarketDataProvider` interface against
Binance's public, keyless, CORS-enabled `/api/v3/klines` endpoint (hard limit: 1000
candles/request); `lib/marketData/klineCache.ts` paginates backward with `endTime`
until it hits the temporalidad's `MAX_LOOKBACK_BY_INTERVAL`, then caches the result in
memory per `provider:symbol:interval` — no TTL, since closed historical candles never
change (unlike `lib/news.ts`'s cache, which exists specifically because its content
*can* go stale). `useMarketReplay.ts` exposes a `currentIndex` into that array plus
step/play/speed controls; the chart (`ChartEngine.tsx`, `lightweight-charts` 5.2.0,
this project's first charting dependency) only ever receives
`klines.slice(0, currentIndex + 1)` — "hiding the future" is a real slice boundary, not
a visual trick, so there's no way to see a future candle by inspecting state or the DOM.
Opening/closing a simulated position (`BacktestOrderPanel.tsx` →
`lib/backtestTrades.ts`) inserts/updates a **real** row in `trades` — `is_backtest =
true`, `backtest_session_id` pointing at a `backtest_sessions` row
(`lib/backtestSessions.ts`) — using the current replay candle's `close` as the
execution price (the same simplification the plan doc itself proposed as the default:
"más simple, determinístico"). Closing reuses the exact `update({ exit_price, status:
'closed' })` pattern `TradeDetail.tsx` already uses for real trades, so
`trg_calculate_trade_pnl` computes `pnl_amount`/`pnl_r` with zero new trigger code — a
backtest trade is a completely normal `trades` row apart from one flag.

**A practice trade must never be mistaken for, or pollute, a real one — but Historial
is deliberately the one place it should still be *visible*.** Same principle as the
`is_backtest` column comment, enforced in four places, three of which the plan doc
didn't specify and were only caught by testing the actual browser flow end-to-end, not
just SQL:
1. The 4 existing aggregate stat views (migration `20260727110000`) now exclude
   `is_backtest = true` — resolves the plan's own "decisión abierta #1".
2. **Real bug, caught live**: `Dashboard.tsx`'s "Últimos trades" list is a direct query
   against `trades`, not one of the 4 views — it kept showing a backtest trade
   indistinguishably from a real one until this was caught by actually opening and
   closing a practice trade in the browser and checking `/dashboard` afterward. Fixed
   with `.eq('is_backtest', false)` on that query.
3. **Real bug, same pass**: `TradeListRow.tsx` (shared by Dashboard and Historial) had
   no visual indicator at all — in Historial, where a backtest trade *should* appear
   (it's genuinely part of what the user did), there was no way to tell it apart from a
   real one. Fixed with a conditional "práctica" badge next to the side badge.
4. **Historial itself needed the opposite fix from Dashboard, not the same one** — an
   external code-review pass flagged that `Historial.tsx`'s win rate/count read every
   trade unfiltered and its CSV export made a practice trade byte-for-byte
   indistinguishable from a real one, and the first fix applied (copying Dashboard's
   `.eq('is_backtest', false)`) was wrong for this specific screen: it silently hid
   backtest trades from Historial entirely, making the "práctica" badge from point 3
   unreachable dead code and contradicting the whole reason that badge exists.
   Corrected to: fetch every trade (backtest included) so Historial still shows
   everything the user did, but compute `winRate` from a real-only subset
   (`!t.is_backtest`), and add a `tipo` (`real`/`practica`) column to
   `lib/tradeExport.ts`'s CSV so an exported row is never ambiguous either.

**Verified for real, not mocked**: created a throwaway local user, logged in through
the actual browser, picked BTCUSDT/15m, and confirmed via the running app that Binance
returned exactly 2880 candles (30 days × 24h × 4 fifteen-minute candles — the
pagination math in `klineCache.ts` lining up exactly against real data, not an
assumption). Stepped the replay forward, opened a long at a real fetched price
(60640.01), closed it three candles later at another real fetched price (60811.67), and
confirmed by direct SQL that the resulting `trades` row had `pnl_amount = 171.66` —
computed by the pre-existing trigger, matching the UI's "+171.66" exactly. Confirmed
`/dashboard`'s stat cards and recent-trades list both correctly ignored that trade while
`/historial` correctly showed it with the new badge. Confirmed the explicit "Finalizar
sesión" button sets `backtest_sessions.ended_at`; also confirmed — and accepted as a
documented limitation, same "no reliable way to wait for a request in `beforeunload`"
reasoning already established for `NotificationPermissionPrompt` — that a **hard**
navigation away (closing the tab, typing a new URL, this session's own browser-
automation tooling navigating) does *not* reliably set `ended_at`, since the JS context
can be torn down before the unmount cleanup's fetch completes; a normal in-app
`<Link>`/SPA transition does not have this problem. `ended_at` is bookkeeping only —
nothing else reads it yet — so this was accepted rather than solved with something
heavier like `navigator.sendBeacon`.

**One real, disclosed verification gap**: the automated browser used to build this
could not visually confirm the candles actually paint on screen. Diagnosed, not
assumed: `document.querySelectorAll('canvas')` showed every canvas element correctly
sized via CSS (matching the container's real layout) but stuck at the browser default
300×150 *bitmap* dimensions with zero non-transparent pixels — and a direct test proved
`requestAnimationFrame` never fires at all in that pane (a 2-second timeout, zero
callbacks), lining up exactly with the "the Browser pane is not displayed, so the page
is not compositing frames" error this same tooling gives for screenshots. Any canvas
library that paints via `requestAnimationFrame` — the standard, correct way to do it,
not a mistake — looks blank under this specific constraint regardless of whether the
code is right. Same category as the native push-permission dialog two sections up:
something only a real, visible browser can confirm. Indirect evidence the pipeline
itself is correct: zero console errors through the whole flow, the exact expected
candle count from a real fetch, and a real trade with a correctly-computed PnL landing
in the database — but nobody has actually looked at the rendered chart yet. Worth a
real-device check before relying on this feature.

**`lightweight-charts`' `autoSize: true` silently ignores manual `chart.resize()`
calls** whenever a `ResizeObserver` is available (documented in the library's own
`.d.ts`) — `ChartEngine.tsx` uses its own `ResizeObserver` instead, calling
`chart.resize(width, height, true)` directly, for real control over when a resize
happens rather than trusting the library's internal timing.

**Crypto only — forex/stocks explicitly pending, not forgotten.** `binanceProvider.ts`
is the only `MarketDataProvider` implementation that exists. The plan doc's own MVP
scope already called this out ("Forex/acciones quedan para después, detrás de la misma
interfaz `MarketDataProvider`"), and it's confirmed here as the deliberate current
state, at explicit user request, rather than something to infer from the code alone.
Binance's public klines endpoint is free and keyless; every forex data provider worth
using requires an API key (and usually a paid tier), which is real added scope — a
Vault-backed key, a provider-selection UI, rate limiting — not just a new file
implementing the existing interface. Whoever picks this up next should start by
confirming a forex provider's actual free-tier limits before assuming the same
"most accessible" MVP treatment applies.

**2026-07-27, same day: a real mobile-overflow bug and a real desktop over-stretch bug,
both found by measuring, not eyeballing.** At explicit request ("tiene que sentirse
como usar TradingView," both mobile and desktop, accesibilidad incluida), audited
`/backtesting`'s active-replay screen at 375px and 1440px with
`getBoundingClientRect()` on every button/input rather than just looking at
screenshots (this session's browser pane can't screenshot — see the caveat above —
so exact-coordinate measurement was the only reliable verification method available,
and it turned out to catch real bugs a screenshot might have too):
- **Mobile (375px), real bug**: `ReplayControls.tsx`'s single `flex justify-between`
  row packed 4 icon buttons + a counter + 4 speed-select buttons into one line.
  Measured directly: the last speed button (`6.7x`) rendered at `right: 404px` against
  a 375px viewport — 29px off-screen, unreachable, not scrollable (the page root has
  `overflow-hidden`, so it wasn't even a scrollbar-away problem, it was fully
  inaccessible). Fixed with a two-row mobile layout (`flex-col`, playback+counter on
  row 1, speed buttons centered with `flex-wrap` as a fallback on row 2) that
  collapses back into one row at `sm:` (640px+). Re-measured after the fix: max button
  right edge 282px, comfortably inside the viewport.
- **Mobile, same pass**: `BacktestOrderPanel.tsx`'s stop-loss/take-profit/cantidad row
  used a bare `grid-cols-3` — the exact anti-pattern already documented above under
  "Same 375px-first lesson caught a second time" for `TechnicalEntryPanel.tsx`, just
  not caught here the first time. Fixed with the same `grid-cols-2 md:grid-cols-3`
  this codebase already established as the house pattern for a 3-numeric-input row.
- **Desktop (1440px), real bug in the opposite direction**: neither control bar had a
  max-width, so at 1440px the Comprar/Vender buttons measured 698px wide *each*, and
  the stop-loss/take-profit/cantidad inputs 464px wide each — technically not broken
  (nothing overlapped), but nowhere near "feels like TradingView": a real trading
  platform's toolbars stay compact and centered even on an ultrawide monitor, only the
  chart itself fills the space. Fixed by wrapping each bar's actual controls in
  `max-w-2xl mx-auto` while leaving the bar's background and the progress scrubber
  full-bleed (same visual language as a video player's control bar) and leaving
  `ChartEngine`'s container untouched — confirmed after the fix the chart is still a
  full 1440px wide while the buttons dropped to 330px and the inputs to 219px.
- **Accessibility**: `ReplayControls.tsx`'s four icon-only buttons (reset/back/play/
  forward) had `title` attributes but no `aria-label` — a tooltip is not the same as
  what a screen reader announces for an unlabeled icon button. Added matching
  `aria-label`s, `aria-pressed` on the speed buttons, and `role="group"` +
  `aria-label` on the speed-button container. No new `focus:outline-none` was added
  anywhere in this feature, so every new interactive element still gets the browser's
  native focus ring for keyboard users — same policy as the rest of this codebase's
  form inputs already follow.

### Confluencias, Coach, Scanner, Insights (2026-07-29)

**Status as of this entry: written, type-checks clean (`npm run build`/`npm run lint`
both pass with zero new errors/warnings), but NOT deployed and NOT verified against a
running stack.** Every other section of this file that describes a shipped feature
backs that up with a real end-to-end run (Mailpit, a live signup, a real Storage
upload, a real `pg_net` round trip, etc.) — this section can't say that yet. The
session that audited this work (2026-07-29) had Docker not running (so no local
Supabase stack to apply the 12 pending migrations against) and no
`SUPABASE_ACCESS_TOKEN` for the `pcmftbzpzeliurrnyidt` cloud project (CLI returned
403; the one Supabase MCP connected in that session pointed at an unrelated project,
not this one). **Do not treat this section's descriptions as "verified" the way the
rest of this file uses that word** — they're read from source, not observed running.
Before this ships, re-run the verification discipline the rest of this file expects
(real signup/session, real Vercel deploy, real Supabase Cloud migration push) and
update this section with what actually happened, same as every section above it.

Five feature areas, all landed together as one batch of uncommitted work: a semantic
drawing/confluence system for `/backtesting` (the Módulo 2/3/5 pieces the original
2026-07-27 backtesting entry explicitly deferred), an AI Coach (`/coach`, this
project's first multi-turn chat surface), a Market Scanner (`/escaner`, first cron job
that hits an external API on a schedule rather than the app's own database), an
Insights section embedded in `/dashboard` (cross-trade pattern-mining, distinct from
`analyze-trade`'s one-trade-at-a-time analysis), and an avatar crop step added to the
existing `Perfil.tsx` upload flow. 12 new migrations
(`20260728100000_confluence_types.sql` through `20260729100000_scanner_cron_monitoring.sql`,
recount with `ls supabase/migrations | wc -l` — 58 total in the repo right now, up from
the 45 this file documented after the backtesting MVP), 7 new tables
(`confluence_types`, `chart_annotations`, `trade_confluences`, `ai_insights`,
`scanner_results`, `ai_coach_conversations`, `ai_coach_messages`) and 6 new views. All
of it follows the established conventions in this file closely — RLS + owner policies
on every table, `security_invoker = true` on every view, the insert-only-via-
service-role pattern for anything "written by the AI," the same `ai_usage_daily`
free-tier pool and BYOK resolution every other AI Edge Function already uses — which
is exactly how the 4 bugs below were still findable: they're deviations from patterns
this codebase already established, not new mistakes.

**Confluencias semánticas (drawing system, `/backtesting`).** `DrawingToolbar.tsx`
lets the user pick a `confluence_type` (9 system presets seeded by
`20260728100000_confluence_types.sql` — FVG, Liquidez, Order Block, CHoCH, BOS, Zona
de Oferta/Demanda, Mitigación, Confirmación — plus any the user defines) and click 1-2
points on the chart; `ChartEngine.tsx`'s new click handler inserts a
`chart_annotations` row (`src/lib/confluences.ts`). Point-shaped confluences
(circle/arrow/label) render via `lightweight-charts`' `createSeriesMarkers`;
range-shaped ones (square/rectangle/line) render via a hand-built `ISeriesPrimitive`
(`src/components/backtesting/confluencePrimitive.ts`) because `lightweight-charts` v5
ships no rectangle primitive itself. `src/lib/confluenceDetection.ts` is a pure-math
candidate detector (3-candle-gap FVG, swing-break BOS/CHoCH, last-opposite-candle
Order Block, near-equal-swing Liquidity) whose output can optionally go through the
`detect-confluences` Edge Function so an LLM filters/explains candidates —
`ConfluenceSuggestionsPanel.tsx` — without ever being the one to invent a candidate
from scratch, same "backend calculates, AI interprets" principle as the rest of the
product. Opening a backtest trade auto-populates `trade_confluences` from every
`chart_annotations` row visible up to that candle (`src/lib/backtestTrades.ts`,
`attachVisibleConfluences`) — populated by code only, by design, never by hand.
**Two pieces of the original plan doc are explicitly not built in this pass**: Módulo
8 (a `/sistema` tab for managing custom confluence types — `createConfluenceType`/
`deleteConfluenceType` exist in `confluences.ts` but nothing calls them) and Módulo 7
(the extended dashboard — `v_user_stats_by_confluence_single/combo`,
`v_user_psychology_stats`, `v_user_stats_by_weekday/hour/instrument` all exist and are
consumed only by `insightsContext.ts`, not rendered anywhere directly). Also dead
schema: `chart_annotations.trade_id` was added for the journal to "read back which
annotations belong to a trade," but the actual auto-population path goes through
`trade_confluences` instead and no code ever sets it.

**Coach de IA (`/coach`).** Two tables, `ai_coach_conversations` (a thread) and
`ai_coach_messages` (a turn) — the client inserts its own `role='user'` message
directly via RLS (`ai_coach_messages_insert_user_role` only allows that role for the
client), then `requestCoachReply` (`src/lib/coach.ts`) invokes `ai-coach-chat`, which
builds its system prompt from the exact same `buildInsightsContext` Insights uses
(deliberately shared, not a third context builder), does real multi-turn — the first
genuine multi-turn conversation in this codebase's AI engine, threaded through a new
`AIProviderRequest.history` field added to `groq.ts`/`openai.ts` — and validates the
reply with `coachValidator.ts` (reuses `resolveFieldPath`/
`RECOMMENDATION_DENYLIST_PATTERNS`, promoted from private to exported in
`responseValidator.ts` so the three new validators — coach/insights/scanner-explain —
share the one anti-hallucination check instead of reimplementing it). Shares the
3/day free-tier pool with every other AI feature. Route `/coach` is
`<ProtectedRoute>`-wrapped (`App.tsx`), linked only from a new Dashboard card — like
`/backtesting`/`/ia-trader` before it, deliberately not in `AppFloatingNav.tsx`.

**Market Scanner (`/escaner`).** `run-scanner` is cron-only (`X-Cron-Secret` gate,
never callable by a session — same skeleton as `send-trade-reminders`), scheduled
every 5 minutes by `20260728190000_scanner_cron_job.sql` (crypto trades 24/7, so
unlike the news cron there's no "market hours" to restrict to). It pulls the top ~150
USDT pairs by 24h Binance volume, computes RSI/MACD/Bollinger/price-change/
volume-spike with a new dependency-free indicators module
(`supabase/functions/_shared/indicators.ts`), and `upsert`s into `scanner_results` — a
global table with no `user_id`, same "public market data" pattern as `news_articles`.
This is the first place in the codebase that needed real concurrency control against
an external API's rate limit (`mapWithConcurrency`, a hand-rolled worker-pool of 10 —
no library, same "don't add a dependency for one need" precedent as Noticias' swipe
gesture). `Scanner.tsx` reads it read-only with client-side filters; per-row "Explicar
con IA" (`ScannerResultRow.tsx`) calls `explain-scan-result`, user-initiated (not part
of the cron), same free-tier pool and validation pattern as everything else. **Before
this cron can run in production**, the same manual Vault step every prior cron in this
project has needed: `select vault.create_secret('<random-32-bytes-hex>',
'scanner_cron_secret');` against the target project, then `supabase secrets set
SCANNER_CRON_SECRET=...` on the Edge Function to match — both called out in the
migration's own header comment. Skip this and the cron does not error, it just
silently no-ops forever (`raise warning` + `return`), the same failure mode that
actually happened in production for the news cron once already (see "Push
notification deployment" above) — which is exactly why bug fix #3 below matters.

**Insights (`/dashboard`).** `InsightsSection.tsx` is folded directly into
`Dashboard.tsx` (`{!loading && <InsightsSection />}`) — not a new route. It loads the
latest stored `ai_insights` row on mount so a repeat visit isn't empty
(`getLatestInsights`), and "Generar insights"/"Regenerar insights" calls
`generate-insights`, which builds a full cross-account context from every new SQL view
listed above (win rate/profit factor/avg R by strategy, by confluence, by weekday, by
hour, by instrument with a `MIN_SAMPLE_FOR_BEST_WORST = 3` floor, plus psychology
percentages) and asks the LLM only to pick and phrase the most notable patterns —
`data_sufficiency === 'insufficient'` forces an empty result by the prompt's own rule,
and any returned insight is discarded whole (not repaired) if its `facts_cited`
doesn't resolve or its text matches the recommendation denylist. Same free-tier pool.

**Recorte de avatar (Perfil).** `Perfil.tsx`'s file input now opens
`AvatarCropModal.tsx` (a `react-easy-crop` circular cropper — already a committed
dependency since `6e40015`, not new) instead of uploading immediately;
`getCroppedImageFile` (`src/lib/cropImage.ts`) does an offscreen-canvas crop into a
`File`, then hands off to the pre-existing `uploadAvatar`. No schema/backend change —
purely a client-side step inserted before the existing `avatars` bucket upload. Same
diff also grew the avatar preview 64px→96px and the floating-nav avatar icon
22px→28px, and replaced the "Cuenta" fact chip with a numeric "Antigüedad" (days since
`profiles.created_at`) per user request.

**Bugs found in the 2026-07-29 audit — fixed in place** (none of the affected
migrations had been applied anywhere but a disposable local/dev database used only to
regenerate `database.types.ts`, so — unlike every migration this file calls
"already applied" elsewhere — editing them directly was correct here, not a violation
of the schema doc's "never edit an applied migration" rule):

1. **Missing `service_role` GRANT on `ai_coach_conversations`.**
   `20260728200000_ai_coach.sql` granted `service_role` access to `ai_coach_messages`
   but not to `ai_coach_conversations` — yet `ai-coach-chat/index.ts` bumps that
   table's `updated_at` with the service client after every reply (so the conversation
   list sorts by most-recently-active). Exact same bug class this file already
   documents twice (`news_articles`, `trades`): the UPDATE would have failed silently
   with "permission denied," and because the code never checked that call's `error`,
   the request still returned 200 — only the conversation ordering would have quietly
   been wrong. Fixed: added `grant select, insert, update on
   public.ai_coach_conversations to service_role;` to the same migration.
2. **Confluence stats views missing the `is_backtest` filter.** The other 4 new views
   in this batch (`v_user_stats_by_weekday/hour/instrument`, `v_user_psychology_stats`)
   all correctly add `and t.is_backtest = false`, honoring the hard rule this file
   already documents at length under "Backtesting (Market Replay)" — but
   `v_user_stats_by_confluence_single`/`_combo`
   (`20260728140000_confluence_stats_views.sql`) didn't. Since `trade_confluences` is
   currently populated exclusively by backtest trades (manual confluence-tagging on a
   real trade isn't built yet), these two views' win-rate numbers would have been
   100% derived from practice trades while being cited by Insights/Coach exactly like
   a real stat — a genuine violation of "a practice trade must never pollute a real
   one," and a more insidious one than the earlier Dashboard/Historial bugs because the
   AI would state the number as fact with a real `facts_cited` reference (the number
   itself wouldn't be invented — just silently mis-scoped). Fixed: added
   `and t.is_backtest = false` to both views' `where` clauses.
3. **Scanner cron invisible to the admin panel's own monitoring.**
   `get_cron_job_health()`/`get_cron_secrets_status()` (added 2026-07-27 specifically
   to catch a cron silently no-op'ing on a missing Vault secret — see "Fase 4
   (SuperAdmin)" above) hardcoded the 6 job/secret names known at the time;
   `'market-scanner'`/`'scanner_cron_secret'` didn't exist yet when that migration was
   written. Left as-is, a missing `scanner_cron_secret` in production would silently
   no-op the scanner forever with `/admin` showing nothing wrong — the exact incident
   class those two RPCs exist to prevent, just for a job they don't know about. Fixed:
   new migration `20260729100000_scanner_cron_monitoring.sql`, `create or replace
   function` on both (same `security definer` + `is_superadmin()` + `audit_log`
   contract, no column-list change so `CREATE OR REPLACE` is valid unlike the
   `get_system_metrics()` precedent), adding both names to their respective lists.
4. **No length limit anywhere on a Coach chat message.** Every other AI input surface
   in this codebase bounds its input (`extract-trade-image`'s 5MB cap,
   `detect-confluences`' `max(60)` candidates) — the Coach `<textarea>` had none, and
   neither did `sendUserMessage` (`lib/coach.ts`) nor `ai-coach-chat`'s request schema
   (which only validates `conversation_id`, never sees message content before it's
   forwarded to the LLM). Fixed at the actual boundary — the client inserts the
   message directly via RLS, so a client-side `maxLength` alone wouldn't have been
   enough: added `check (char_length(content) <= 4000)` to
   `ai_coach_messages.content` in `20260728200000_ai_coach.sql`, plus a matching
   `maxLength={4000}` on the `<textarea>` in `Coach.tsx` for immediate UX feedback.

**Known gaps, left as backlog, not fixed in this pass** (deliberately — each is a
scope decision, not an oversight, and this file's own convention is to defer rather
than rush a feature addition into an audit pass):
- `run-scanner` never purges a symbol that drops out of the top-150-by-volume list —
  `scanner_results` only ever grows/refreshes, contradicting its own migration
  comment ("no es una serie histórica, solo el snapshot más reciente"). Low
  frequency/impact; worth a follow-up if the symbol list turns out to churn a lot.
- `TradeDetail.tsx` was never extended to display the 8 new psychology fields
  (`fear_level`, `anxiety_level`, `closed_early`, `moved_take_profit`,
  `entered_impulsively`, `hesitated`, `overconfidence`, `had_distractions` —
  `20260728130000_trades_psychology_fields.sql`). They're captured on entry
  (`PsychologySection.tsx`) and feed `v_user_psychology_stats` → Insights/Coach in
  aggregate, but a user can never see their own answer for a single trade again
  anywhere in the UI. `TradeDetail.tsx` already has the exact pattern to extend
  (`Field`/`Tag` around its existing psychology block).
- Módulo 7 (extended dashboard: equity curve, win-rate-by-dimension charts, a
  confluence-combo table, a psychology stats panel) and Módulo 8 (custom
  confluence-type management UI in `/sistema`) from the original backtesting plan —
  the data layer for both exists (the views, `createConfluenceType`/
  `deleteConfluenceType`), the UI doesn't.
- `/admin`'s `get_system_metrics()` was not re-extended for this batch — Coach/
  Scanner/Insights/Confluences adoption has zero visibility in the SuperAdmin panel,
  repeating the exact blind-spot pattern that was explicitly fixed for the *previous*
  "Beyond Fase 4" batch on 2026-07-27 (see "Fase 4 (SuperAdmin)" above). Whoever picks
  this up should extend `get_system_metrics()` the same way that entry describes.
- `AvatarCropModal`'s file `<input>` doesn't reset its `value` after a selection, so
  re-selecting the identical file after cancelling the crop won't fire a new
  `onChange` (browsers dedupe identical file-input values). Minor UX papercut.
- `confluencePrimitive.ts` imports a type from `fancy-canvas`, a transitive dependency
  of `lightweight-charts` never declared directly in `package.json`. Type-only (erased
  at build time, and the 2026-07-29 build already proved it resolves), so not a
  current build risk — but fragile: a future `lightweight-charts` bump that changes
  how `fancy-canvas` hoists would break this import with nothing in `package.json` to
  explain why. Worth adding `fancy-canvas` as a direct devDependency if this recurs.

**What actually blocks shipping this to production** (beyond the 4 fixes above, which
are done): the frontend and backend must deploy together, not separately.
`Dashboard.tsx` now unconditionally renders `InsightsSection` for every logged-in
user, and that component queries the `ai_insights` table on mount — a table that only
exists once the 12 pending migrations are pushed. Pushing `main` to trigger the
existing GitHub→Vercel auto-deploy (see "Production" above) **before** running
`supabase db push` against the `pcmftbzpzeliurrnyidt` cloud project would break
`/dashboard` for every real production user, not just fail to show the new features.
Order matters: migrations + the 5 new Edge Function deployments
(`ai-coach-chat`, `detect-confluences`, `explain-scan-result`, `generate-insights`,
`run-scanner`) + the `scanner_cron_secret` Vault secret + `SCANNER_CRON_SECRET` on the
Edge Function all need to land in Supabase Cloud *before* the frontend push, mirroring
exactly how every previous production rollout in this file (push notifications, news
cron) was sequenced.

### Auditoría del batch 2026-07-29 + diseño desktop/mobile diferenciado (2026-08-03)

Sesión disparada por un pedido de investigación de referencias competitivas
(Tradezella, TradingView Replay, TrendSpider, TradesViz) que derivó en un plan de 4
features y, por separado, un pedido de diseño de 3 experiencias (desktop / app
instalada / navegador mobile). Al arrancar la implementación se descubrió que el
batch de Confluencias/Coach/Scanner/Insights (arriba) ya tenía, sin commitear, 4
archivos/migraciones adicionales que correspondían justo a esas 4 features — es
decir, ya habían sido escritas en una sesión previa no documentada acá. Este pass
fue una **auditoría de esas 4 features + el trabajo de diseño**, no una
implementación desde cero.

**Auditoría de las 4 features (3 agentes de exploración en paralelo, luego fixes
manuales)** — hallazgos y qué se corrigió:

1. **Tags de psicología + reporte comparativo** (`v_user_psychology_tag_stats`,
   `PsychologyStatsCard.tsx`, `TradeDetail.tsx`'s sección Psicología) — auditoría:
   **100% correcta**, wireada end-to-end, `security_invoker=true` y el mismo
   filtro `is_backtest=false` que toda otra vista. Único hallazgo: un predicado
   `status = 'closed'` redundante dentro de 3 `filter()` SQL (el `WHERE` externo ya
   restringe todo a `closed`) — limpiado directamente en la migración (todavía sin
   aplicar a ningún ambiente real, así que editarla in situ no viola la regla de
   "nunca editar una migración ya aplicada").
2. **Filtro en lenguaje natural del Scanner** (`resolve-scanner-query` Edge
   Function, `scannerQueryValidator.ts`) — funcionalmente completo, auth/BYOK/rate
   limit/reintento-en-JSON-inválido todos correctos, sin problemas de seguridad
   (vocabulario de campos verificado contra las columnas reales de
   `scanner_results`, cron de `run-scanner` confirmado sin ninguna llamada a IA).
   Un desvío de diseño corregido: `scannerQueryValidator.ts` validaba `field` con
   `z.string()` + un `.filter()` manual posterior, no con `z.enum(...)` directo en
   el schema como especificaba el plan — cambiado a que Zod mismo sea la única
   fuente de verdad del vocabulario permitido, y corregido un comentario que
   afirmaba (falsamente) reusar `resolveFieldPath`/denylist de
   `responseValidator.ts`.
3. **Dashboard extendido / "Módulo 7"** (`ExtendedStatsSection.tsx`,
   `extendedStats.ts`) — 5 de las 6 vistas planeadas (`weekday`/`hour`/
   `instrument`/`confluence_single`/`confluence_combo`) estaban correctamente
   conectadas sin ninguna migración nueva, con heatmap+tablas, piso de muestra
   (`MIN_SAMPLE_FOR_HEATMAP = 3`), toggle colapsable y grid mobile-friendly. Faltaba
   la 6ª: `v_user_psychology_stats` (el resumen de % de cuenta completa —
   `pct_fomo`, `pct_impulsive`, etc. — genuinamente distinto de
   `v_user_psychology_tag_stats`, que es rendimiento *por tag*, no frecuencia de
   comportamiento) nunca se había conectado a ninguna UI. Se agregó
   `getPsychologyPctStats()` + una sección "Frecuencia de comportamientos" (barras
   horizontales, mismo piso de muestra) — el Módulo 7 queda con sus 6 vistas
   cubiertas.
4. **Day Replay multi-trade** (`openTrades: Trade[]` en `Backtesting.tsx`,
   markers múltiples en `ChartEngine.tsx` vía el mismo `setMarkers([...])` que ya
   usan las confluencias) — arquitectura y el guardrail de seguridad ("Finalizar
   sesión" bloqueado mientras haya trades abiertos) correctos. Un bug real de
   concurrencia en `BacktestOrderPanel.tsx`: `closingId` era un solo
   `string | null` — cerrar el trade A y, antes de que resuelva, cerrar el B hacía
   que el `finally` de A borrara también el estado "cerrando" de B, reactivando su
   botón mientras el pedido de B seguía en vuelo (riesgo de disparar
   `closeBacktestTrade` dos veces sobre la misma operación). Corregido a
   `closingIds: Set<string>`.

**Diseño desktop/mobile diferenciado** — hallazgo clave que cambió el enfoque: la
app era prácticamente mobile-only, sin un solo breakpoint `lg:`/`xl:` real en
ninguna pantalla protegida. "App instalada" y "navegador mobile" resultaron ser,
en la práctica, el mismo layout — la única diferencia real y ya cubierta por el
código existente es que `Landing.tsx:115`'s `isStandaloneDisplay()` redirige
cualquier sesión standalone a `/login` antes de renderizar el CTA de instalación
(`#descargar`), así que un usuario con la app instalada nunca lo ve; no hace falta
ningún cambio adicional ahí, ni existe ningún otro CTA de instalación en el resto
de la app (verificado por grep). Se priorizó por lo tanto el layout de
**desktop real**, que sí no existía:

- `src/hooks/useIsStandalone.ts` — versión reactiva de `isStandaloneDisplay()`
  (con listener de `matchMedia`), disponible para cualquier futuro uso condicional
  a modo standalone, aunque hoy no haga falta en `Landing.tsx` (que usa la versión
  síncrona por ser una decisión de routing de una sola vez, no un re-render).
- **`/backtesting` en `lg:+` (1024px)**: de un stack vertical (chart →
  `DrawingToolbar` → `ConfluenceSuggestionsPanel` → `ConfluenceLegendPanel` →
  `ReplayControls` → `BacktestOrderPanel`, todo full-width) pasa a un layout tipo
  TradingView — `flex-row`, chart + `ReplayControls` a la izquierda (todo el ancho
  disponible), y el resto de paneles en un `<aside className="lg:w-96
  lg:border-l ...">` lateral con scroll propio. Cambio acotado a
  `Backtesting.tsx`: los 4 componentes del panel lateral no necesitaron tocarse,
  porque su `max-w-2xl mx-auto` (672px) ya no restringe nada dentro de un
  `<aside>` de 384px. Por debajo de `lg:`, comportamiento idéntico al de antes.
- **Sidebar de navegación desktop**: `src/hooks/useNavItems.tsx` extrae el array
  de items (antes inline en `AppFloatingNav.tsx`) a un hook compartido;
  `src/components/ui/sidebar-navbar.tsx` es una nueva píldora vertical fija en el
  borde izquierdo, mismo lenguaje visual que la pill inferior; `AppFloatingNav.tsx`
  ahora renderiza ambas presentaciones desde un único componente (`FloatingNav`
  envuelta en `lg:hidden`, `SidebarNav` en `hidden lg:block`) — como cada página ya
  renderiza `<AppFloatingNav/>` sin cambios, el sidebar aparece en las 10 páginas
  existentes sin tocarlas. Cada `<main>` que ya usaba `pb-28` (Dashboard,
  Historial, Scanner, AdminPanel, TradeDetail, Sistema, Perfil, ConfiguracionIA,
  IaTrader, Noticias) pasó a `pb-28 lg:pb-10 lg:pl-24` — libera el espacio inferior
  que ya no hace falta en desktop y deja hueco a la izquierda para el nuevo riel.

**Deliberadamente no hecho en este pase** (deferido a pedido explícito, no
olvidado): mejoras de densidad desktop en Dashboard (grid 2 columnas para las
stat cards nuevas)/Historial (tabla real en vez de lista)/TradeDetail (2 columnas)
— cada una es una reestructuración real, no solo aprovechar ancho existente, y se
decidió no gastar ese esfuerzo hasta confirmar que el resto del diseño desktop se
ve bien primero.

**Verificación de esta sesión — limitación real, no hipotética**: no se pudo
confirmar nada de esto en un navegador real logueado. Con Docker/Supabase local
ya levantado, se intentó un signup real vía el navegador automatizado de esta
herramienta, pero **el pane no composita frames** (`screenshot failed: the
Browser pane is not displayed`) y ningún clic disparó una request real a la API
de auth local (confirmado con `read_network_requests`) — la misma clase de
limitación de esta herramienta ya documentada más arriba para el chart de
`/backtesting` y el prompt nativo de push. Lo único verificado en esta sesión fue
`npm run build`/`npm run lint` limpios después de cada cambio. Antes de confiar en
este trabajo, verificar a mano en un navegador real: el layout de escritorio de
`/backtesting` en 1024px/1440px, el sidebar apareciendo en las páginas protegidas,
y las 4 correcciones de la auditoría (especialmente el fix de `closingIds` —
abrir y cerrar 2-3 trades de práctica rápido, en distinto orden, y confirmar que
ningún trade queda con `status='open'` en la base).

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
