# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lineatrader is a Spanish-language marketing/onboarding front end for a trading-journal
product. The pitch: it records a trader's operations (technique, context, psychology)
and surfaces behavioral patterns — explicitly **not** a signals/prediction tool. All
copy is in Spanish (LatAm audience); keep new user-facing text in Spanish and match the
sober, evidence-first tone of the existing content.

Current scope is presentation only: a landing page plus login/signup views. Auth is
**not wired to a backend yet** — `Login.tsx` and `Signup.tsx` fake submission and carry
`TODO` markers pointing at Supabase (`supabase.auth.signUp()` / `signInWithPassword()`)
as the intended integration. Treat these as design-validation stubs, not working auth.

This shipped code is **Fase 0** (onboarding visual validation) of a much larger planned
product. The full spec lives in `docs/` and is the source of truth for anything beyond
what's currently on screen — read it before building new features. See
"Planned product architecture" below.

## Commands

```bash
npm run dev       # Vite dev server with HMR
npm run build     # tsc -b (typecheck) then vite build
npm run lint      # oxlint
npm run preview   # serve the production build locally
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

## Architecture / conventions

Small SPA. `main.tsx` mounts `<App/>`, which is only a router:

- `/` → `pages/Landing.tsx`
- `/registro` → `pages/Signup.tsx`  (route path is Spanish)
- `/login` → `pages/Login.tsx`

`Login.tsx` links to `/recuperar` (password reset) but no such route exists yet.

Structure: `pages/` are route-level default exports; `components/` are named exports
(`Nav`, `TraceLine`) shared across pages. Both auth pages render the shared `<Nav/>`.

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
it and keep new animation on compositor-friendly properties.

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

Fase 0 (done, current code) → Fase 1 (private screens: Dashboard, New Trade, Trade detail,
history) → Fase 2 (real Supabase: schema, generated types, auth, CRUD, Storage) → Fase 3
(AI engine Edge Function) → Fase 4 (SuperAdmin panel + observability).

### Contract-first typing — note the tension between docs

The PRD (§8) says build the frontend against **types generated from the Supabase schema**
(`supabase gen types typescript`), not hand-maintained mocks, to avoid schema↔UI drift.
The implementation plan's Fase 1 instead says build private screens with mock data using
the TypeScript types from the schema/context-engine docs. When this comes up, prefer the
PRD's contract-first stance: define the types to match the schema exactly so migrating to
real data is a data-source swap, not a rewrite. Also note the current code already diverges
from the PRD stack (it uses `react-router-dom`, not TanStack Router) — reconcile
deliberately rather than by accident.
