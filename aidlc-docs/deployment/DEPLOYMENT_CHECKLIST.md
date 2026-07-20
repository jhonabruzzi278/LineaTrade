# Deployment Checklist

## Pre-Deployment

- [ ] Tests pasando — **N/A todavía, no existen tests** (ver `testing/TEST_STRATEGY.md`).
      El único gate real hoy es `npm run build` (typecheck + bundle) en verde.
- [x] CI/CD configurado — **parcialmente**: hay auto-deploy de GitHub → Vercel en push a
      `main` (confirmado en CLAUDE.md), pero **no hay un pipeline de CI** (`.github/
      workflows/` no existe) que corra typecheck/lint/tests *antes* de que Vercel
      construya. El build de Vercel mismo hace de gate de facto (si `tsc -b` falla, el
      deploy falla), pero no hay feedback en un PR antes del merge.
- [x] Secrets no commiteados — verificado: `.gitignore` cubre `.env` y `.env.*` (con
      excepción explícita de `.env.example`), y `supabase/functions/.env` está confirmado
      ignorado por `git check-ignore -v`. `.env.local` existe localmente pero no está en
      el índice de git.
- [ ] Migraciones aplicadas al proyecto Cloud correcto — proceso manual documentado
      (`supabase link --project-ref ... && supabase db push --include-seed`), no
      automatizado. Riesgo real si alguien corre esto contra el proyecto equivocado —
      no hay salvaguarda de CI que lo prevenga.
- [ ] Variables de entorno de Vercel actualizadas — **recordatorio real de CLAUDE.md**:
      Vite hornea `VITE_*` en build time, no en runtime; cambiar una env var en el
      dashboard de Vercel no tiene efecto hasta el siguiente build/deploy.

## Infraestructura detectada

- **Vercel**: proyecto `lineartrade`, en una cuenta/team **distinta** de la sesión CLI
  local de este entorno (confirmado en CLAUDE.md — no asumir que `vercel env`/`vercel
  link` funcionan desde una shell fresca). Variables de entorno gestionadas vía la
  API REST de Vercel con un token personal, no vía `vercel env` CLI.
- **Supabase Cloud**: proyecto `pcmftbzpzeliurrnyidt`, separado del stack local Docker.
  Mismo schema (34 migraciones + seed), aplicado vía `supabase db push`.
- **No hay Dockerfile propio del frontend** — el frontend se construye y sirve vía la
  plataforma de Vercel (build nativo de Vite), no un contenedor gestionado por el equipo.
- **Docker sí se usa para el stack local de Supabase** (`supabase start`), no para
  producción.
- **No hay Terraform/Pulumi/IaC declarativo** — toda la infraestructura de Supabase
  Cloud y Vercel se configuró vía CLI/API imperativa, documentada en prosa en CLAUDE.md,
  no en código versionado de infraestructura. Ver `INFRASTRUCTURE_AS_CODE.md` para el
  detalle de qué existe vs qué es manual.

## ⚠️ Riesgo real ya documentado por el propio equipo

**"Don't run `supabase config push` against the cloud project."** — `config.toml`'s
`[auth].site_url` apunta a `localhost:5180`, correcto solo para desarrollo local; un
`config push` sin cuidado sobreescribiría la configuración de Auth de producción con una
URL localhost. Este es un comando destructivo real y ya identificado — cualquier
automatización de CI/CD futura para este repo debe excluir explícitamente ese comando
del pipeline, o requerir una confirmación humana explícita antes de correrlo.
