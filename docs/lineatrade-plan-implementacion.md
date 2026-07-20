# LineaTrade — Plan de Implementación

> Este documento es el plan **original**, escrito antes de construir nada. Se conserva
> como referencia histórica de la secuencia planeada; para el estado real y detallado del
> proyecto, `CLAUDE.md` (raíz del repo) es la fuente de verdad — este archivo solo resume
> qué fase quedó cerrada.

**Estado a la fecha (resincronizado 2026-07-19): Fase 0 a Fase 4 cerradas, y el producto
ya creció más allá de las 5 fases de este plan.** Todas las pantallas planeadas existen y
están conectadas a datos reales (no mock), el motor de IA y el panel SuperAdmin están
construidos, y la app corre en producción en `https://lineartrade.vercel.app` contra un
proyecto Supabase Cloud separado del stack local de Docker. Ver "Beyond Fase 4" al final
de este documento para el trabajo que se shippeó sin una fase formal — Noticias, IA
Trader, Sistema, Perfil, trading de opciones, tickets de orden, y extracción de trades
por foto vía IA — ninguno de los cuales estaba en el alcance original de este plan.

---

## Fase 0 — Validación visual del Onboarding

| Pantalla | Estado |
|---|---|
| Landing | ✅ Construida y conectada |
| Registro | ✅ Construida y conectada (Supabase Auth real) |
| Login | ✅ Construida y conectada |
| Recuperar contraseña | ✅ Construida y conectada |
| **Deploy a Vercel** | ✅ Desplegado — `https://lineartrade.vercel.app` |

---

## Fase 1 — Resto de pantallas privadas

Dashboard, Nuevo Trade, Detalle de Trade, e Historial — las cuatro construidas y
conectadas a datos reales de Supabase, no a los mocks que planeaba esta fase
originalmente.

---

## Fase 2 — Backend real (Supabase)

Cerrada: schema completo aplicado vía 26 migraciones (de las **33 que existen hoy** —
las 7 restantes son trabajo posterior a Fase 4, ver "Beyond Fase 4" abajo), tipos
TypeScript generados desde el schema real (`supabase gen types typescript`, nunca a
mano), Auth real conectado, CRUD de `trades` funcionando, Storage configurado para
imágenes de trades (bucket privado + URLs firmadas).

---

## Fase 3 — Motor de IA

Cerrada: Edge Function `analyze-trade` desplegada, BYOK y rate limiting (`ai_usage_daily`)
funcionando, botón "Analizar con IA" conectado en Detalle de Trade. Provider por defecto:
Groq. Ver la sección "Roadmap phases" de `CLAUDE.md` para el detalle de qué RPCs y
migraciones lo sostienen.

---

## Fase 4 — Panel SuperAdmin

Cerrada: `/admin` muestra métricas agregadas del sistema (usuarios, trades, uso de IA) vía
una función `security definer` auditada. **Pendiente todavía:** Sentry y PostHog (la
observabilidad de la PRD) no están conectados — ver `CLAUDE.md`.

---

## Beyond Fase 4 — trabajo sin fase formal

Ninguno de estos ítems tiene un número de fase asignado en `docs/` — se construyeron
después de que las 5 fases de este plan ya estaban cerradas. Se listan aquí para que
este documento no quede desactualizado frente al código; el detalle técnico completo de
cada uno vive en `CLAUDE.md` (sección "Beyond Fase 4"), no en este archivo.

| Feature | Qué es | Estado |
|---|---|---|
| Trading de opciones | `option_type`/`strike_price`/`expiration_date` en `trades`, multiplicador ×100 automático en el trigger de PnL | ✅ Construido |
| Tickets de orden | Tabla `trade_orders`, un registro por leg (`'open'`/`'close'`) de una operación | ✅ Construido |
| Extracción de trade por foto (IA vision) | Edge Function `extract-trade-image`, único punto de entrada a "Nuevo Trade" hoy | ✅ Construido — reemplazó tanto la entrada 100% manual como el import CSV |
| Import de trades por CSV | Tab "Subir archivo" en Nuevo Trade | ❌ Construido y luego **removido por completo** (commit `7f89396`) — `lib/tradeImport.ts` quedó como código muerto sin ningún import en el repo |
| Noticias | Feed editorial en español, RSS, refresco on-demand sin cron | ✅ Construido |
| Sistema | Objetivos/reglas/estrategias del trader, CRUD con soft-delete | ✅ Construido — `v_rule_violations` existe pero no se consume desde esta pantalla, solo desde el motor de IA |
| Perfil + avatar | Página de perfil, subida de avatar a bucket público `avatars` | ✅ Construido |
| IA Trader / motor de plan | Quiz público (`/ia-trader`, sin `<ProtectedRoute>`) que genera un `TraderPlan` determinístico (sin LLM) y lo persiste en `trader_plans` para usuarios logueados | ✅ Construido |
| Rediseño de navegación | `BottomNav` (estilo isla) reemplazó la navegación principal de `AppHeader` | ✅ Construido |
| Migraciones 27-33 | Backend de todo lo anterior | ✅ Aplicadas — ver `CLAUDE.md` → "Backend" para el detalle migración por migración |

**Nota de proceso:** este plan se escribió antes de construir nada (ver la nota al inicio
del documento) y nunca se actualizó para anticipar estas features — no estaban en el
alcance original ni en el PRD versionado. Si el equipo quiere seguir usando este archivo
como plan vivo (no solo histórico), la próxima adición debería declarar explícitamente
una "Fase 5" o similar en lugar de seguir acumulando trabajo sin numerar.
