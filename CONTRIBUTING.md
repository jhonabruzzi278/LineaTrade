# Guía de colaboración — Lineatrader

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
   npm run dev      # http://localhost:5180
   npm run build    # debe pasar en verde
   ```

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

El trabajo está organizado por fases (ver [plan completo](docs/lineatrader-plan-implementacion.md)).
Toma una tarea, crea su rama, y abre un PR por tarea. Coordina en Issues para no pisarse.

### ✅ Fase 0 — Onboarding (completa)
Landing · Registro · Login · Recuperar contraseña. Falta solo el **deploy a Vercel**
(pendiente del dueño del repo).

### ⬜ Fase 1 — Pantallas privadas con datos mock (siguiente)
El *loop diario* del trader. Construir con tipos TypeScript calcados del schema
([`docs/trade-journal-os-schema.md`](docs/trade-journal-os-schema.md)) y del
[motor de contexto](docs/trade-journal-os-context-engine.md):

1. **Tipos base** — definir en `src/types/` los tipos de `trades`, `strategies`,
   `instruments`, etc., idénticos al schema. *(Hacer esto primero: es el contrato.)*
2. **Dashboard** — cards configurables, resumen, acceso rápido a "Nuevo Trade".
3. **Formulario "Nuevo Trade"** — el más largo: datos técnicos, contexto, psicología,
   aprendizaje. Registrar un trade debe tomar < 1 minuto (mobile-first).
4. **Detalle de Trade** — vista de un trade guardado + hilo de seguimiento.
5. **Historial / listado** de trades.

### ⬜ Fase 2 — Backend real (Supabase)
Crear proyecto, aplicar schema vía migraciones, generar tipos
(`supabase gen types typescript`) que reemplazan los mocks, conectar Auth y CRUD real,
configurar Storage de imágenes.

### ⬜ Fase 3 — Motor de IA
Edge Function que construye el contexto por capas, `ai_provider_config`, botón
"Analizar con IA" en el detalle, rate limiting (`ai_usage_daily`) y BYOK.

### ⬜ Fase 4 — Panel SuperAdmin y observabilidad
Módulos de admin, Sentry + PostHog, Edge Function auditada para soporte.

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
