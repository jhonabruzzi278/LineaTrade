import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Plus } from 'lucide-react'
import { OrderTicketFields, emptyOrderTicket, hasOrderTicketData, type OrderTicketData } from '../components/trade/OrderTicketFields'
import { PriceMap } from '../components/trade/PriceMap'
import { TradeImagesCard } from '../components/trade/TradeImagesCard'
import { Callout } from '../components/ui/callout'
import { Card } from '../components/ui/card'
import { FIELD_CLASS } from '../components/ui/field'
import { ProgressBar } from '../components/ui/progress-bar'
import { SparkButton } from '../components/ui/spark-button'
import { Tag } from '../components/ui/tag'
import { useAuth } from '../lib/auth'
import { getErrorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { combineDateTimeToIso, formatDateOnly } from '../lib/tradeDisplay'
import { formatDuration, formatR, formatSignedFixed, marketLabel, plannedRisk } from '../lib/tradeRowDisplay'
import { cn } from '@/lib/utils'
import type { Database } from '../types/database'

type Trade = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
  strategies: Pick<Database['public']['Tables']['strategies']['Row'], 'name'> | null
}
type TradeOrder = Database['public']['Tables']['trade_orders']['Row']

const TRADE_SELECT = '*, instruments(symbol, market), strategies(name)'
const PRICE_TYPE_LABELS: Record<string, string> = { market: 'Market', limit: 'Limit' }

function localToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [stopLossChanges, setStopLossChanges] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [exitPrice, setExitPrice] = useState('')
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [orderTickets, setOrderTickets] = useState<TradeOrder[]>([])
  const [showOrders, setShowOrders] = useState(false)
  const [closeOrderTicket, setCloseOrderTicket] = useState<OrderTicketData>(emptyOrderTicket)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      const [tradeRes, historyRes, ordersRes] = await Promise.all([
        supabase.from('trades').select(TRADE_SELECT).eq('id', id!).maybeSingle(),
        supabase
          .from('trade_history')
          .select('id', { count: 'exact', head: true })
          .eq('trade_id', id!)
          .eq('field_name', 'stop_loss'),
        supabase.from('trade_orders').select('*').eq('trade_id', id!),
      ])
      if (cancelled) return

      // RLS y un id inexistente dan el mismo estado: no se revela si el trade es de otra persona.
      if (tradeRes.error || !tradeRes.data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setTrade(tradeRes.data as Trade)
      setStopLossChanges(historyRes.count ?? 0)
      setOrderTickets(ordersRes.data ?? [])
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleCloseTrade(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!trade) return
    const parsed = Number(exitPrice)
    if (!exitPrice || Number.isNaN(parsed)) {
      setCloseError('Ingresa un precio de salida válido.')
      return
    }
    setClosing(true)
    setCloseError(null)
    // pnl_amount y pnl_r los calcula el backend (trigger trades_calculate_pnl): el
    // cliente solo envía exit_price y status, nunca el resultado.
    const { data, error: closeErr } = await supabase
      .from('trades')
      .update({ exit_price: parsed, status: 'closed' })
      .eq('id', trade.id)
      .select(TRADE_SELECT)
      .single()
    setClosing(false)
    if (closeErr) {
      setCloseError(getErrorMessage(closeErr))
      return
    }
    setTrade(data as Trade)
    if (user && hasOrderTicketData(closeOrderTicket)) {
      const orderPlacedAt = closeOrderTicket.orderPlacedTime
        ? combineDateTimeToIso(localToday(), closeOrderTicket.orderPlacedTime)
        : null
      const { data: orderRow } = await supabase
        .from('trade_orders')
        .insert({
          trade_id: trade.id,
          user_id: user.id,
          leg: 'close',
          order_number: closeOrderTicket.orderNumber || null,
          order_placed_at: orderPlacedAt,
          price_type: closeOrderTicket.priceType || null,
          limit_price: closeOrderTicket.limitPrice ? Number(closeOrderTicket.limitPrice) : null,
          bid_price: closeOrderTicket.bidPrice ? Number(closeOrderTicket.bidPrice) : null,
          ask_price: closeOrderTicket.askPrice ? Number(closeOrderTicket.askPrice) : null,
          term: closeOrderTicket.term || null,
          all_or_none: closeOrderTicket.allOrNone,
        })
        .select('*')
        .single()
      if (orderRow) setOrderTickets((prev) => [...prev, orderRow])
    }
    showToast('Trade cerrado.', 'success')
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 lg:pb-12">
        <div role="status" aria-label="Cargando el trade" className="flex flex-col gap-4">
          <div className="h-11 w-2/5 animate-pulse rounded-[10px] bg-panel-2" />
          <div className="h-[92px] animate-pulse rounded-xl bg-panel-2" />
          <div className="h-48 animate-pulse rounded-xl bg-panel-2" />
          <span className="sr-only">Cargando el trade…</span>
        </div>
      </main>
    )
  }

  if (notFound || !trade) {
    return (
      <main className="mx-auto max-w-md px-5 pb-28 pt-16 text-center lg:pb-12">
        <h1 className="font-display text-[22px] text-text-primary">No encontramos ese trade</h1>
        <p className="mt-2 font-body text-[14px] leading-relaxed text-text-faint">
          Puede que ya no exista o que no te pertenezca.
        </p>
        <Link to="/historial" className="mt-5 inline-flex min-h-11 items-center font-body text-[14px] font-bold text-steel">
          Volver al historial
        </Link>
      </main>
    )
  }

  const isOpen = trade.status === 'open'
  const symbol = trade.instruments?.symbol ?? '—'
  const isOption = Boolean(trade.option_type)
  const sizeUnit = isOption ? 'contratos' : 'unidades'
  const stopLossMismatch = stopLossChanges != null && trade.moved_stop_loss === false && stopLossChanges > 0
  const risk = plannedRisk(trade.entry_price, trade.stop_loss, trade.take_profit)
  const duration = formatDuration(trade.duration_minutes)
  const resultLabel = trade.pnl_r != null ? formatR(trade.pnl_r) : trade.pnl_amount != null ? formatSignedFixed(trade.pnl_amount) : '—'
  const subtitle = [
    new Date(trade.traded_at).toLocaleString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ''),
    marketLabel(trade.instruments?.market),
    trade.strategies?.name,
  ]
    .filter(Boolean)
    .join(' · ')

  const mapCaption = [
    trade.side === 'long' ? 'Long' : 'Short',
    trade.position_size != null ? `${trade.position_size} ${sizeUnit}` : null,
    risk ? `riesgo de ${Number(risk.riskDistance.toFixed(5))} por ${isOption || trade.instruments?.market === 'futures' ? 'contrato' : 'unidad'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const hasContext = Boolean(trade.entry_reason || trade.confirmations)
  const moodTags = psychologyTags(trade)
  const hasPsychology = Boolean(
    trade.emotion || trade.confidence_level || trade.stress_level || trade.fear_level || trade.anxiety_level || moodTags.length > 0,
  )
  const hasLearning = Boolean(trade.main_mistake || trade.what_to_repeat || trade.what_to_avoid || trade.lesson_learned)

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-4 lg:max-w-5xl lg:pb-12 lg:pt-6">
      <Link
        to="/historial"
        className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-body text-[14px] font-semibold text-text-faint hover:text-text-primary"
      >
        <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        <span className="sr-only">Volver al </span>Historial
      </Link>

      <div className="flex flex-col gap-4 lg:gap-5">
        <header>
          <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
            <h1 className="font-display text-[32px] leading-none text-text-primary lg:text-[44px]">{symbol}</h1>
            <Tag tone={trade.side === 'long' ? 'gain' : 'loss'} className="px-2 py-1 text-[11px] lg:text-[12px]">
              {trade.side === 'long' ? 'LONG' : 'SHORT'}
            </Tag>
            {trade.is_backtest && <Tag className="px-2 py-1">Práctica</Tag>}
            <Tag tone={isOpen ? 'brand' : 'neutral'} className="px-2 py-1">
              {isOpen ? 'Abierto' : 'Cerrado'}
            </Tag>
          </div>
          <p className="num mt-2.5 text-[12px] text-text-faint lg:mt-3">{subtitle}</p>
        </header>

        {isOpen && (
          <>
            <Card tone="brand" as="section" className="px-4 py-4 lg:max-w-xl">
              <p className="label-mono text-on-signal/80">Cerrar trade</p>
              <p className="mb-3 mt-1.5 font-body text-[14px] leading-snug text-on-signal/90">
                Ingresa el precio de salida. El resultado en R se calcula solo.
              </p>
              <form onSubmit={(e) => void handleCloseTrade(e)} noValidate>
                <label htmlFor="exit-price" className="mb-1.5 block font-body text-[13px] font-semibold">
                  Precio de salida
                </label>
                <input
                  id="exit-price"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="0.000"
                  aria-invalid={closeError ? true : undefined}
                  aria-describedby={closeError ? 'exit-price-error' : undefined}
                  className={cn(FIELD_CLASS, 'num min-h-[52px] border-2 border-ink text-[18px] font-semibold')}
                />
                {closeError && (
                  <p id="exit-price-error" role="alert" className="mt-2 rounded-md bg-ink px-3 py-2 font-body text-[13px] text-loss">
                    {closeError}
                  </p>
                )}
                {!trade.stop_loss && (
                  <p className="mt-2 font-body text-[12px] text-on-signal/85">
                    Este trade no tiene stop loss: al cerrarlo no se podrá calcular el resultado en R.
                  </p>
                )}
                <SparkButton type="submit" disabled={closing} className="mt-3 min-h-[52px] w-full">
                  {closing ? 'Cerrando…' : 'Cerrar trade'}
                </SparkButton>
              </form>
            </Card>
            <div className="lg:max-w-xl">
              <OrderTicketFields data={closeOrderTicket} onChange={setCloseOrderTicket} />
            </div>
          </>
        )}

        {!isOpen && (
          <section aria-label="Resultado" className="flex flex-col gap-3 lg:grid lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))] lg:gap-3.5">
            <Card tone="brand" className="flex items-center justify-between gap-4 px-4 py-3.5 lg:block lg:px-5 lg:py-4">
              <div>
                <p className="label-mono text-on-signal/80">Resultado</p>
                <p className="font-display mt-1 text-[40px] leading-[1.05] lg:mt-1.5 lg:text-[44px]">{resultLabel}</p>
              </div>
              {trade.pnl_amount != null && (
                <div className="text-right lg:hidden">
                  <p className="num text-[18px] font-semibold">{formatSignedFixed(trade.pnl_amount)}</p>
                  {trade.commission ? <p className="mt-0.5 font-body text-[11px] text-on-signal/85">tras {formatSignedFixed(trade.commission).replace('+', '')} de comisiones</p> : null}
                </div>
              )}
            </Card>
            <StatCard
              className="hidden lg:block"
              label="Ganancia neta"
              value={trade.pnl_amount != null ? formatSignedFixed(trade.pnl_amount) : '—'}
              tone={trade.pnl_amount == null ? undefined : trade.pnl_amount >= 0 ? 'gain' : 'loss'}
              hint={trade.commission ? `tras ${formatSignedFixed(trade.commission).replace('+', '')} de comisiones` : 'resultado del trade'}
            />
            <div className="grid grid-cols-2 gap-3 lg:contents">
              <StatCard
                label="R:R planificado"
                value={risk?.rewardRisk != null ? risk.rewardRisk.toFixed(1) : '—'}
                hint={risk?.rewardRisk != null ? 'según tu stop y take profit' : 'requiere stop y take profit'}
              />
              <StatCard label="Duración" value={duration ?? '—'} hint={duration ? 'de la entrada al cierre' : 'sin duración guardada'} />
            </div>
          </section>
        )}

        {!isOpen && (
          <Section title="Mapa de precio">
            <PriceMap
              entry={trade.entry_price}
              exit={trade.exit_price}
              stopLoss={trade.stop_loss}
              takeProfit={trade.take_profit}
              isWin={trade.pnl_amount == null ? null : trade.pnl_amount > 0}
              caption={mapCaption}
            />
          </Section>
        )}

        {stopLossMismatch && stopLossChanges != null && (
          <section
            aria-label="Marcaste frente a lo que registró el sistema"
            className="rounded-xl border-2 border-spark bg-spark/10 px-4 py-4 lg:px-6 lg:py-5"
          >
            <p className="label-mono text-spark">Lo que marcaste vs. lo que registró el sistema</p>
            <div className="mt-3 flex flex-col gap-2.5 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-5">
              <div>
                <p className="label-mono">Tú marcaste</p>
                <p className="mt-1.5 font-body text-[16px] font-bold text-text-primary lg:text-[18px]">No moví el stop loss</p>
              </div>
              <ArrowRight className="h-6 w-6 rotate-90 text-spark lg:rotate-0" aria-hidden="true" />
              <div>
                <p className="label-mono">El sistema registró</p>
                <p className="mt-1.5 font-body text-[16px] font-bold text-text-primary lg:text-[18px]">
                  <span className="num text-spark">{stopLossChanges}</span> cambio{stopLossChanges === 1 ? '' : 's'} de stop loss
                </p>
              </div>
            </div>
          </section>
        )}
        {!stopLossMismatch && stopLossChanges != null && stopLossChanges > 0 && (
          <Callout>
            El sistema registró {stopLossChanges} cambio{stopLossChanges === 1 ? '' : 's'} de stop loss en este trade.
          </Callout>
        )}

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
          <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
            <Section title="Datos del trade">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 lg:gap-x-6 lg:gap-y-[18px]">
                {isOption && (
                  <>
                    <Kv label="Tipo" value={trade.option_type === 'call' ? 'Call' : 'Put'} plain />
                    <Kv label="Strike" value={trade.strike_price} />
                    <Kv label="Vencimiento" value={trade.expiration_date ? formatDateOnly(trade.expiration_date) : null} />
                  </>
                )}
                <Kv label={isOption ? 'Prima de entrada' : 'Entrada'} value={trade.entry_price} />
                {!isOpen && <Kv label={isOption ? 'Prima de salida' : 'Salida'} value={trade.exit_price} />}
                <Kv label="Stop loss" value={trade.stop_loss} tone="loss" />
                <Kv label="Take profit" value={trade.take_profit} />
                <Kv label={isOption ? 'Contratos' : 'Tamaño'} value={trade.position_size} />
                {!isOpen && <Kv label="Comisiones" value={trade.commission} />}
              </div>
              {orderTickets.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowOrders((v) => !v)}
                    aria-expanded={showOrders}
                    className="mt-4 flex min-h-11 items-center gap-2 font-body text-[13px] font-bold text-steel"
                  >
                    <Plus className={cn('h-3.5 w-3.5 transition-transform', showOrders && 'rotate-45')} strokeWidth={2.6} aria-hidden="true" />
                    {showOrders ? 'Ocultar detalles de la orden' : 'Ver detalles de la orden'}
                  </button>
                  {showOrders && <OrderDetails orders={orderTickets} />}
                </>
              )}
            </Section>

            {hasContext && (
              <Section title="Contexto">
                <TextBlock label="Razón de entrada" value={trade.entry_reason} />
                <TextBlock label="Confirmaciones" value={trade.confirmations} />
              </Section>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
            {hasPsychology && (
              <Section title="Psicología">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 lg:gap-x-6 lg:gap-y-[18px]">
                  <Kv label="Emoción" value={trade.emotion} plain />
                  <Level label="Confianza" level={trade.confidence_level} />
                  <Level label="Estrés" level={trade.stress_level} />
                  <Level label="Miedo" level={trade.fear_level} />
                  <Level label="Ansiedad" level={trade.anxiety_level} />
                </div>
                {moodTags.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2 lg:mt-5">
                    {moodTags.map((tag) => (
                      <li key={tag} className="inline-flex min-h-8 items-center rounded-full border border-input px-3 font-body text-[13px] font-semibold text-text-muted">
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {(hasLearning || !isOpen) && (
              <Section title="Aprendizaje">
                <div className="flex flex-col gap-3.5 lg:gap-4">
                  <TextBlock label="Error principal" value={trade.main_mistake} showEmpty />
                  <TextBlock label="Qué repetir" value={trade.what_to_repeat} showEmpty />
                  <TextBlock label="Qué evitar" value={trade.what_to_avoid} showEmpty />
                  <TextBlock label="Lección aprendida" value={trade.lesson_learned} showEmpty />
                </div>
              </Section>
            )}
          </div>
        </div>

        <TradeImagesCard tradeId={trade.id} />
      </div>
    </main>
  )
}

function psychologyTags(trade: Trade): string[] {
  const flags: [boolean | null, string][] = [
    [trade.followed_plan, 'Siguió el plan'],
    [trade.had_fomo, 'Tuvo FOMO'],
    [trade.overtraded, 'Sobre-operó'],
    [trade.moved_stop_loss, 'Movió el stop (autorreporte)'],
    [trade.closed_early, 'Cerró antes de tiempo'],
    [trade.moved_take_profit, 'Movió el take profit'],
    [trade.entered_impulsively, 'Entró por impulso'],
    [trade.hesitated, 'Dudó antes de entrar'],
    [trade.overconfidence, 'Exceso de confianza'],
    [trade.had_distractions, 'Hubo distracciones'],
  ]
  return flags.filter(([active]) => active).map(([, label]) => label)
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" className="px-5 py-5 sm:px-6">
      <h2 className="font-display mb-4 text-[16px] text-text-primary">{title}</h2>
      {children}
    </Card>
  )
}

function StatCard({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string
  value: string
  hint: string
  tone?: 'gain' | 'loss'
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-hairline bg-panel px-3.5 py-3 lg:px-[18px] lg:py-4', className)}>
      <p className="label-mono">{label}</p>
      <p className={cn('num mt-1.5 text-[22px] font-medium leading-none lg:mt-2 lg:text-[26px]', tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : 'text-text-primary')}>
        {value}
      </p>
      <p className="mt-1 hidden font-body text-[12px] text-text-faint lg:block">{hint}</p>
    </div>
  )
}

function Kv({
  label,
  value,
  tone,
  plain = false,
}: {
  label: string
  value: string | number | null | undefined
  tone?: 'loss'
  plain?: boolean
}) {
  const empty = value == null || value === ''
  return (
    <div className="min-w-0">
      <p className="label-mono">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-[16px] font-medium',
          plain ? 'font-body font-semibold' : 'num',
          empty ? 'text-text-faint' : tone === 'loss' ? 'text-loss' : 'text-text-primary',
        )}
      >
        {empty ? '—' : value}
      </p>
    </div>
  )
}

function Level({ label, level }: { label: string; level: number | null }) {
  return (
    <div className="min-w-0">
      <p className="label-mono">{label}</p>
      <p className={cn('num mt-1.5 text-[16px] font-medium', level ? 'text-text-primary' : 'text-text-faint')}>{level ? `${level}/10` : '—'}</p>
      {level ? <ProgressBar value={level * 10} label={`${label}: ${level} de 10`} className="mt-2 h-1.5" /> : null}
    </div>
  )
}

function TextBlock({ label, value, showEmpty = false }: { label: string; value: string | null; showEmpty?: boolean }) {
  if (!value && !showEmpty) return null
  return (
    <div className="mb-4 last:mb-0">
      <p className="label-mono">{label}</p>
      <p className={cn('mt-1.5 font-body text-[15px] leading-relaxed', value ? 'text-text-primary' : 'text-text-faint')}>
        {value || 'Sin completar'}
      </p>
    </div>
  )
}

function OrderDetails({ orders }: { orders: TradeOrder[] }) {
  return (
    <div className="mt-2 space-y-4 border-t border-hairline pt-4">
      {orders.map((order) => (
        <div key={order.id}>
          <p className="label-mono mb-2 text-steel">{order.leg === 'open' ? 'Apertura' : 'Cierre'}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Kv label="Número de orden" value={order.order_number} />
            <Kv
              label="Colocada"
              value={
                order.order_placed_at
                  ? new Date(order.order_placed_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
                  : null
              }
            />
            <Kv label="Tipo de orden" value={order.price_type ? PRICE_TYPE_LABELS[order.price_type] : null} plain />
            <Kv label="Precio límite" value={order.limit_price} />
            <Kv label="Bid" value={order.bid_price} />
            <Kv label="Ask" value={order.ask_price} />
            <Kv label="Term" value={order.term} />
            <Kv label="All or None" value={order.all_or_none ? 'Sí' : null} plain />
          </div>
        </div>
      ))}
    </div>
  )
}
