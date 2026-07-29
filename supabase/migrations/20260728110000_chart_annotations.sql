-- Un objeto dibujado sobre el gráfico (Módulo 2, ver docs/lineatrade-backtesting-plan.md
-- §1.3). No es un dibujo genérico: cada fila apunta a un confluence_type con
-- significado — el journal los lee para auto-completar las confluencias de una
-- operación (ver trade_confluences, siguiente migración). time_end/price_end nulos
-- para objetos puntuales (CHoCH flecha, Confirmación etiqueta, Mitigación círculo);
-- ambos presentes para objetos de rango (FVG/Liquidez/Order Block como cuadros, BOS
-- como línea, Zonas de Oferta/Demanda como rectángulos).
create table public.chart_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  backtest_session_id uuid references public.backtest_sessions(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete set null,
  confluence_type_id uuid not null references public.confluence_types(id) on delete restrict,
  symbol text not null,
  timeframe text not null,
  -- Unix seconds (no ms) — coincide con el UTCTimestamp que espera lightweight-charts
  -- directamente, sin conversión en cada render.
  time_start bigint not null,
  price_start numeric not null,
  time_end bigint,
  price_end numeric,
  -- true si la anotación la generó la detección automática por IA y el usuario la
  -- aceptó (en vez de dibujarla a mano) — permite medir por separado el acierto de la
  -- sugerencia de IA sin tocar el resto del modelo.
  source text not null default 'manual' check (source in ('manual', 'ai_suggested')),
  created_at timestamptz not null default now()
);

create index chart_annotations_session_idx on public.chart_annotations (backtest_session_id);
create index chart_annotations_trade_idx on public.chart_annotations (trade_id);

alter table public.chart_annotations enable row level security;

create policy chart_annotations_owner_all on public.chart_annotations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.chart_annotations to authenticated;

comment on table public.chart_annotations is
  'Objetos de dibujo semántico sobre el gráfico (Módulo 2). No es un dibujo genérico: '
  'cada fila apunta a un confluence_type con significado — el journal los lee para '
  'auto-completar las confluencias de una operación (ver trade_confluences).';
