// Entorno de revisión visual SOLO para desarrollo (import.meta.env.DEV).
//
// Sin Docker ni backend local no se puede iniciar sesión, así que las pantallas
// autenticadas no se pueden ver en el navegador. Activar con `?mock` en la URL
// (queda guardado en sessionStorage): inyecta una sesión falsa y responde con
// datos de ejemplo a las llamadas REST/RPC de Supabase. No se incluye en el
// bundle de producción: main.tsx lo importa solo cuando DEV es verdadero.

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? ''
const USER_ID = '11111111-1111-1111-1111-111111111111'

function authStorageKey(): string {
  try {
    return `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  } catch {
    return 'sb-localhost-auth-token'
  }
}

function seedSession(): void {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365
  localStorage.setItem(
    authStorageKey(),
    JSON.stringify({
      access_token: 'mock.mock.mock',
      refresh_token: 'mock',
      expires_in: 31536000,
      expires_at: expiresAt,
      token_type: 'bearer',
      user: {
        id: USER_ID,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'alex.rivera@correo.com',
        app_metadata: {},
        user_metadata: {},
        created_at: '2026-08-01T00:00:00Z',
      },
    }),
  )
}

const day = (offset: number, hour = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  d.setHours(hour, 41, 0, 0)
  return d.toISOString()
}

interface MockTrade {
  id: string
  symbol: string
  market: string
  side: 'long' | 'short'
  status: 'open' | 'closed'
  entry: number
  exit: number | null
  stop: number | null
  size: number
  r: number | null
  amount: number | null
  offset: number
}

const TRADES: MockTrade[] = [
  { id: 't1', symbol: 'NQ', market: 'futures', side: 'long', status: 'open', entry: 20418.25, exit: null, stop: 20391, size: 2, r: null, amount: null, offset: 0 },
  { id: 't2', symbol: 'MNQ', market: 'futures', side: 'short', status: 'closed', entry: 20512, exit: 20532, stop: 20532, size: 3, r: -1, amount: -120, offset: 2 },
  { id: 't3', symbol: 'ES', market: 'futures', side: 'long', status: 'closed', entry: 5712.5, exit: 5718.5, stop: 5702.5, size: 1, r: 0.6, amount: 300, offset: 2 },
  { id: 't4', symbol: 'NQ', market: 'futures', side: 'short', status: 'closed', entry: 20610, exit: 20540, stop: 20643, size: 1, r: 2.1, amount: 1400, offset: 3 },
  { id: 't5', symbol: 'MES', market: 'futures', side: 'long', status: 'closed', entry: 5690, exit: 5688, stop: 5685, size: 4, r: -0.4, amount: -40, offset: 4 },
  { id: 't6', symbol: 'AAPL', market: 'stocks', side: 'long', status: 'closed', entry: 190, exit: 194, stop: 188, size: 50, r: 2, amount: 200, offset: 6 },
  { id: 't7', symbol: 'EURUSD', market: 'forex', side: 'short', status: 'closed', entry: 1.0912, exit: 1.0895, stop: 1.0929, size: 10000, r: 1, amount: 17, offset: 8 },
  { id: 't8', symbol: 'ES', market: 'futures', side: 'long', status: 'closed', entry: 5660, exit: 5654, stop: 5654, size: 1, r: -1, amount: -300, offset: 9 },
]

function tradeRow(t: MockTrade) {
  return {
    id: t.id,
    user_id: USER_ID,
    instrument_id: `i-${t.symbol}`,
    side: t.side,
    status: t.status,
    entry_price: t.entry,
    exit_price: t.exit,
    stop_loss: t.stop,
    take_profit: null,
    position_size: t.size,
    commission: 0,
    pnl_amount: t.amount,
    pnl_r: t.r,
    traded_at: day(t.offset),
    is_backtest: false,
    backtest_session_id: null,
    strategy_id: null,
    deleted_at: null,
    duration_minutes: t.status === 'closed' ? 38 : null,
    instruments: { symbol: t.symbol, market: t.market },
    strategies: null,
  }
}

const STATS = {
  user_id: USER_ID,
  total_trades: 36,
  open_trades: 1,
  closed_trades: 21,
  win_rate: 58,
  profit_factor: 1.74,
  avg_r: 0.42,
  total_pnl: 2840,
}

const ENTITLEMENTS = [
  ['journal', true, null, null],
  ['dashboard', true, null, null],
  ['academy', true, null, null],
  ['ai_actions', true, 3, 'day'],
  ['news_briefs', false, 0, 'month'],
  ['advanced_insights', false, 0, 'month'],
  ['advanced_alerts', false, 0, 'month'],
].map(([feature_key, enabled, hard_limit, period]) => ({ plan_key: 'free', feature_key, enabled, hard_limit, period }))

function table(path: string): string {
  const match = path.match(/\/rest\/v1\/([a-z_0-9]+)/)
  return match ? match[1] : ''
}

function respond(url: URL, accept: string): { status: number; body: unknown } {
  const wantsObject = accept.includes('vnd.pgrst.object')
  const name = table(url.pathname)

  const pick = (rows: unknown[]) => {
    if (!wantsObject) return { status: 200, body: rows }
    if (rows.length === 0) {
      return { status: 406, body: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows', hint: null } }
    }
    return { status: 200, body: rows[0] }
  }

  if (url.pathname.includes('/rpc/get_my_entitlements')) return { status: 200, body: ENTITLEMENTS }
  if (url.pathname.includes('/rpc/')) return { status: 200, body: null }

  switch (name) {
    case 'profiles':
      return pick([{ id: USER_ID, role: 'user', avatar_url: null, display_name: 'Alex Rivera', onboarding_done: true, created_at: '2026-08-01T00:00:00Z', experience_level: '1-3', account_type: 'prop', broker: 'Interactive Brokers' }])
    case 'trades': {
      const status = url.searchParams.get('status')
      let rows = TRADES.map(tradeRow)
      if (status === 'eq.open') rows = rows.filter((r) => r.status === 'open')
      const limit = Number(url.searchParams.get('limit') ?? 0)
      if (limit > 0) rows = rows.slice(0, limit)
      return pick(rows)
    }
    case 'v_user_trade_stats':
      return pick([STATS])
    case 'ai_usage_daily':
      return pick([{ user_id: USER_ID, usage_date: new Date().toISOString().slice(0, 10), requests_count: 2 }])
    default:
      return pick([])
  }
}

function installFetch(): void {
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!SUPABASE_URL || !raw.startsWith(SUPABASE_URL)) return realFetch(input, init)
    const url = new URL(raw)
    const headers = new Headers(init?.headers ?? (typeof input === 'object' && 'headers' in input ? input.headers : undefined))
    const { status, body } = respond(url, headers.get('accept') ?? '')
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }
}

export function enableMockApi(): void {
  seedSession()
  installFetch()
}
