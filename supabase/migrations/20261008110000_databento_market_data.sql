-- Histórico de mercado para el motor de replay. Los datos descargados pertenecen
-- al backend: RLS queda activado sin políticas para que ningún navegador pueda
-- consultar o exportar los datos con licencia directamente.

create type public.market_data_import_status as enum ('quoted', 'running', 'completed', 'failed');

create table public.market_data_series (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('databento')),
  dataset text not null,
  display_symbol text not null,
  selector_symbol text not null,
  selector_type text not null check (selector_type in ('continuous', 'parent', 'raw_symbol')),
  instrument_kind text not null check (instrument_kind in ('future', 'future_option')),
  description text not null,
  currency text not null default 'USD',
  tick_size numeric,
  contract_multiplier numeric,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, dataset, selector_symbol, selector_type)
);

comment on table public.market_data_series is
  'Series de importación del backend. MNQ.v.0 y MES.v.0 son continuas por volumen; cada barra conserva además el contrato CME efectivo para auditar el rollover.';

insert into public.market_data_series (
  provider, dataset, display_symbol, selector_symbol, selector_type,
  instrument_kind, description, tick_size, contract_multiplier
) values
  ('databento', 'GLBX.MDP3', 'MNQ', 'MNQ.v.0', 'continuous', 'future', 'Micro E-mini Nasdaq-100 futuro continuo front month por volumen', 0.25, 2),
  ('databento', 'GLBX.MDP3', 'MES', 'MES.v.0', 'continuous', 'future', 'Micro E-mini S&P 500 futuro continuo front month por volumen', 0.25, 5)
on conflict (provider, dataset, selector_symbol, selector_type) do nothing;

create table public.market_data_imports (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.market_data_series(id) on delete restrict,
  schema_name text not null check (schema_name in ('ohlcv-1m', 'mbp-1', 'definition')),
  requested_from timestamptz not null,
  requested_to timestamptz not null,
  quoted_cost_usd numeric,
  actual_cost_usd numeric,
  vendor_job_id text,
  raw_object_path text,
  checksum_sha256 text,
  status public.market_data_import_status not null default 'quoted',
  rows_written integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (requested_to > requested_from),
  check (quoted_cost_usd is null or quoted_cost_usd >= 0),
  check (actual_cost_usd is null or actual_cost_usd >= 0)
);

create index market_data_imports_series_created_idx
  on public.market_data_imports (series_id, created_at desc);

create table public.market_data_bars_1m (
  series_id uuid not null references public.market_data_series(id) on delete restrict,
  ts timestamptz not null,
  instrument_id bigint not null,
  source_symbol text not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint not null check (volume >= 0),
  ingest_id uuid references public.market_data_imports(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (series_id, ts),
  check (high >= greatest(open, close, low)),
  check (low <= least(open, close, high))
);

create index market_data_bars_1m_series_ts_desc_idx
  on public.market_data_bars_1m (series_id, ts desc);

comment on table public.market_data_bars_1m is
  'Velas OHLCV de un minuto importadas por el worker Python. instrument_id identifica el contrato efectivo bajo el continuo; su raw_symbol se resuelve desde market_data_contracts. No almacenar aquí MBO/ticks: se descargan por lote y se procesan fuera de Postgres.';

-- Las definiciones de Databento son point-in-time. Se conserva cada versión
-- para saber qué strikes y vencimientos realmente existían durante un backtest
-- y evitar el sesgo de mirar una cadena de opciones futura.
create table public.market_data_contracts (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references public.market_data_series(id) on delete set null,
  provider text not null check (provider in ('databento')),
  dataset text not null,
  instrument_id bigint not null,
  raw_symbol text not null,
  instrument_kind text not null check (instrument_kind in ('future', 'future_option')),
  underlying_instrument_id bigint,
  option_type public.option_type,
  strike_price numeric,
  expiration_at timestamptz,
  tick_size numeric,
  contract_multiplier numeric,
  definition_valid_from timestamptz not null,
  definition_valid_to timestamptz,
  definition_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, dataset, instrument_id, definition_valid_from),
  check (
    (instrument_kind = 'future' and option_type is null and strike_price is null)
    or (instrument_kind = 'future_option' and option_type is not null and strike_price is not null and expiration_at is not null)
  )
);

create index market_data_contracts_chain_idx on public.market_data_contracts
  (series_id, expiration_at, strike_price, option_type)
  where instrument_kind = 'future_option';

comment on table public.market_data_contracts is
  'Catálogo versionado de futuros y opciones sobre futuros. El worker lo llena con schema definition antes de pedir cotizaciones de opciones.';

create table public.market_data_option_quotes_1m (
  contract_id uuid not null references public.market_data_contracts(id) on delete restrict,
  ts timestamptz not null,
  bid_price numeric,
  ask_price numeric,
  bid_size bigint,
  ask_size bigint,
  last_price numeric,
  last_size bigint,
  ingest_id uuid references public.market_data_imports(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (contract_id, ts),
  check (bid_price is null or bid_price >= 0),
  check (ask_price is null or ask_price >= 0),
  check (bid_price is null or ask_price is null or ask_price >= bid_price)
);

comment on table public.market_data_option_quotes_1m is
  'Quote bars derivados de MBP-1 para contratos de opciones seleccionados. Bid y ask permiten simular entrada y salida con spread.';

alter table public.market_data_series enable row level security;
alter table public.market_data_imports enable row level security;
alter table public.market_data_bars_1m enable row level security;
alter table public.market_data_contracts enable row level security;
alter table public.market_data_option_quotes_1m enable row level security;

revoke all on public.market_data_series from anon, authenticated;
revoke all on public.market_data_imports from anon, authenticated;
revoke all on public.market_data_bars_1m from anon, authenticated;
revoke all on public.market_data_contracts from anon, authenticated;
revoke all on public.market_data_option_quotes_1m from anon, authenticated;
