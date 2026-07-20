# Code Review Notes

No hay historial de code review formal accesible desde este entorno (no hay PRs
consultados vía `gh`, y `CONTRIBUTING.md` exige "al menos una aprobación antes de merge"
pero no hay evidencia de branch protection configurada ni de PRs reales abiertos en este
checkout — el trabajo visible en `git log` está todo en `main`). Lo que sigue son los
hallazgos de revisión **reales y ya corregidos**, documentados explícitamente en
`CLAUDE.md` — es la evidencia más concreta de que sí hubo revisión de calidad en algún
punto, aunque no quedara en un PR de GitHub.

## Bugs de seguridad reales encontrados y corregidos (severidad CRITICAL)

1. **Recursión infinita en policy de RLS** — ver
   [ADR-002](../design-artifacts/ADR/ADR-002-security-definer-helper-for-rls-recursion.md).
2. **Grants faltantes** — RLS sin `GRANT` a nivel de tabla no hace nada; Supabase ya no
   auto-expone tablas nuevas a `authenticated`/`anon` por defecto, y el schema doc
   predata ese cambio de default. Fix: grants explícitos a `authenticated` en las 15
   tablas que existían en ese momento (deliberadamente nada a `anon`).
3. **Vista sin `security_invoker`** — ver
   [ADR-001](../design-artifacts/ADR/ADR-001-rls-security-invoker-views.md). Encontrado
   en revisión, no por una query fallida — la clase de bug más peligrosa porque no hace
   ruido.

## Bug de display real encontrado (severidad HIGH)

**`formatTradeResult` mostraba el precio de entrada para un trade *cerrado* sin
`pnl_r`** — visualmente indistinguible de "trade abierto, todavía sin resultado", cuando
en realidad era una pérdida cerrada sin stop-loss capturado. El fallback a precio de
entrada solo es correcto para un trade *abierto*; reintroducirlo para un trade cerrado
sería reintroducir este mismo bug. Documentado en CLAUDE.md, sección "Closing a trade".

## Bugs de ambigüedad/compatibilidad post-deploy (severidad MEDIUM, ya corregidos)

- Columna ambigua en `check_and_increment_ai_usage` (commit `034caba`).
- `reasoning_effort` sin acotar causaba respuestas vacías de Groq (commit `5c59faa`).
- Keys obsoletas en `config.toml` rompían compatibilidad con CLI v2.78.1 (commit
  `60eed2a`).
- Cache de schema de PostgREST desincronizado en producción tras una migración (commit
  `d122b06`) — requirió una migración dedicada
  (`20260719173629_refresh_postgrest_schema_cache.sql`) solo para forzar el refresh.

## Gap real de proceso (no un bug, un hueco de disciplina)

**No hay evidencia de que estos bugs se hayan atrapado vía un checklist de revisión de
seguridad automatizado** (no hay `security-reviewer` corrido como CI gate, no hay
`get_advisors` de Supabase corrido rutinariamente que se sepa desde este entorno). Se
atraparon por revisión manual cuidadosa durante el desarrollo. Esto funciona a la escala
actual (un equipo pequeño, revisión disciplinada), pero es un punto único de falla si el
equipo crece o la cadencia de cambios aumenta — ver
`testing/TEST_STRATEGY.md` para la recomendación concreta (tests pgTAP + un check de CI
que corra `get_advisors` en cada PR que toque `supabase/migrations/`).
