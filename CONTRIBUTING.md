# Guía de colaboración — LineaTrade

Gracias por sumarte. Este documento explica cómo trabajar en el repo para que todo
avance ordenado. Es un proyecto **en desarrollo activo**, así que la disciplina de
ramas, commits y PRs importa.

---

## 1. Antes de empezar

1. Lee el [README](README.md) para el panorama general.
2. Lee la **fuente de verdad** en [`docs/`](docs/README.md) — al menos el PRD y, si vas
   a tocar datos, el schema. **No inventes estructura de datos:** todo tipo de dato debe
   calcarse del schema de Supabase para que migrar a datos reales sea un cambio de fuente,
   no una reescritura.
3. Instala y verifica que corre:
   ```bash
   npm install
   npm run db:start # backend local (requiere Docker Desktop) — ver CLAUDE.md si el puerto falla
   npm run dev      # http://localhost:5180
   npm run build    # debe pasar en verde
   ```
   El `.env.local` con las claves locales no se versiona — cópialo desde `.env.example`
   y completa `VITE_SUPABASE_ANON_KEY` con el valor que imprime `npm run db:status`.

---

## 2. Flujo de trabajo con Git

`main` es la rama estable. **No se hace commit directo a `main`** — todo entra por Pull
Request.

```bash
# 1. Parte siempre de main actualizado
git checkout main
git pull

# 2. Crea una rama por tarea
git checkout -b feat/dashboard-cards

# 3. Trabaja, commitea en pasos pequeños, y sube
git push -u origin feat/dashboard-cards

# 4. Abre un Pull Request hacia main en GitHub
```

### Nombres de rama

`<tipo>/<descripcion-corta-en-kebab-case>` — ej: `feat/nuevo-trade-form`,
`fix/login-validacion`, `docs/actualizar-readme`.

---

## 3. Mensajes de commit (Conventional Commits)

Formato: `<tipo>: <descripción en imperativo>`

```
feat: agrega pantalla de recuperación de contraseña
fix: corrige ruta /recuperar faltante en el router
docs: documenta el motor de contexto de IA
refactor: extrae AuthForm compartido de Login y Signup
chore: configura .gitignore y puerto de dev
```

Tipos: `feat` · `fix` · `refactor` · `docs` · `test` · `chore` · `perf` · `ci`

- Mensajes en español, cuerpo opcional para explicar el *por qué*.
- Un commit = un cambio coherente. Evita el commit gigante "todo junto".

---

## 4. Estándares de código

- **TypeScript estricto de extremo a extremo.** Nada de `any`; usa `unknown` + narrowing
  para datos externos.
- **Sistema de diseño primero.** Colores y tipografías salen de los tokens en
  [`src/index.css`](src/index.css) (`bg-signal`, `text-text-muted`, `font-display`…).
  No hardcodees hex ni fuentes en componentes.
- **Convenciones existentes.** Las páginas viven en `src/pages/` (export default), los
  componentes compartidos en `src/components/` (export nombrado). Copia el patrón de
  `Login.tsx` / `Signup.tsx` al crear pantallas nuevas.
- **Copy en español**, tono sobrio y basado en evidencia (nada de promesas de rentabilidad).
- **Archivos pequeños y enfocados** (< 400 líneas orientativo, 800 máximo).
- **`npm run build` en verde** antes de abrir el PR (tipa todo el proyecto).

---

## 5. Pull Requests

Antes de pedir revisión:

- [ ] `npm run build` pasa sin errores.
- [ ] La rama está actualizada con `main` (sin conflictos).
- [ ] El PR describe **qué** cambia y **por qué**, y a qué fase/tarea corresponde.
- [ ] No hay secretos, claves ni `console.log` de depuración.
- [ ] Si tocaste datos, los tipos coinciden con el schema.

Requiere al menos una aprobación antes de merge.

---

## 6. Desarrollo por partes

El trabajo está organizado por fases (ver [plan completo](docs/lineatrade-plan-implementacion.md)).
Toma una tarea, crea su rama, y abre un PR por tarea. Coordina en Issues para no pisarse.

### ✅ Fase 0 — Onboarding (completa)
Landing · Registro · Login · Recuperar contraseña. Falta solo el **deploy a Vercel**
(pendiente del dueño del repo).

### ✅ Fase 1 — Pantallas privadas (completa)
El *loop diario* del trader, con datos reales (no mock) desde el día uno — los tipos en
`src/types/database.ts` se generan del schema local, así que nunca hubo que migrar de
mock a real.

1. Onboarding — quiz post-signup, persiste en `profiles`.
2. Nuevo Trade — bróker + datos técnicos, contexto, psicología, aprendizaje.
3. Dashboard — métricas desde `v_user_trade_stats` + últimos trades.
4. Historial — listado filtrable.
5. Detalle de Trade — vista completa + hilo de seguimiento (`trade_threads`) + galería
   y subida de imágenes (`trade_images`, bucket privado con URLs firmadas) + cerrar
   trade (precio de salida → un trigger en Postgres calcula `pnl_amount`/`pnl_r`, nunca
   el cliente).

### ✅ Fase 2 — Backend real (Supabase) (completa)
Schema, RLS, grants, seed, tipos generados, cierre de trade (PnL/R vía trigger) y subida
de imágenes a `trade-images` (URLs firmadas — el bucket es privado) — todo corriendo
local y verificado, incluyendo una subida real con verificación de que el objeto existe
en Storage y que una request anónima al bucket es rechazada.

**Nota (actualizada 2026-07-19, la versión anterior quedó obsoleta):** el tab "Subir
archivo" de `NuevoTrade` (importar trades desde un CSV/extracto de bróker) **ya no
existe** — se construyó como feature distinta de la subida de imágenes, pero se removió
por completo en el commit `7f89396` junto con el resto del selector manual/archivo/foto.
`lib/tradeImport.ts` quedó como código muerto sin ningún import en el repo. No confundas
esto con la nota vieja de "sigue bloqueada al guardar" — ya no está en la UI, punto.

### ✅ Fase 3 — Motor de IA (completa)
Edge Function que construye el contexto por capas, `ai_provider_config`, botón
"Analizar con IA" en el detalle, rate limiting (`ai_usage_daily`) y BYOK.

### ✅ Fase 4 — Panel SuperAdmin (completa) — observabilidad todavía pendiente
Módulos de admin y Edge Function auditada para soporte: hechos. Sentry + PostHog (la
observabilidad de la PRD) **siguen sin conectar** — ver `CLAUDE.md`.

### 🚀 Más allá de Fase 4 (sin numeración formal)
El producto siguió creciendo después de cerrar las 5 fases de este plan, sin que se
declarara una fase nueva: trading de opciones (`option_type`/`strike_price`/
`expiration_date` + multiplicador ×100 en el trigger de PnL), tickets de orden
(`trade_orders`, un registro por leg apertura/cierre), extracción de trade por foto vía
IA vision (`extract-trade-image`, ahora el único punto de entrada a Nuevo Trade),
Noticias (feed editorial en español, RSS, refresco on-demand), Sistema (objetivos/
reglas/estrategias), Perfil + avatar (bucket público, a diferencia de `trade-images`),
IA Trader (quiz público que genera un plan determinístico sin LLM), y el rediseño de
navegación (`BottomNav`). Detalle técnico completo en `CLAUDE.md` → "Beyond Fase 4" y en
`docs/lineatrade-plan-implementacion.md` → "Beyond Fase 4". Si vas a construir sobre
alguno de estos módulos, empieza por ahí, no por este archivo.

---

## 7. Decisiones abiertas

Antes de construir ciertos módulos hay decisiones pendientes (catálogo de instrumentos,
notificación de acceso de soporte, sistema de diseño de componentes). Están listadas en
[`docs/trade-journal-os-prd-v2.md`](docs/trade-journal-os-prd-v2.md) §9 — resuélvelas en
un Issue antes de codear el módulo afectado.

---

## 8. ¿Dudas?

Abre un Issue con la etiqueta `pregunta`. Para arquitectura, la referencia es siempre
`docs/` — si algo en el código contradice los docs, gana el doc (o se corrige el doc
explícitamente en un PR).
