# LineaTrade — Plataforma de Backtesting + Trading Journal Inteligente

> Plan de implementación técnico, casi listo para ejecutar. Escrito para extender el
> producto actual (ver `CLAUDE.md` para el estado real de lo que ya existe), no para
> reemplazarlo. Cada migración SQL de este documento está lista para copiarse tal cual a
> `supabase/migrations/`; los nombres de archivo, columnas y políticas siguen exactamente
> las convenciones ya establecidas en este repo (RLS + grant explícito por tabla,
> `security_invoker = true` en toda vista, `user_id` denormalizado en tablas hijas,
> comentarios en español explicando el porqué, no el qué).

## Alcance del MVP

- **Datos de mercado**: solo cripto, vía la API pública de Binance (sin API key — los
  endpoints de klines son públicos y permiten CORS desde el navegador). Forex/acciones
  quedan para después, detrás de la misma interfaz `MarketDataProvider` — agregar un
  proveedor nuevo no debería tocar el motor de gráfico ni el replay.
- **Todo lo nuevo se integra al journal existente**, no lo duplica. Una operación de
  backtest termina siendo una fila de `trades` con `is_backtest = true` — hereda gratis
  `v_user_trade_stats`, el trigger de PnL (`trg_calculate_trade_pnl`), el dashboard y el
  historial.
- **El backend calcula, el frontend nunca inventa un número** — mismo principio no
  negociable ya documentado en `CLAUDE.md` para el motor de IA, aplicado aquí a las
  estadísticas por confluencia y al motor de patrones.

---

## 1. Modelo de datos

Siete migraciones nuevas, en este orden (dependen unas de otras por FK). Fecha base
`20260722` — ajustar si al momento de implementar ya existen migraciones posteriores;
lo único que importa es que el timestamp sea mayor al de la última migración aplicada
(`ls supabase/migrations | tail -1` para confirmar antes de crear los archivos).

### 1.1 `20260722120000_backtest_sessions.sql`

Agrupa una corrida de Market Replay: qué símbolo/temporalidad/rango se está repasando,
y sirve de FK para las operaciones y anotaciones que produce esa corrida.

```sql
create table public.backtest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  timeframe text not null,
  provider text not null default 'binance',
  replay_from timestamptz not null,
  replay_to timestamptz not null,
  initial_balance numeric not null default 10000,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.backtest_sessions enable row level security;

create policy backtest_sessions_owner_all on public.backtest_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.backtest_sessions to authenticated;

comment on table public.backtest_sessions is
  'Una corrida de Market Replay (Módulo 6 del spec de backtesting). Agrupa las trades '
  'ficticias y las anotaciones de dibujo (chart_annotations) que produce esa corrida.';
```

### 1.2 `20260722130000_confluence_types.sql`

Catálogo de objetos de dibujo semántico (Módulo 2 + Módulo 8 — presets del sistema y
confluencias definidas por el usuario en la misma tabla, distinguidas por `is_system`).
`user_id` nullable representa un preset visible para todos; nunca editable por nadie.

```sql
create table public.confluence_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  color text not null,
  shape text not null check (shape in ('square', 'rectangle', 'circle', 'arrow', 'line', 'label')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un usuario no puede repetir el nombre de una confluencia propia, ni pisar el nombre
-- de un preset del sistema. coalesce colapsa "null" (sistema) a un uuid fijo para que
-- el índice único trate todos los presets del sistema como un mismo "dueño" a efectos
-- de unicidad de nombre.
create unique index confluence_types_owner_name_uniq on public.confluence_types (
  coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), name
);

alter table public.confluence_types enable row level security;

-- Cuatro políticas separadas (no un solo "for all") porque select tiene una regla más
-- amplia (presets del sistema + propias) que insert/update/delete (solo propias, y
-- nunca sobre is_system = true — evita que un usuario edite o borre un preset global).
create policy confluence_types_select on public.confluence_types
  for select using (is_system = true or user_id = auth.uid());

create policy confluence_types_insert on public.confluence_types
  for insert with check (user_id = auth.uid() and is_system = false);

create policy confluence_types_update on public.confluence_types
  for update using (user_id = auth.uid() and is_system = false)
  with check (user_id = auth.uid() and is_system = false);

create policy confluence_types_delete on public.confluence_types
  for delete using (user_id = auth.uid() and is_system = false);

grant select, insert, update, delete on public.confluence_types to authenticated;

-- Presets del sistema (Módulo 2 del spec) — colores elegidos para no chocar con los
-- tokens semánticos gain/loss/signal de src/index.css, ver docs/lineatrade-design-system.md.
insert into public.confluence_types (user_id, name, color, shape, is_system) values
  (null, 'Fair Value Gap (FVG)', '#3B82F6', 'square', true),
  (null, 'Liquidez', '#EF4444', 'square', true),
  (null, 'Order Block', '#22C55E', 'square', true),
  (null, 'CHoCH', '#EAB308', 'arrow', true),
  (null, 'BOS', '#A855F7', 'line', true),
  (null, 'Zona de Oferta', '#F97316', 'rectangle', true),
  (null, 'Zona de Demanda', '#38BDF8', 'rectangle', true),
  (null, 'Mitigación', '#94A3B8', 'circle', true),
  (null, 'Confirmación', '#FACC15', 'label', true);
```

### 1.3 `20260722140000_chart_annotations.sql`

Un objeto dibujado sobre el gráfico. `time_end`/`price_end` nulos para objetos puntuales
(flechas, etiquetas); ambos presentes para zonas/rectángulos (FVG, órdenes, oferta/demanda).

```sql
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
```

### 1.4 `20260722150000_trade_confluences.sql`

Tabla puente — qué confluencias tenía una operación. Población 100% automática (Módulo
3: nunca se escribe a mano): al abrir una trade de backtest, el frontend copia acá las
`confluence_type_id` de todas las `chart_annotations` visibles hasta la vela actual.

```sql
create table public.trade_confluences (
  trade_id uuid not null references public.trades(id) on delete cascade,
  confluence_type_id uuid not null references public.confluence_types(id) on delete restrict,
  -- Denormalizado a propósito, mismo patrón que trade_orders/trade_threads (ver
  -- CLAUDE.md "Options trading & order tickets") — evita un join a trades solo para
  -- resolver el dueño en cada policy.
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trade_id, confluence_type_id)
);

alter table public.trade_confluences enable row level security;

create policy trade_confluences_owner_all on public.trade_confluences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.trade_confluences to authenticated;
```

### 1.5 `20260722160000_trades_backtest_and_psychology_fields.sql`

Extiende `trades` — reusa la tabla real en vez de crear una tabla `backtest_trades`
paralela, así el backtest hereda dashboard/stats/historial sin código nuevo. También
completa los campos psicológicos que pedía el spec y que `trades` todavía no tenía
(`confidence_level`, `stress_level`, `followed_plan`, `had_fomo`, `moved_stop_loss`,
`revenge_trade`, `overtraded` ya existen desde antes — ver `PsychologySection.tsx`).

```sql
alter table public.trades
  add column is_backtest boolean not null default false,
  add column backtest_session_id uuid references public.backtest_sessions(id) on delete set null,
  add column fear_level smallint check (fear_level between 1 and 10),
  add column anxiety_level smallint check (anxiety_level between 1 and 10),
  add column closed_early boolean,
  add column moved_take_profit boolean,
  add column entered_impulsively boolean,
  add column hesitated boolean,
  add column overconfidence boolean,
  add column had_distractions boolean;

create index trades_backtest_session_idx on public.trades (backtest_session_id)
  where backtest_session_id is not null;

comment on column public.trades.is_backtest is
  'true si esta operación viene de una corrida de Market Replay (Módulo 6), no de una '
  'operación real. El dashboard principal debe filtrar por is_backtest = false por '
  'default — ver "Decisiones abiertas" al final de este documento.';
```

### 1.6 `20260722170000_confluence_stats_views.sql`

Módulo 5 — win rate por confluencia individual y por *combinación* de confluencias.
`security_invoker = true` es obligatorio en las tres (regla no negociable de este repo,
ver `CLAUDE.md` → "Views bypass RLS by default").

```sql
-- Win rate de cada confluencia individual, sin importar con qué más apareció.
create view public.v_user_stats_by_confluence_single
with (security_invoker = true)
as
select
  tc.user_id,
  ct.id as confluence_type_id,
  ct.name as confluence_name,
  count(*) as total_trades,
  round(
    count(*) filter (where t.pnl_amount > 0)::numeric
    / nullif(count(*), 0) * 100, 2
  ) as win_rate,
  round(avg(t.pnl_r), 2) as avg_r
from public.trade_confluences tc
join public.trades t on t.id = tc.trade_id
join public.confluence_types ct on ct.id = tc.confluence_type_id
where t.deleted_at is null and t.status = 'closed'
group by tc.user_id, ct.id, ct.name;

grant select on public.v_user_stats_by_confluence_single to authenticated;

-- Win rate por SET exacto de confluencias (ej. "Liquidez + FVG + BOS" vs "FVG solo").
-- El having >= 3 es la misma regla de "data_sufficiency" que ya usa el motor de IA
-- (ver contextBuilder.ts) aplicada acá: sin esto, una combinación que ocurrió una sola
-- vez mostraría "100% win rate", que no es una señal, es ruido con una sola muestra.
create view public.v_user_stats_by_confluence_combo
with (security_invoker = true)
as
select
  combo.user_id,
  combo.confluence_names,
  count(*) as total_trades,
  round(
    count(*) filter (where combo.pnl_amount > 0)::numeric
    / nullif(count(*), 0) * 100, 2
  ) as win_rate,
  round(avg(combo.pnl_r), 2) as avg_r
from (
  select
    t.id as trade_id,
    t.user_id,
    t.pnl_amount,
    t.pnl_r,
    array_agg(ct.name order by ct.name) as confluence_names
  from public.trades t
  join public.trade_confluences tc on tc.trade_id = t.id
  join public.confluence_types ct on ct.id = tc.confluence_type_id
  where t.deleted_at is null and t.status = 'closed'
  group by t.id, t.user_id, t.pnl_amount, t.pnl_r
) combo
group by combo.user_id, combo.confluence_names
having count(*) >= 3;

grant select on public.v_user_stats_by_confluence_combo to authenticated;

-- Porcentajes psicológicos del Módulo 5 (FOMO, impulsividad, disciplina, etc.).
create view public.v_user_psychology_stats
with (security_invoker = true)
as
select
  user_id,
  count(*) as total_trades,
  round(count(*) filter (where had_fomo)::numeric / nullif(count(*), 0) * 100, 2) as pct_fomo,
  round(count(*) filter (where entered_impulsively)::numeric / nullif(count(*), 0) * 100, 2) as pct_impulsive,
  round(count(*) filter (where followed_plan = false)::numeric / nullif(count(*), 0) * 100, 2) as pct_off_plan,
  round(count(*) filter (where followed_plan = true)::numeric / nullif(count(*), 0) * 100, 2) as pct_disciplined,
  round(count(*) filter (where moved_stop_loss)::numeric / nullif(count(*), 0) * 100, 2) as pct_moved_stop,
  round(count(*) filter (where moved_take_profit)::numeric / nullif(count(*), 0) * 100, 2) as pct_moved_tp,
  round(count(*) filter (where revenge_trade)::numeric / nullif(count(*), 0) * 100, 2) as pct_revenge,
  round(count(*) filter (where overtraded)::numeric / nullif(count(*), 0) * 100, 2) as pct_overtraded,
  round(count(*) filter (where hesitated)::numeric / nullif(count(*), 0) * 100, 2) as pct_hesitated,
  round(count(*) filter (where overconfidence)::numeric / nullif(count(*), 0) * 100, 2) as pct_overconfidence
from public.trades
where deleted_at is null and status = 'closed' and is_backtest = false
group by user_id;

grant select on public.v_user_psychology_stats to authenticated;
```

### 1.7 `20260722180000_grant_new_backtesting_tables.sql`

Recordatorio explícito del bug #2 ya documentado en `CLAUDE.md` ("Missing GRANTs") —
cada tabla nueva ya lleva su propio `grant` en la migración que la crea (arriba), así
que este archivo es opcional/redundante si se siguió el orden anterior. Se deja como
checkpoint: correr esta query después de aplicar 1.1–1.6 y confirmar que las 4 tablas
nuevas devuelven `true`:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('backtest_sessions', 'confluence_types', 'chart_annotations', 'trade_confluences');
```

---

## 2. Proveedor de datos de mercado (Binance)

`GET https://api.binance.com/api/v3/klines` es público, sin API key, con CORS habilitado
para navegador. Límite duro: **máx. 1000 velas por request**. Esto importa para el
diseño del replay — retroceder "hasta un año" en 1 minuto son ~525.000 velas, imposible
de traer de una sola vez. La solución es paginar hacia atrás con `endTime`, cargando de
a 1000 velas conforme el usuario retrocede en el replay, no un fetch inicial gigante.

```ts
// src/lib/marketData/types.ts
export type Kline = {
  time: number // unix seconds — coincide con UTCTimestamp de lightweight-charts
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type MarketInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export interface MarketDataProvider {
  readonly id: string
  listSymbols(): Promise<string[]>
  getKlines(params: {
    symbol: string
    interval: MarketInterval
    endTime?: number // unix ms — para paginar hacia atrás
    limit?: number
  }): Promise<Kline[]>
}
```

```ts
// src/lib/marketData/binanceProvider.ts
import type { Kline, MarketDataProvider, MarketInterval } from './types'

const BINANCE_KLINES_MAX_LIMIT = 1000
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3'

function toKline(row: unknown[]): Kline {
  return {
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }
}

export const binanceProvider: MarketDataProvider = {
  id: 'binance',

  async listSymbols() {
    const res = await fetch(`${BINANCE_BASE_URL}/exchangeInfo`)
    if (!res.ok) throw new Error(`Binance exchangeInfo error: ${res.status}`)
    const data = await res.json() as { symbols: { symbol: string; quoteAsset: string; status: string }[] }
    return data.symbols
      .filter((s) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map((s) => s.symbol)
  },

  async getKlines({ symbol, interval, endTime, limit = BINANCE_KLINES_MAX_LIMIT }) {
    const url = new URL(`${BINANCE_BASE_URL}/klines`)
    url.searchParams.set('symbol', symbol)
    url.searchParams.set('interval', interval)
    url.searchParams.set('limit', String(Math.min(limit, BINANCE_KLINES_MAX_LIMIT)))
    if (endTime) url.searchParams.set('endTime', String(endTime))

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)
    const raw = await res.json() as unknown[][]
    return raw.map(toKline)
  },
}
```

`interval` de `MarketInterval` mapea 1:1 a los valores que Binance ya espera (`1m`,
`5m`, `15m`, `1h`, `4h`, `1d`) — no hace falta tabla de conversión.

**Límite recomendado de retroceso por temporalidad** (para no reventar de requests
paginados en un `while` sin fin): 1m → últimos 7 días, 5m/15m → último mes, 1h/4h →
últimos 6 meses, 1d → 2 años. Documentar esto como constante (`MAX_LOOKBACK_BY_INTERVAL`)
y cortar la paginación ahí, con un mensaje "no hay más histórico disponible en esta
temporalidad" en vez de dejar que el usuario pida infinito.

---

## 3. Motor de gráfico y replay

**Librería**: `lightweight-charts` (v5.x, MIT, mismo equipo que TradingView). Agregar a
`package.json` — es la única dependencia de gráfico nueva; no está instalada hoy.

```bash
npm install lightweight-charts
```

### 3.1 Estado del replay

```ts
// src/hooks/useMarketReplay.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Kline } from '../lib/marketData/types'

const DEFAULT_SPEED_MS = 800

export function useMarketReplay(klines: Kline[]) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(DEFAULT_SPEED_MS)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!isPlaying) return
    intervalRef.current = setInterval(() => {
      setCurrentIndex((i) => {
        if (i >= klines.length - 1) {
          setIsPlaying(false)
          return i
        }
        return i + 1
      })
    }, speedMs)
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, speedMs, klines.length])

  const stepForward = useCallback((n = 1) => {
    setCurrentIndex((i) => Math.min(i + n, klines.length - 1))
  }, [klines.length])

  const stepBackward = useCallback((n = 1) => {
    setCurrentIndex((i) => Math.max(i - n, 0))
  }, [])

  // "Ocultar el futuro" (Módulo 1) — el gráfico solo recibe este slice, nunca el
  // array completo. No es un estilo visual, es la garantía real de que el usuario
  // no puede ver velas futuras por inspeccionar el DOM/estado.
  const visibleKlines = klines.slice(0, currentIndex + 1)

  return { currentIndex, visibleKlines, isPlaying, setIsPlaying, speedMs, setSpeedMs, stepForward, stepBackward }
}
```

### 3.2 `ChartEngine.tsx` — API de lightweight-charts v5

```tsx
// src/components/backtesting/ChartEngine.tsx
import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import type { Kline } from '../../lib/marketData/types'

type Props = {
  klines: Kline[]
}

export function ChartEngine({ klines }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi>()
  const seriesRef = useRef<ISeriesApi<'Candlestick'>>()

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#94A3B8' },
      grid: { vertLines: { color: '#1E293B' }, horzLines: { color: '#1E293B' } },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => chart.remove()
  }, [])

  useEffect(() => {
    seriesRef.current?.setData(klines)
  }, [klines])

  return <div ref={containerRef} className="h-full w-full" />
}
```

Nota de colores: reusar los tokens `gain`/`loss` de `src/index.css` en vez de los hex
literales de arriba — este snippet los deja explícitos solo para que el ejemplo sea
autocontenido; en la implementación real, leer `getComputedStyle` o exportar los valores
del `@theme` block a un objeto TS compartido.

### 3.3 Layout de página

`Backtesting.tsx` **no** debería usar `<AppHeader/>` + `<AppFloatingNav/>` con el `pb-28`
estándar — un gráfico de replay necesita el máximo alto de viewport posible. Seguir el
mismo patrón "modo foco" que `WizardLayout` ya usa para `Onboarding`/`NuevoTrade` (sin
nav global, con su propio header mínimo de vuelta al dashboard).

---

## 4. Sistema de dibujo semántico

Esta es la parte técnicamente más difícil del plan — vale la pena un spike de un día
antes de comprometerse a la implementación completa. Dos mecanismos distintos según el
tipo de objeto, ambos nativos de `lightweight-charts` v5 (no requieren un canvas propio
por fuera de la librería):

- **Objetos puntuales** (CHoCH flecha, Confirmación etiqueta, Mitigación círculo) →
  API de **series markers** (`createSeriesMarkers(series, markers)`), que ya soporta
  forma, color y texto por punto. Un click en el gráfico durante el modo dibujo agrega
  un marker en `(time, price)` de la vela clickeada.
- **Objetos de rango** (FVG, Liquidez, Order Block como cuadros; BOS como línea; Zonas de
  Oferta/Demanda como rectángulos) → requieren un **`ISeriesPrimitive`** custom (la API
  de plugins de la librería para dibujar formas arbitrarias sincronizadas con los ejes
  de tiempo/precio). Esto es más trabajo: implica un plugin de "rectángulo entre dos
  puntos" que siga patrones ya documentados en el repo oficial de ejemplos de
  `lightweight-charts` (`plugin-examples`) — no hay que inventar la lógica de conversión
  tiempo↔coordenada desde cero, esa parte la resuelve la API de primitives.

**Flujo de dibujo**: `DrawingToolbar.tsx` con un selector de `confluence_type` (trae los
presets del sistema + los del usuario vía `confluence_types`) → al activarse, el próximo
click (o click+drag para objetos de rango) sobre el gráfico inserta una fila en
`chart_annotations` con las coordenadas resueltas por `chart.timeScale().coordinateToTime()`
/ conversión de precio del eje Y.

`ConfluenceLegendPanel.tsx` — lista lateral que se recalcula en cada `currentIndex` del
replay, mostrando solo anotaciones con `time_start <= visibleKlines.at(-1).time` (las que
ya "pasaron" en el replay). Esta lista es literalmente el insumo de la Sección 5.

---

## 5. Registro automático de operaciones

`BacktestOrderPanel.tsx` — botones "Comprar"/"Vender" visibles durante el replay activo.
Reusa los mismos campos de riesgo que `TechnicalEntryPanel.tsx` (stop loss, take profit,
tamaño), pero auto-completa lo que el spec pide que nunca se tipee:

```ts
// src/lib/backtestTrades.ts
export async function openBacktestTrade(params: {
  session: BacktestSession
  currentKline: Kline
  side: 'long' | 'short'
  stopLoss: number | null
  takeProfit: number | null
  positionSize: number
  visibleAnnotations: ChartAnnotation[] // ya filtradas por currentIndex
}) {
  const { data: trade, error } = await supabase
    .from('trades')
    .insert({
      instrument_id: await resolveInstrumentId(params.session.symbol, 'crypto'),
      side: params.side,
      entry_price: params.currentKline.close,
      stop_loss: params.stopLoss,
      take_profit: params.takeProfit,
      position_size: params.positionSize,
      traded_at: new Date(params.currentKline.time * 1000).toISOString(),
      timeframe: params.session.timeframe,
      status: 'open',
      is_backtest: true,
      backtest_session_id: params.session.id,
    })
    .select()
    .single()
  if (error) throw error

  // Confluencias detectadas automáticamente — Módulo 3, cero input manual.
  const uniqueConfluenceIds = [...new Set(params.visibleAnnotations.map((a) => a.confluence_type_id))]
  if (uniqueConfluenceIds.length > 0) {
    await supabase.from('trade_confluences').insert(
      uniqueConfluenceIds.map((confluenceTypeId) => ({
        trade_id: trade.id,
        confluence_type_id: confluenceTypeId,
        user_id: trade.user_id,
      }))
    )
  }

  return trade
}
```

`resolveInstrumentId` ya existe en `lib/instruments.ts` — reusar tal cual, pasando
`market: 'crypto'`.

Cerrar la operación es el mismo `update({ exit_price, status: 'closed' })` que ya usa
`TradeDetail.tsx` — `trg_calculate_trade_pnl` calcula `pnl_amount`/`pnl_r` sin cambios,
porque el trigger no distingue `is_backtest`. `exit_price` es el `close` de la vela en
el `currentIndex` del momento en que el usuario clickea "Cerrar" durante el replay.

Al terminar la sesión: `update backtest_sessions set ended_at = now()`. La operación ya
vive en `trades` desde que se abrió — no hay un paso de "migración al journal", porque
nunca estuvo en otro lado (esto es literalmente lo que pide el Módulo 6: "toda esa
información pasa automáticamente al Journal", sin ningún paso intermedio que copie datos).

---

## 6. Dashboard extendido (Módulo 7)

No hay librería de gráficos instalada hoy (`recharts`, mencionado como intención en el
PRD original, nunca se agregó). Agregar:

```bash
npm install recharts
```

Nuevos componentes bajo `src/components/dashboard/`:

- `EquityCurveChart.tsx` — `LineChart` de Recharts sobre `trades` ordenadas por
  `traded_at`, `pnl_amount` acumulado. Filtrar `is_backtest = false` por default (ver
  decisión abierta #1).
- `PerformanceByDimensionChart.tsx` — componente genérico, recibe `dimension: 'symbol' |
  'weekday' | 'timeframe' | 'strategy'` y agrupa client-side sobre las trades ya
  cargadas (no hace falta una vista SQL por dimensión — son agregaciones simples sobre
  datos que el dashboard ya trae).
- `ConfluenceComboTable.tsx` — tabla ordenada por `win_rate` desc, consume
  `v_user_stats_by_confluence_combo` directamente.
- `PsychologyStatsPanel.tsx` — grid de porcentajes, consume `v_user_psychology_stats`.

**"Rendimiento por sesión" necesita una definición de sesión (Asia/Londres/NY) que el
spec no fija** — ver decisión abierta #2 antes de implementar esta única pieza.

---

## 7. Confluencias personalizadas (Módulo 8)

UI de CRUD sobre `confluence_types` (solo filas propias, `is_system = false`) — encaja
como una cuarta pestaña en `/sistema` junto a Objetivos/Reglas/Estrategias, mismo patrón
de `ObjectivesSection.tsx`/`RulesSection.tsx` (soft-delete no aplica acá porque no hay
columna `deleted_at`; un hard delete es aceptable ya que `chart_annotations` referencia
`confluence_type_id` con `on delete restrict` — no se puede borrar una confluencia que
ya se usó en un dibujo, lo cual es el comportamiento correcto).

`ConfluenceTypeManager.tsx` — nombre, selector de color (paleta fija de ~12 opciones,
no un color picker libre, para mantener contraste legible sobre el fondo oscuro del
gráfico), selector de forma (los 6 valores del check constraint).

---

## 8. Motor de patrones (Módulo 9)

Dos capas, seguir exactamente el patrón ya construido en `analyze-trade` +
`contextBuilder.ts` (`supabase/functions/_shared/contextBuilder.ts`):

**Capa determinística (sin IA)** — los números salen de
`v_user_stats_by_confluence_combo`, `v_user_psychology_stats`, y agregaciones por
día-de-semana/hora sobre `trades`. Ningún LLM calcula nada acá, mismo principio ya
enunciado en `CLAUDE.md`.

**Capa narrativa (opcional, reusa el motor de IA existente)** — nueva función
`supabase/functions/analyze-patterns/`, mismo esqueleto que `analyze-trade`: arma un
contexto estructurado, se lo pasa al `AIProvider` ya configurado (BYOK o default vía
Vault), y le pide **solo redactar** las frases tipo "Tu Win Rate aumenta un 18% cuando
esperas un CHoCH" a partir de números que ya existen en el contexto — nunca que el
modelo calcule el 18% él mismo.

```ts
// supabase/functions/_shared/patternContextBuilder.ts — mismo espíritu que
// contextBuilder.ts: cada número sale literal de una vista, nunca se inventa acá.
type PatternContext = {
  confluence_combos: { names: string[]; win_rate: number | null; total_trades: number }[]
  psychology: { pct_fomo: number | null; pct_off_plan: number | null; pct_moved_stop: number | null /* … */ }
  by_weekday: { weekday: string; win_rate: number | null; total_trades: number }[]
  by_symbol: { symbol: string; win_rate: number | null; total_trades: number }[]
  meta: { data_sufficiency: 'insufficient' | 'limited' | 'sufficient' }
}
```

`data_sufficiency` se calcula igual que hoy (`calculateDataSufficiency`, umbral de 5/20
trades cerradas) — reusar la función tal cual, no reimplementarla.

---

## 9. Estructura de archivos nueva

```
src/
  lib/
    marketData/
      types.ts
      binanceProvider.ts
      klineCache.ts            # cache en memoria por symbol+interval, mismo patrón 5-min de lib/news.ts
    confluenceTypes.ts          # CRUD sobre confluence_types
    chartAnnotations.ts         # CRUD sobre chart_annotations
    backtestSessions.ts         # crear/cerrar sesión
    backtestTrades.ts           # openBacktestTrade/closeBacktestTrade (Sección 5)
  hooks/
    useMarketReplay.ts
  components/
    backtesting/
      ChartEngine.tsx
      SymbolTimeframePicker.tsx
      ReplayControls.tsx
      DrawingToolbar.tsx
      ConfluenceLegendPanel.tsx
      BacktestOrderPanel.tsx
    confluences/
      ConfluenceTypeManager.tsx
    dashboard/
      EquityCurveChart.tsx
      PerformanceByDimensionChart.tsx
      ConfluenceComboTable.tsx
      PsychologyStatsPanel.tsx
  pages/
    Backtesting.tsx              # ruta /backtesting
supabase/
  functions/
    analyze-patterns/
      index.ts
    _shared/
      patternContextBuilder.ts
  migrations/
    20260722120000_backtest_sessions.sql
    20260722130000_confluence_types.sql
    20260722140000_chart_annotations.sql
    20260722150000_trade_confluences.sql
    20260722160000_trades_backtest_and_psychology_fields.sql
    20260722170000_confluence_stats_views.sql
```

### Ruta nueva en `App.tsx`

```tsx
<Route
  path="/backtesting"
  element={
    <ProtectedRoute>
      <Backtesting />
    </ProtectedRoute>
  }
/>
```

Link de entrada: agregar a `Perfil.tsx` (junto a Historial/Sistema/Configuración IA),
no al `AppFloatingNav` — mismo criterio ya aplicado a `/sistema` e `/ia-trader`, que
tampoco están en la barra principal.

---

## 10. Checklist de implementación, fase por fase

**2026-07-27 — Fases A/B/C/E shipped como MVP "accesible" (ver CLAUDE.md → "Backtesting
(Market Replay)" para el detalle completo). D/F/G/H/I quedan deliberadamente afuera,
no son un olvido — el pedido explícito fue "la forma más accesible", y D en particular
es "la pieza de mayor riesgo técnico del plan" por diseño propio de este documento, no
algo para apurar en la misma pasada que el resto.** Diferencias reales contra el spec
original de cada fase construida:

- [x] **Fase A** — solo `backtest_sessions` + `trades.is_backtest`/`backtest_session_id`
      (migración `20260727110000_backtesting_mvp.sql`, no 7 migraciones separadas). Los
      8 campos psicológicos nuevos de la sección 1.5 (`fear_level`, `anxiety_level`,
      etc.) NO se agregaron — YAGNI, nada en el v1 los lee. `confluence_types`/
      `chart_annotations`/`trade_confluences` (1.2–1.4) tampoco existen todavía. Además
      de las migraciones propias del plan, esta migración también actualiza las 4
      vistas agregadas *ya existentes* (`v_user_trade_stats` y las otras 3) para excluir
      `is_backtest = true` — resuelve la "decisión abierta #1" de la sección 11 con el
      default que el propio plan ya recomendaba.
- [x] **Fase B** — `ChartEngine.tsx` + `binanceProvider.ts`, pero terminada como pieza
      de producción, no como spike descartable. Un hallazgo real de este spike que el
      plan no anticipaba: `autoSize: true` ignora llamadas manuales a `chart.resize()`
      mientras el `ResizeObserver` esté disponible (documentado en el propio `.d.ts` de
      la librería) — `ChartEngine.tsx` usa un `ResizeObserver` propio en vez de
      `autoSize` para tener control explícito.
- [x] **Fase C** — `useMarketReplay.ts` + `ReplayControls.tsx`, con un fix real sobre el
      snippet del plan: `useRef<ReturnType<typeof setInterval>>()` sin valor inicial no
      compila en modo estricto — necesita `| null` y un valor inicial.
- [ ] **Fase D — NO construida.** `DrawingToolbar.tsx`, el sistema de confluencias
      semánticas completo, y el `ISeriesPrimitive` de rectángulos quedan pendientes.
- [x] **Fase E** — `BacktestOrderPanel.tsx` + `backtestTrades.ts`, versión simplificada
      sin el auto-tracking de confluencias de la Sección 5 (depende de D, que no existe
      todavía). Un fix real sobre el snippet del plan: `resolveInstrumentId` ya
      requiere un tercer parámetro (`userId`) que el ejemplo original omitía. Verificado
      de punta a punta contra Binance real (no mockeado): 2880 velas reales para
      `BTCUSDT`/`15m` (matemática de paginación exacta), una operación simulada abierta
      y cerrada con precios reales, cayendo en `/historial` con `pnl_amount` calculado
      por el trigger existente sin cambios.
- [ ] **Fase F — NO construida.** Las vistas de confluencias (`v_user_stats_by_confluence_*`)
      dependen de Fase D.
- [ ] **Fase G — NO construida.** `recharts` no se instaló; sin `EquityCurveChart` ni el
      resto del dashboard extendido.
- [ ] **Fase H — NO construida.** Sin gestor de confluencias en `/sistema` (depende de D).
- [ ] **Fase I — NO construida.** Sin motor de patrones, ni capa determinística ni
      `analyze-patterns` (la capa determinística sola ya dependía de las vistas de
      confluencias de F).

**Dos bugs reales encontrados durante la verificación en browser, no anticipados por
el plan, y arreglados en la misma pasada** (fuera del alcance de las 7 migraciones
originales, en el código de `Dashboard.tsx`/`TradeListRow.tsx`):

1. La lista "Últimos trades" de `/dashboard` no filtraba `is_backtest` — a diferencia de
   las 4 vistas agregadas (que sí se corrigieron arriba), esa lista es una query directa
   sobre `trades`, y una operación de práctica aparecía ahí igual que una real. Se agregó
   `.eq('is_backtest', false)` a esa query.
2. `TradeListRow.tsx` (compartido por Dashboard e Historial) no distinguía visualmente
   una operación de backtest de una real — en Historial, donde sí deben aparecer, no
   había forma de saber cuál era cuál. Se agregó un badge "práctica" condicional a
   `trade.is_backtest`.

Si en algún momento se retoma el plan completo, D es el punto de partida correcto — es
la única pieza que bloquea F, H, e I simultáneamente.

---

## 11. Decisiones abiertas (necesitan una respuesta antes de tocar el código de esas piezas puntuales)

1. **¿El dashboard principal (`/dashboard`) debe excluir `is_backtest = true` por
   default, o mostrar todo mezclado con un filtro?** Recomendado: excluir por default
   (una cuenta nueva practicando backtesting no debería ver su "Profit Factor" real
   inflado por operaciones ficticias) — esto significa tocar `v_user_trade_stats` para
   agregar `and is_backtest = false` al `where`, lo cual es un cambio a una vista ya en
   producción, no trivial.
2. **Definición de sesión de trading (Asia/Londres/NY) para "rendimiento por sesión"** —
   el spec no la fija y varía según convención/broker. Propuesta default (UTC):
   Asia 00:00–08:00, Londres 07:00–16:00, NY 12:00–21:00 (con solapamiento real,
   como en la práctica) — necesita confirmación antes de escribir la función SQL
   `trading_session_for(ts)`.
3. **Alcance de precisión del click de entrada/salida en el replay** — este plan usa el
   `close` de la vela actual como precio de entrada/salida (más simple, determinístico).
   Una alternativa más realista es dejar que el usuario clickee un precio exacto dentro
   del rango de la vela — más fiel al mercado real pero bastante más trabajo de UI.
