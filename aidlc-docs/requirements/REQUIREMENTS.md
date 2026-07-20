# Requirements

Extraídos de `docs/trade-journal-os-prd-v2.md`, `docs/trade-journal-os-schema.md`, y
verificados contra el código real donde fue posible (marcado ✅ = confirmado en código,
no solo en el doc).

## Funcionales (por módulo, estado real)

| Módulo | Requisito | Estado |
|---|---|---|
| Auth | Signup/Login/Recuperar/Actualizar contraseña vía Supabase Auth real | ✅ `Signup.tsx`, `Login.tsx`, `Recuperar.tsx`, `ActualizarPassword.tsx` |
| Onboarding | Quiz post-signup persiste en `profiles`, gatea a `/dashboard` | ✅ `Onboarding.tsx` |
| Registro de trade | Bróker + entrada técnica + contexto + psicología + aprendizaje | ✅ `NuevoTrade.tsx` + `components/trade/*` |
| Registro de trade — opciones | Contratos de opciones (no solo spot) | ✅ migración `20260716120000_options_trading_support.sql` |
| Registro de trade — foto | Extracción de datos de trade desde una imagen vía IA vision | ✅ Edge Function `extract-trade-image` |
| Registro de trade — CSV | Import masivo desde extracto de bróker | ⬜ UI-only, bloqueado explícitamente al guardar (`lib/tradeImport.ts` existe pero CLAUDE.md confirma que el guardado real está bloqueado) |
| Cierre de trade | Exit price → trigger SQL calcula `pnl_amount`/`pnl_r`, nunca el cliente | ✅ `trg_calculate_trade_pnl`, verificado a mano contra un ejemplo real |
| Dashboard | Métricas agregadas desde vista SQL, nunca calculadas en el cliente o por IA | ✅ `v_user_trade_stats` + `Dashboard.tsx` |
| Historial | Listado filtrable por símbolo/estado | ✅ `Historial.tsx` |
| Detalle de trade | Hilo de seguimiento + galería de imágenes + detección de stop-loss movido no reportado | ✅ `TradeDetail.tsx`, `trade_threads`, `trade_images` |
| Imágenes | Upload validado (5MB, `image/*`), bucket privado, URLs firmadas (1h TTL) | ✅ `lib/tradeImages.ts`, verificado con upload real |
| IA — análisis de trade | Contexto de 4 capas, salida forzada a citar evidencia (`facts_cited`) | ✅ Edge Function `analyze-trade`, `AIAnalysisPanel.tsx` |
| IA — BYOK | Usuario aporta su propia API key, se guarda en Vault (nunca plaintext al cliente) | ✅ `set_provider_api_key`/`get_byok_status`/`disable_byok`, `read_vault_secret` |
| IA — rate limiting | 3 análisis/día gratis, atómico (sin condiciones de carrera) | ✅ `check_and_increment_ai_usage`, con fix documentado para bug de columna ambigua |
| IA Trader | Página `/ia-trader` — no descrita en CLAUDE.md/README | ⚠️ Existe en código (`IaTrader.tsx`), propósito exacto no documentado — pendiente validación |
| Noticias | Feed editorial, fuentes forzadas en español, responsive (chips scrolleables mobile, grid 3 cols desktop) | ✅ `Noticias.tsx`, `lib/news.ts`, Edge Function `fetch-news`, tabla `news_articles` |
| Sistema | Objetivos, reglas, y estrategias del trader | ✅ `Sistema.tsx` + `components/sistema/*`, tablas `objectives`/`trader_rules`/`strategies` |
| Perfil | Avatar upload | ✅ `Perfil.tsx`, `lib/avatarUpload.ts`, migración `20260719120000_avatars_storage.sql` |
| Trader Plan / Quiz | Motor de recomendación de plan basado en quiz | ✅ `traderQuizStorage.ts`, `traderPlanEngine.ts`, `PlanReport.tsx`, tabla `trader_plans` |
| SuperAdmin | Métricas agregadas del sistema, config de proveedor de IA | ✅ `AdminPanel.tsx`, `get_system_metrics()`, config en `ai_provider_config` |
| Orden / ticket | Detalle de ticket de orden | ✅ `OrderTicketFields.tsx`, tabla `trade_orders` |

## No funcionales

| Requisito | Fuente | Estado real |
|---|---|---|
| RLS en el 100% de las tablas | schema doc §-regla explícita | ✅ Verificado en CLAUDE.md contra `pg_class.relrowsecurity` |
| La IA nunca inventa cifras | Principio #1 (PRD) | ✅ Enforcement estructural: `facts_cited` en la salida forzada a JSON |
| PWA instalable | `vite-plugin-pwa` config | ✅ manifest + SW, iOS meta tags manuales en `index.html` |
| Sin caché de datos financieros en el Service Worker | Decisión explícita | ✅ `globPatterns` scoped a shell, nunca a Supabase |
| Copy en español, tono sobrio | Constraint de producto | ✅ Enforced manualmente, sin lint automatizado que lo verifique |
| `npm run build` en verde antes de PR | CONTRIBUTING.md §5 | ⚠️ Es la única "prueba" del proyecto — no hay tests reales (ver `testing/TEST_STRATEGY.md`) |
| Cobertura de tests ≥ 80% | Estándar general del equipo (no específico de este repo) | ❌ No aplica todavía — 0% de cobertura medible, no existe ningún test |

## Pendiente de validación humana

- ⚠️ No hay requisitos de performance (Core Web Vitals, tiempos de carga) documentados
  específicamente para este proyecto — la guía general del equipo los define, pero no hay
  evidencia de que se midan aquí (no hay Lighthouse CI, no hay budgets en `vite.config.ts`).
- ⚠️ No hay requisitos de accesibilidad (WCAG) documentados o auditados en este repo.
- ⚠️ No hay SLA de disponibilidad definido — la app corre sobre Vercel (SLA de la
  plataforma) + Supabase Cloud (SLA de la plataforma), pero no hay un SLA propio del
  producto documentado.
