# Generated Code Log

Este proyecto no usó un pipeline formal de generación de código por IA con logging
estructurado (no hay `prompts.md` previo, no hay metadata de generación en commits). Lo
que sigue es una reconstrucción de la **secuencia real de construcción**, extraída de
`git log --oneline` completo (33 commits en `main` al momento de este audit), agrupada
por fase — útil como sustituto de un log de generación que nunca existió formalmente.

## Secuencia real (de más antiguo a más reciente)

1. `cd8bf56` — configuración inicial + documentación (docs/ y CLAUDE.md nacen aquí)
2. `463dcb8` — backend de Supabase con schema completo y stack local
3. `0991ca9` — autenticación real con Supabase
4. `7e8ac27` → `4d17634` → `b32e676` — wizard de onboarding → NuevoTrade → Dashboard/
   Historial → Detalle de Trade → subida de imágenes (Fase 0-1-2 del roadmap original,
   una pantalla por commit, coherente con CONTRIBUTING.md §6 "un PR por tarea")
5. `5a160a8` — documenta arquitectura, decisiones y bugs reales (el origen de las
   secciones "Three real RLS bugs" y "Backend" de CLAUDE.md)
6. `73b4bbd` → `034caba` → `5c59faa` — motor de IA (Fase 3): Edge Function, luego dos
   fixes reales post-deploy (columna ambigua en rate limiting, `reasoning_effort`
   vacío de Groq)
7. `418642f` — panel de SuperAdmin (Fase 4)
8. `2f4a067` — rebrand Lineatrader → LineaTrade (afecta también un seed de prompts de
   IA, ver `20260706100000_ai_prompt_rebrand_lineatrade.sql`)
9. `58aa647` → `a59f222` → `9d69c27` → `a623cd0` → `ef4e8b1` → `faec8e3` — soporte PWA
   instalable, política de privacidad, Digital Asset Links para Android/TWA, arranque
   directo en `/dashboard` cuando la PWA está instalada, fix de fingerprint de
   `assetlinks.json`
10. `517bb98` — notificaciones toast, aviso de actualización de PWA, pantalla "Mi
    Sistema"
11. `803081e` → `d96fca1` → `3315345` — soporte de opciones, fix de corrimiento de fecha
    de vencimiento, detalle de ticket de orden + import CSV (UI-only)
12. `a8ad8bf` — carga de trades por foto vía IA con visión (`extract-trade-image`)
13. `12d014d` → `d0c717e` — configuración del proveedor de IA en SuperAdmin, elevación
    de UI manteniendo la estética
14. `7f89396` — IA Trader, Noticias, Perfil, BottomNav y navegación rediseñada — el
    commit más grande de esta secuencia por alcance, y el que más diverge de lo que
    CLAUDE.md documenta hoy
15. `60eed2a` → `d122b06` → `04d314b` → `b350f48` — fixes de compatibilidad de CLI,
    refresh de schema cache de PostgREST en producción, rediseño de Noticias como
    plataforma editorial forzando fuentes en español, responsive real (chips
    scrolleables mobile / grid 3 cols desktop)

## Observación honesta sobre este log

Este archivo se generó **retroactivamente a partir de `git log`**, no en tiempo real
durante la generación de código — por eso no incluye qué modelo/prompt produjo cada
commit. A partir de esta auditoría, si el equipo quiere un log de generación real, debe
alimentarse hacia adelante (ver `prompts.md` en la raíz de `aidlc-docs/`, que sí es
prospectivo desde este punto).
