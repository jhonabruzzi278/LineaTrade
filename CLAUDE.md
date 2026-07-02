# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lineatrader is a Spanish-language marketing/onboarding front end for a trading-journal
product. The pitch: it records a trader's operations (technique, context, psychology)
and surfaces behavioral patterns — explicitly **not** a signals/prediction tool. All
copy is in Spanish (LatAm audience); keep new user-facing text in Spanish and match the
sober, evidence-first tone of the existing content.

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

**Fase 0 and Fase 1 are both closed** (all planned screens exist and are wired to real
data). The full spec lives in `docs/` and is the source of truth for anything beyond
what's currently on screen — read it before building new features. See
"Planned product architecture" below.

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
- **oxlint** (not ESLint) for linting; TypeScript strict mode via `tsconfig.app.json`
- **Supabase** (local, via Docker + the Supabase CLI) — Postgres, Auth, Storage, Studio.
  `@supabase/supabase-js` is installed; `src/lib/supabase.ts` is the typed client. See
  "Backend" below.

## Architecture / conventions

Small SPA. `main.tsx` mounts `<App/>`, which is only a router:

- `/` → `pages/Landing.tsx`
- `/registro` → `pages/Signup.tsx` (route path is Spanish)
- `/login` → `pages/Login.tsx`
- `/recuperar` → `pages/Recuperar.tsx` — calls `resetPasswordForEmail`; always shows the
  same neutral "revisa tu correo" message regardless of whether the account exists
  (Supabase itself never reveals this — don't "fix" that into a leakier message).
- `/actualizar-password` → `pages/ActualizarPassword.tsx` — lands here from the reset
  email's link. Supabase auto-detects the recovery token in the URL and opens a
  temporary session (`detectSessionInUrl`, on by default); the page just calls
  `supabase.auth.updateUser({ password })` against that session.
- `/onboarding` → `pages/Onboarding.tsx` (**protected**) — post-signup profile quiz.
  Shown after login when `profiles.onboarding_done = false` (see `Login.tsx`'s
  post-signin redirect). On finish, persists answers to `profiles` and sets
  `onboarding_done = true`.
- `/nuevo-trade` → `pages/NuevoTrade.tsx` (**protected**) — broker picker → technical
  entry (manual form; file-upload is UI-only, blocked at save time with an explicit
  message — see "Backend") → contexto → psicología → aprendizaje. On finish, resolves/
  creates the `instruments` row (`lib/instruments.ts`) and inserts into `trades`, then
  routes to `/dashboard`.
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
  core differentiator without needing the AI engine.

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
shared across pages (`Nav`, `AppHeader`, `TraceLine`, `WizardLayout`, `ProtectedRoute`).
`components/trade/` holds pieces specific to the trade-entry flow (`BrokerPicker`,
`TechnicalEntryPanel`, `PsychologySection`). `data/` holds static content arrays
consumed by pages (`onboarding.ts`, `brokers.ts`). `lib/` holds backend-facing code:
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

### Design system — the important part

The visual identity lives entirely in **`src/index.css`** using Tailwind v4's `@theme`
block. Colors and fonts are defined there as CSS custom properties and consumed as
Tailwind utility classes (e.g. `--color-signal` → `bg-signal`/`text-signal`,
`--font-display` → `font-display`). **Do not hardcode hex colors or font stacks in
components** — add or reuse a token in the `@theme` block instead. The one deliberate
exception is `TraceLine.tsx`, which hardcodes hex in raw SVG attributes (`stroke="#E3A94A"`)
because those aren't Tailwind-utility contexts; keep those values in sync with the tokens.

Named tokens in use: `ink`/`panel`/`panel-2` (dark backgrounds), `hairline` (borders),
`signal`/`signal-dim` (amber accent + hover), `steel`, and `text-primary`/`muted`/`faint`.
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

## Backend (Supabase, local via Docker)

The database is real and the frontend is wired to it. Setup:

- **Migrations**: `supabase/migrations/*.sql`, 14 files, applied in order. The first 10
  are one-per-schema-doc-section (extensions + profiles, instruments, strategies/rules,
  trades, trade_history audit trigger, trade_images + storage bucket, trade_threads,
  objectives, AI tables, audit_log) — faithful copies of the SQL in
  `docs/trade-journal-os-schema.md`. The last 4 are real fixes discovered while wiring
  auth (see "Two real RLS bugs" below) plus a couple of small schema extensions the UI
  needed. That doc is the source of truth; if you need a schema change, edit the doc's
  intent first, then add a **new** migration (never edit an already-applied one, per the
  doc's own §11).
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
   grants. Fix: `grant select, insert, update, delete` on all 15 tables to `authenticated`
   only (deliberately nothing to `anon` — this product has no public surface). This is
   safe to do broadly because RLS policies (or their absence) still gate what's actually
   allowed per table/operation — e.g. `trade_history`/`ai_analysis`/`audit_log` have no
   `insert` policy, so the blanket grant doesn't open writes to them.
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

All 15 tables exist with RLS enabled on every one (`select relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'` — all `t`), matching the
schema doc's "RLS activado en TODAS las tablas sin excepción" rule. `pgcrypto`, `pgsodium`,
and `vector` extensions are all installed successfully in the local Postgres 17 image.

Full loop verified against the running stack, not just compiled: real `signUp` → fetched
the confirmation email from Mailpit's API → confirmed → real `signInWithPassword` →
redirected to `/onboarding` (`onboarding_done` was false) → answers persisted to
`profiles` → redirected to `/nuevo-trade` → a trade persisted to `trades`, with
`resolveInstrumentId` correctly matching the seeded `EURUSD`/`forex` catalog row instead
of creating a duplicate custom one. Also confirmed an anon (no-session) REST call to
`/rest/v1/trades` is flatly denied (`permission denied` — no grant to `anon` at all),
which is the intended posture for a product with no public surface.

## Planned product architecture

The reference docs in `docs/` define the full system. Read the relevant one before
touching anything in its domain — they are the contract, not background reading:

- `docs/trade-journal-os-prd-v2.md` — consolidated PRD: principles, module decisions, stack, roadmap.
- `docs/trade-journal-os-schema.md` — complete Supabase schema (tables, RLS, triggers, indexes).
- `docs/trade-journal-os-context-engine.md` — the AI context engine design.
- `docs/lineatrader-plan-implementacion.md` — phased build plan and current status.

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
- **Observability:** Sentry (errors) + PostHog (product, via an `AnalyticsEvent` interface);
  `audit_log` for security. Fixed ~12-event taxonomy in the PRD; never put financial or
  psychological values in event properties.

### Roadmap phases

**Fase 0, Fase 1, and Fase 2 are all closed.** Every screen in Fase 0/1 (Landing,
Registro, Login, Recuperar, Actualizar contraseña, Onboarding, Nuevo Trade, Dashboard,
Historial, Detalle de Trade) exists and is wired to real data, verified end-to-end
against the local stack. Fase 2 — schema, RLS, grants, the stats view, triggers, seed,
generated types, auth/CRUD, closing a trade, and `trade_images` Storage upload — is done
and verified locally, including a real upload → signed URL → display round trip and a
confirmed-denied anonymous request to the private bucket. See "Images" below.

The one deliberately-still-open non-Fase-2 item: `NuevoTrade`'s "Subir archivo" tab
(bulk-import trades from a broker CSV/statement) is a **different feature** from
`trade_images` (per-trade screenshots) — it's UI-only and explicitly blocked at save
time with a message pointing at "Agregar manualmente". Don't conflate the two when
someone asks "is file upload done" — the answer is "yes for images, no for CSV import".

→ Fase 3 (AI engine Edge Function) → Fase 4 (SuperAdmin
panel + observability).

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
