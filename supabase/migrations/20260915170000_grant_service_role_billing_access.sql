-- Las Edge Functions de Flow (flow-start-subscription, flow-register-callback,
-- flow-subscription-callback) escriben con service_role en estas tablas, pero
-- ninguna migración de billing les dio GRANT a ese rol. service_role saltea RLS,
-- pero Postgres igual exige el privilegio de tabla: sin esto cada pago falla con
-- "permission denied" antes de evaluar cualquier policy. Mismo bug que ya pasó con
-- news_articles (20260719140000) y trades (20260722120000) — ver CLAUDE.md
-- "Three real RLS/security bugs", punto 2.

grant select, insert, update on public.billing_customers to service_role;
grant select, insert, update on public.subscriptions to service_role;
grant select, insert, update on public.billing_webhook_events to service_role;
grant select, insert, update on public.billing_checkout_sessions to service_role;
