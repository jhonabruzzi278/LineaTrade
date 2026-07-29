-- Escáner de mercado (Fase 5) — resultados globales, no por usuario: son datos de
-- mercado público (indicadores calculados sobre velas de Binance), mismo criterio que
-- news_articles (tabla global, sin user_id, sin policy owner_all). Una fila por
-- símbolo, reemplazada completa en cada corrida del cron — no es una serie histórica,
-- solo el snapshot más reciente.
create table public.scanner_results (
  symbol text primary key,
  price_change_pct numeric,
  volume_spike_ratio numeric,
  rsi_14 numeric,
  macd_line numeric,
  macd_signal numeric,
  macd_histogram numeric,
  bollinger_upper numeric,
  bollinger_lower numeric,
  -- Posición relativa del precio dentro de las bandas: 0 = tocando la banda
  -- inferior, 1 = tocando la superior, 0.5 = en la media móvil.
  bollinger_percent_b numeric,
  last_price numeric not null,
  last_candle_time bigint not null,
  scanned_at timestamptz not null default now()
);

create index idx_scanner_results_price_change on public.scanner_results(price_change_pct desc);
create index idx_scanner_results_volume_spike on public.scanner_results(volume_spike_ratio desc);

alter table public.scanner_results enable row level security;

create policy scanner_results_select_authenticated on public.scanner_results
  for select using (auth.uid() is not null);

-- Lectura para cualquier usuario autenticado (mismo criterio que news_articles);
-- escritura únicamente desde run-scanner con service_role. Grant a service_role en
-- la misma migración (no en una migración de "fix" separada) porque acá el
-- requisito ya se conoce de entrada — a diferencia de los casos históricos de este
-- repo donde el bug se descubrió recién al probar contra la base real (ver
-- CLAUDE.md "Missing GRANTs").
grant select on public.scanner_results to authenticated;
grant select, insert, update on public.scanner_results to service_role;

comment on table public.scanner_results is
  'Snapshot más reciente del escáner de mercado (cripto, Binance) — se reemplaza '
  'completo en cada corrida del cron run-scanner, no es una serie histórica.';
