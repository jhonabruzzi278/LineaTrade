# Test Strategy

## Framework detectado

**Ninguno.** `package.json` no tiene ningún script de test, ninguna dependencia de
testing (`jest`, `vitest`, `@testing-library/*`, `playwright`, `pgtap` no aparecen en
`dependencies` ni `devDependencies`), y `find src -iname "*test*"` no devuelve ningún
archivo. Esto está confirmado explícitamente en el propio `README.md` del proyecto:
"No hay tests todavía. `npm run build` es la verificación efectiva."

Esto **no es un hallazgo sorpresa** — es un estado conocido y documentado por el propio
equipo. Se registra aquí formalmente porque el estándar general de calidad (80% de
cobertura mínima, unit+integration+E2E) no se cumple en absoluto todavía, y el playbook
de este audit exige decir "no se puede medir" en vez de inventar un número.

## Lo que sí actúa como red de seguridad hoy

- `tsc -b` (parte de `npm run build`) — typechecking estricto de todo el proyecto antes
  de empaquetar. Atrapa errores de tipos, no errores de lógica ni de negocio.
- `oxlint` — reglas mínimas configuradas (`react/rules-of-hooks: error`,
  `react/only-export-components: warn`) — no hay reglas de seguridad ni de estilo más
  allá de estas dos.
- Verificación manual end-to-end documentada en `CLAUDE.md` — real, detallada, y
  valiosa (signup real → confirmación de email real vía Mailpit → login → onboarding →
  trade real → cierre con cálculo de PnL/R verificado a mano → sign-out → confirmación
  de redirect) — **pero es manual, no repetible automáticamente, y no corre en cada PR.**

## Gaps priorizados (recomendación, no crítica)

1. **pgTAP para invariantes de RLS y triggers** — el mayor riesgo real de este proyecto
   son bugs de seguridad de datos (ya hubo 3 reales, ver `code-generation/
   CODE_REVIEW_NOTES.md`). Un test pgTAP que verifique "usuario A no puede leer filas de
   usuario B" en cada tabla, y "toda vista tiene `security_invoker = true`", convertiría
   un ADR en un check ejecutable en vez de una promesa en un documento.
2. **Unit tests para lógica pura sin dependencias de red**: `lib/tradeDisplay.ts`
   (`formatTradeResult`/`tradeResultColorClass` — ya tuvo un bug real de display),
   `lib/traderPlanEngine.ts` (motor de recomendación — lógica de negocio sin schema
   dependency aparente), `lib/instruments.ts` (`resolveInstrumentId` — lógica de
   dedupe). Estas son las funciones más fáciles de testear con el mayor retorno.
3. **E2E de los flujos ya verificados a mano** (Playwright, per las reglas del equipo):
   codificar exactamente la secuencia que CLAUDE.md ya describe manualmente
   (signup → onboarding → trade → cierre → dashboard → sign-out) para que deje de
   depender de que un humano lo repita cada vez.
4. **CI** (`.github/workflows/`) — no existe ninguno. Sin CI, ni `tsc -b`, ni `oxlint`,
   ni (cuando existan) los tests, se hacen cumplir automáticamente en un PR — dependen
   100% de que el autor los corra localmente antes de pushear.

## Coverage

Ver `TEST_COVERAGE_REPORT.md` — 0% medible, honestamente, porque no hay nada que medir.
