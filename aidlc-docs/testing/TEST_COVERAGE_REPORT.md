# Test Coverage Report

**No se pudo medir — no existe ningún test que ejecutar.** No hay `npm run test`, no hay
`vitest`/`jest` instalado, no hay un solo archivo `*.test.ts`/`*.test.tsx`/`*.spec.ts` en
`src/`. Se confirmó con `find src -iname "*test*" -o -iname "*spec*"` (sin resultados) y
revisando `package.json` completo (sin script de test).

Cobertura actual: **0%**, honesto y literal, no una inferencia.

Para medir cobertura real en el futuro, una vez exista una suite:
- Unit/integration (Vitest recomendado por ser nativo de Vite, que el proyecto ya usa):
  `vitest run --coverage`
- E2E (Playwright, por convención del equipo): reporta pass/fail por flujo, no
  "cobertura" en el sentido de líneas — complementa, no sustituye, la cobertura de
  unit/integration.

Este documento debe actualizarse con un número real la primera vez que exista una suite
que lo produzca — no antes.
