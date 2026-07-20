# Monitoring Setup

## Estado real: no configurado

`grep -ri "sentry\|posthog" src/` no devuelve ningún resultado. `package.json` no tiene
`@sentry/*` ni `posthog-js` como dependencia. Esto **no es un descubrimiento** — el
propio `CLAUDE.md` lo admite explícitamente bajo "Fase 4 (SuperAdmin)": "Sentry/PostHog
observability from the PRD's 'Intended full stack' is **not** wired up yet."

Se documenta aquí formalmente porque la app **está en producción con usuarios reales
potenciales** (`https://lineartrade.vercel.app`, backed por Supabase Cloud) sin:

- Tracking de errores de frontend (Sentry o equivalente) — un error en producción hoy
  solo es visible si un usuario lo reporta, o si aparece en los logs nativos de Vercel/
  Supabase (que no están centralizados ni alertan a nadie).
- Analítica de producto (PostHog o equivalente) — no hay forma de saber, por ejemplo,
  cuántos usuarios completan el onboarding vs abandonan, sin consultar la base
  directamente.
- Logs estructurados de las Edge Functions (`analyze-trade`, `extract-trade-image`,
  `fetch-news`) más allá de lo que Supabase Cloud retiene por defecto en su dashboard.

## Lo que sí existe hoy como señal operativa

- **Dashboard de Vercel**: logs de build y de invocaciones de función serverless
  (implícito por ser la plataforma de hosting) — no confirmado si alguien lo revisa de
  forma proactiva o solo reactivamente ante un reporte de usuario.
- **Dashboard de Supabase Cloud**: logs de Postgres, Auth, y Edge Functions — mismo
  caveat, reactivo no proactivo.
- **`get_system_metrics()` + `/admin`**: métricas agregadas de negocio (usuarios, trades,
  uso de IA) visibles al SuperAdmin — esto es lo más cercano a un "dashboard" que el
  producto tiene, pero es una vista manual (alguien tiene que abrir `/admin` y mirar), no
  alerting automático.
- **`audit_log`**: registra específicamente accesos de soporte a datos de otro usuario —
  es un log de seguridad/compliance, no un log de errores de aplicación.

## Recomendación de arranque mínimo (según el PRD, priorizado por costo/beneficio)

1. **Sentry para el frontend** (más barato de integrar, mayor señal inmediata sobre
   errores reales de usuarios) — el PRD ya lo define como parte del "Intended full
   stack", así que no es una decisión nueva, es cerrar un ítem ya decidido.
2. **Alertas básicas en Supabase Cloud** (si la plataforma las ofrece de forma nativa
   para errores de Edge Functions) antes de invertir en observabilidad custom.
3. **PostHog** como tercer paso — tiene menos urgencia que error tracking porque el
   riesgo de "algo se rompió y nadie lo sabe" es más grave que "no sabemos qué feature
   usan más".

## ⚠️ Pendiente de validación humana

No hay SLA ni definición de qué constituye un "incidente" — ver `SLA_DEFINITION.md`.
Sin esa definición, "monitoring" no tiene un objetivo claro contra el cual alertar.
