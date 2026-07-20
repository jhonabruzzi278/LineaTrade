# User Stories

No existe un backlog formal de historias de usuario en el repo (no hay Issues consultados,
no hay carpeta `stories/`). Las siguientes se **reconstruyen** a partir de las pantallas
y flujos reales ya construidos — son descriptivas del comportamiento actual verificado,
no historias originales escritas antes del código. Marcadas así para que quede claro que
son extracción retroactiva, tal como pide el playbook de este audit.

## Onboarding y cuenta

- Como trader nuevo, quiero registrarme con email/contraseña y confirmar mi correo, para
  poder acceder a la app de forma segura. *(`Signup.tsx`, confirmación real vía Supabase
  Auth, verificado con Mailpit en local)*
- Como trader que olvidó su contraseña, quiero pedir un link de recuperación sin que el
  sistema me confirme si mi email existe o no, para no filtrar información de cuentas
  ajenas. *(`Recuperar.tsx` — mensaje neutro deliberado, documentado en CLAUDE.md)*
- Como trader nuevo, quiero responder un quiz corto post-registro, para que la app
  entienda mi perfil antes de mi primer trade. *(`Onboarding.tsx`)*

## Registro y seguimiento de trades

- Como trader, quiero registrar una operación (bróker, instrumento, técnica, contexto,
  psicología) manualmente, para tener mi bitácora completa sin depender de un broker
  específico. *(`NuevoTrade.tsx`)*
- Como trader, quiero registrar un trade de opciones (no solo spot/CFD), para que la
  bitácora cubra el instrumento real que usé. *(soporte agregado en
  `20260716120000_options_trading_support.sql`)*
- Como trader, quiero subir una foto de mi ticket de orden y que la IA extraiga los datos
  técnicos automáticamente, para no tener que tipear todo a mano. *(Edge Function
  `extract-trade-image`)*
- Como trader, quiero cerrar un trade indicando solo el precio de salida, y que el
  sistema calcule mi PnL y mi R automáticamente, para no cometer errores de cálculo yo
  mismo ni poder "maquillar" el resultado. *(trigger `trg_calculate_trade_pnl`)*
- Como trader, quiero adjuntar capturas de pantalla (antes/durante/después) a un trade,
  para documentar visualmente mi decisión. *(`lib/tradeImages.ts`)*
- Como trader, quiero comentar en el hilo de seguimiento de un trade abierto, para
  registrar mi razonamiento mientras la operación está viva. *(`trade_threads`)*

## Análisis y patrones

- Como trader, quiero ver mi win rate, profit factor y R promedio calculados desde mis
  trades cerrados reales, para conocer mi desempeño sin depender de mi memoria.
  *(`v_user_trade_stats`, `Dashboard.tsx`)*
- Como trader, quiero que el sistema me avise si dije que "no moví el stop-loss" pero el
  historial muestra que sí lo hice, para confrontar mi sesgo de autopercepción.
  *(`TradeDetail.tsx`, cruce contra `trade_history`)*
- Como trader, quiero pedir un análisis de IA de un trade específico, y que cite
  únicamente datos reales de mi propia bitácora (nunca cifras inventadas), para confiar
  en la interpretación sin temer una alucinación. *(Edge Function `analyze-trade`,
  `facts_cited`)*
- Como trader avanzado, quiero usar mi propia API key de un proveedor de IA (BYOK), para
  no estar limitado a 3 análisis gratuitos por día. *(`ConfiguracionIA.tsx`)*
- Como trader, quiero leer noticias de mercado en español agregadas en la app, para no
  tener que salir a buscar contexto macro en otra pestaña. *(`Noticias.tsx`)*
- Como trader, quiero definir mis objetivos, reglas y estrategias en un solo lugar
  ("Sistema"), para tener un marco de referencia contra el cual medir mi disciplina.
  *(`Sistema.tsx`)*
- Como trader nuevo, quiero responder un quiz que me recomiende un plan de trading, para
  tener un punto de partida estructurado. *(`traderPlanEngine.ts`, `PlanReport.tsx`)*

## Administración

- Como SuperAdmin, quiero ver métricas agregadas del sistema (usuarios, trades, uso de
  IA), para monitorear la salud del producto sin acceder a los datos individuales de
  ningún usuario sin que quede auditado. *(`AdminPanel.tsx`, `get_system_metrics()`)*
- Como SuperAdmin, quiero configurar qué proveedor de IA usa el sistema por defecto, para
  poder cambiarlo sin tocar código. *(`ai_provider_config`, gestionado desde el panel)*

## ⚠️ Pendiente de validación humana

Estas historias fueron reconstruidas del código, no escritas por un Product Owner antes
de construir. Un humano debería revisarlas y confirmar que reflejan la intención real,
especialmente para los módulos más nuevos y menos documentados: **IA Trader** (`/ia-trader`
no tiene ninguna historia de origen documentada en `docs/` — su propósito se infirió
únicamente del nombre de archivo y ruta).
