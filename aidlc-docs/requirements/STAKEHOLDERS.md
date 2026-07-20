# Stakeholders

## Extraído del repo

- **Dueño del repo / Product Owner implícito**: no nombrado por rol en ningún doc, pero
  referenciado indirectamente — CONTRIBUTING.md §6 dice el deploy a Vercel de Fase 0
  quedó "pendiente del dueño del repo" (ya resuelto: la app está en producción). El git
  user configurado en este entorno es `JONAHBRUZZI`.
- **Colaboradores externos**: CONTRIBUTING.md está escrito asumiendo un equipo ("Gracias
  por sumarte... proyecto colaborativo en desarrollo"), con flujo de PR + revisión
  obligatoria ("Requiere al menos una aprobación antes de merge"). No hay evidencia en
  `git log` de más de un autor de commits en este checkout local, pero el proceso
  documentado asume múltiples contribuyentes.
- **Usuario final**: trader individual, LatAm, hispanohablante — inferido de: idioma del
  copy, brokers listados en `data/brokers.ts` (mix forex/acciones/cripto/futuros
  relevante a LatAm), y el posicionamiento anti-señales/anti-promesa-de-rentabilidad.
- **SuperAdmin**: rol interno definido en el schema (`profiles.role = 'superadmin'`,
  `is_superadmin()`), con acceso auditado a `/admin`. Es un stakeholder operativo, no de
  negocio — probablemente el mismo dueño del repo en la práctica actual.

## No documentado

⚠️ **Pendiente validación humana** — no hay ningún artefacto (README, docs/, issues) que
identifique:
- Inversionistas o stakeholders externos al equipo de desarrollo.
- Un Product Owner con nombre/rol formal distinto del "dueño del repo".
- Usuarios beta o early adopters reales (más allá de las verificaciones end-to-end
  descritas en CLAUDE.md, que fueron pruebas técnicas, no onboarding de usuarios reales).

**Supuesto documentado**: para este audit se asume que el dueño del repo actúa como
Product Owner de facto, dado que no hay separación de roles visible en ningún documento.
