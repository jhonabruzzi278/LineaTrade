# Infrastructure as Code

## Lo que SÍ está versionado como código

| Recurso | Dónde | Cobertura |
|---|---|---|
| Schema de base de datos | `supabase/migrations/*.sql` (33 archivos) | Completa — cada cambio de schema es una migración nueva, nunca se edita una ya aplicada (regla explícita del propio `docs/trade-journal-os-schema.md` §11) |
| Seed de datos inicial | `supabase/seed.sql` | Catálogo de `instruments` para desarrollo local |
| Config de servicios locales (Auth, Storage, puertos) | `supabase/config.toml` | Completa para el stack **local** — no se aplica 1:1 a Cloud (ver riesgo en `DEPLOYMENT_CHECKLIST.md`) |
| Edge Functions | `supabase/functions/{analyze-trade,extract-trade-image,fetch-news}/` | Código versionado; deploy es un comando CLI (`supabase functions deploy`), no confirmado si está automatizado en CI |
| PWA / manifest | `vite.config.ts` (plugin config), `index.html` (meta tags iOS) | Completa |

## Lo que NO está versionado como código (gestión manual/imperativa)

- **Configuración de Auth en Supabase Cloud** (`site_url`, `uri_allow_list`) — se
  configuró vía una llamada directa a la Management API (`PATCH /v1/projects/{ref}/
  config/auth`), documentada en prosa en CLAUDE.md, no en un archivo versionado
  aplicable de forma idempotente.
- **Variables de entorno de Vercel** — gestionadas vía API REST con un token personal,
  no vía un archivo `vercel.json`/`vercel.ts` versionado ni vía `vercel env` CLI local.
- **Permisos/vínculo de cuenta Vercel** — el proyecto vive en una cuenta/team distinta de
  la sesión CLI de desarrollo; no hay ningún artefacto que documente cómo se otorgó ese
  acceso o cómo se recuperaría si se perdiera.
- **Aplicación de migraciones a Cloud** — comando manual (`supabase db push`), no un job
  de CI/CD que lo dispare automáticamente en cada merge a `main`.

## Recomendación (no crítica, priorización sugerida)

Si el equipo quiere reducir el riesgo de "alguien corre el comando equivocado contra
producción", el paso de mayor apalancamiento es un **workflow de GitHub Actions que
corra `supabase db push` automáticamente al mergear a `main`**, gateado por los checks
de CI que hoy no existen (typecheck, lint, y — cuando existan — tests). Esto convierte
un proceso manual y propenso a error humano en uno determinístico y auditable (queda un
log de cada aplicación de migración en el historial de Actions).
