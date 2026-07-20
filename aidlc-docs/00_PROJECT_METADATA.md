# Project Metadata

**Project Name:** LineaTrade (rebranded from "Lineatrader" — see commit `2f4a067`)
**Owner:** JONAHBRUZZI (git user on this repo)
**Analyzed On:** 2026-07-19, re-audited 2026-07-20
**Current Phase:** **Operations** (deployed to production), with genuine Construction-phase
gaps still open — see "Status" below. Treat this as the honest label, not "Mixed": the
app has real users reachable at a live URL, backed by a separate Supabase Cloud project,
so it is not merely "ready to deploy" — it **is** deployed. The gaps (no automated tests,
no CI, no monitoring) are operational maturity debt, not phase misclassification.
**Last Updated:** 2026-07-20

## Status

- [x] Inception Phase — complete. `docs/trade-journal-os-prd-v2.md`, the schema doc, and
  the context-engine doc are thorough, predate the code, and are treated as the living
  contract (CLAUDE.md: "the doc is the source of truth; if you need a schema change, edit
  the doc's intent first, then add a new migration").
- [x] Construction Phase — complete for everything CLAUDE.md's "Fase 0–4" describes, plus
  everything shipped after (Fase 3/4, IA Trader, Noticias, Perfil, Sistema, options
  trading, photo-based trade extraction, order-ticket detail, trader plan engine — see
  `requirements/REQUIREMENTS.md` for the module-by-module state). **Update 2026-07-20:**
  the drift this section originally flagged (CLAUDE.md's roadmap table describing "Fase
  3/4 ⬜ pendiente" and omitting Noticias/IA Trader/Sistema/Perfil) was real at the time
  this file was first written (2026-07-19) but has since been fixed directly in
  `CLAUDE.md` — commits `155221f`/`1fe39b8` resynced the roadmap table, and this session
  additionally corrected three smaller staleness items caught in a follow-up pass: the
  migrations count (33→34, missing the `tecnologia`-category migration), the shared
  `TradeListRow` component (extracted in `7030d01`, wasn't mentioned in CLAUDE.md's
  structure section), and the FAQ section added to `Landing.tsx` in `5228ca7`. **CSV
  trade import, listed here previously as shipped work, was removed entirely on
  2026-07-20** (`lib/tradeImport.ts` deleted, not just left orphaned) — see
  `requirements/REQUIREMENTS.md`'s CSV row and `prompts.md` for the session that did it.
  The recommendation this section used to make (re-sync CLAUDE.md's roadmap table) is
  **done, not still open** — no further action needed here.
- [~] Operations Phase — **partial**. The deploy pipeline itself works (GitHub → Vercel
  auto-deploy on push to `main`, confirmed in CLAUDE.md's "Production" section) and the
  app has been live and used. But there is **no test suite of any kind** (`find src -iname
  "*test*"` returns nothing, `package.json` has no test script), **no CI pipeline**
  (`.github/workflows/` does not exist), and **no monitoring/observability** (Sentry and
  PostHog are named in the PRD's "Intended full stack" but a `grep -ri sentry|posthog
  src/` returns nothing — confirmed not wired, matching CLAUDE.md's own admission under
  Fase 4). See `operations/MONITORING_SETUP.md` and `testing/TEST_STRATEGY.md` for the gap
  in detail.

## Quick Links

- Requirements: [requirements/](requirements/)
- Domain model: [design-artifacts/DOMAIN_MODEL.md](design-artifacts/DOMAIN_MODEL.md)
- Architecture: [design-artifacts/ARCHITECTURE.md](design-artifacts/ARCHITECTURE.md)
- Testing: [testing/TEST_STRATEGY.md](testing/TEST_STRATEGY.md)
- Deployment: [deployment/](deployment/)
- Operations: [operations/](operations/)

## Notas del Análisis Automático (supuestos hechos)

- **No hay tickets/Issues/Notion accesibles desde este entorno.** Todo lo extraído para
  requirements/stories viene de `docs/*.md`, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md` y
  el código real (`src/`, `supabase/migrations/`) — no de un backlog externo. Si existe un
  backlog de GitHub Issues, no fue consultado aquí (esta sesión no tiene acceso a `gh` con
  el remoto correcto verificado).
- **Stakeholders**: no hay ningún documento que nombre personas/roles de negocio más allá
  de "el dueño del repo" (CONTRIBUTING.md §6, Fase 0: "pendiente del dueño del repo"). Se
  documenta como desconocido en `requirements/STAKEHOLDERS.md`, no se inventa una lista.
- **Fase detectada** se decidió por evidencia directa, no inferencia: `CLAUDE.md` mismo
  dice "the app is deployed to production at https://lineartrade.vercel.app, backed by a
  separate Supabase Cloud project" — esto es una afirmación verificada end-to-end (login
  real, trade real, cierre real), no una aspiración. Por eso la fase es Operations y no
  Late Construction, aun sin monitoring.
- **No se ejecutó `npm run build` ni `npm run lint` en esta sesión** para no interferir
  con el entorno de desarrollo activo del usuario (`.env.local` recién modificado, `dist/`
  con timestamp reciente sugieren trabajo en curso). `testing/TEST_COVERAGE_REPORT.md`
  marca esto explícitamente como no medido en vez de inventar un número.
