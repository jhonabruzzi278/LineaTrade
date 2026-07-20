# SLA Definition

## Estado real: no documentado

⚠️ No existe ningún documento en el repo que defina uptime, latencia esperada, o
ventanas de mantenimiento para LineaTrade como producto. Esto es distinto del SLA de las
plataformas subyacentes:

- **Vercel** y **Supabase Cloud** publican sus propios SLA de plataforma (fuera del
  control de este equipo) — el producto hereda esos pisos, pero eso no es lo mismo que
  un SLA propio hacia los usuarios de LineaTrade.
- No hay un plan pagado de Supabase/Vercel confirmado en este audit (no se consultó
  facturación) — si el proyecto corre en tier gratuito, el SLA de plataforma real puede
  ser "best effort", no un SLA contractual.

## Lo que se puede inferir razonablemente del contexto del producto

- El producto es una bitácora personal, no un sistema de trading en vivo — un downtime
  de minutos u horas no bloquea una operación de mercado (el trader sigue pudiendo
  operar en su bróker real; solo no puede registrar el trade hasta que la app vuelva).
  Esto sugiere que el listón de disponibilidad razonable es más bajo que, por ejemplo,
  un exchange o un bróker — pero esto es una inferencia de este audit, **no una decisión
  de negocio documentada**.
- Los datos son financieros/sensibles (trades, PnL, notas psicológicas del trader) —
  aunque la disponibilidad pueda tolerar cierto downtime, la **integridad y
  confidencialidad** de los datos no deberían, y ahí sí hay compromisos reales ya
  implementados (RLS, buckets privados, Vault para BYOK) aunque no estén enunciados como
  "SLA".

## ⚠️ Pendiente de validación humana

- Definir, aunque sea informalmente, un objetivo de uptime (ej. "best effort, sin
  SLA contractual, pero monitoreado") y quién es responsable de reaccionar ante un
  incidente.
- Definir tiempo de respuesta esperado ante un reporte de bug de seguridad de un usuario
  (dado que el producto maneja datos financieros/psicológicos sensibles, esto importa
  más que la disponibilidad general).

Este documento debe ser reemplazado por un SLA real la primera vez que el Product Owner
lo defina — no se inventa un número aquí.
