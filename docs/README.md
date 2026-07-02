# Documentación — Lineatrader

Esta carpeta es la **fuente de verdad** del producto. Cualquier feature debe construirse
contra estos documentos, no contra suposiciones. Si el código contradice un doc, gana el
doc (o se corrige el doc explícitamente).

## Orden de lectura recomendado

1. **[trade-journal-os-prd-v2.md](trade-journal-os-prd-v2.md)** — PRD técnico consolidado.
   Empieza aquí: principios no negociables, decisiones de arquitectura por módulo, stack,
   taxonomía de eventos y roadmap por fases.
2. **[trade-journal-os-schema.md](trade-journal-os-schema.md)** — Schema completo de
   Supabase: tablas, RLS, triggers, índices y estrategia de migraciones. Es el **contrato
   de datos** del que se derivan todos los tipos TypeScript.
3. **[trade-journal-os-context-engine.md](trade-journal-os-context-engine.md)** — Motor de
   contexto de IA: cómo se arma el contexto por capas, la defensa anti-prompt-injection y
   la salida forzada a citar evidencia. Léelo antes de tocar cualquier cosa de IA.
4. **[lineatrader-plan-implementacion.md](lineatrader-plan-implementacion.md)** — Plan de
   implementación por fases y estado actual. Consúltalo para saber qué construir ahora.

## Regla de oro

**El backend produce hechos (SQL, determinístico); la IA solo los interpreta.** Todo en la
arquitectura (audit trail automático, contexto determinístico, snapshot inmutable, salida
que cita evidencia campo por campo) existe para que "la IA nunca inventa" sea verificable
en código, no una promesa de marketing.
