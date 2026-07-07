# LineaTrade — Plan de Implementación

> Este documento es el plan **original**, escrito antes de construir nada. Se conserva
> como referencia histórica de la secuencia planeada; para el estado real y detallado del
> proyecto, `CLAUDE.md` (raíz del repo) es la fuente de verdad — este archivo solo resume
> qué fase quedó cerrada.

**Estado a la fecha: Fase 0 a Fase 4 cerradas.** Todas las pantallas planeadas existen y
están conectadas a datos reales (no mock), el motor de IA y el panel SuperAdmin están
construidos, y la app corre en producción en `https://lineartrade.vercel.app` contra un
proyecto Supabase Cloud separado del stack local de Docker.

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

Cerrada: schema completo aplicado vía 26 migraciones, tipos TypeScript generados desde el
schema real (`supabase gen types typescript`, nunca a mano), Auth real conectado, CRUD de
`trades` funcionando, Storage configurado para imágenes de trades (bucket privado +
URLs firmadas).

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
