import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { FIELD_CLASS } from '../components/ui/field'
import { Tag as UiTag } from '../components/ui/tag'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'
import { formatDateOnly, formatSigned, tradeResultColorClass } from '../lib/tradeDisplay'
import { formatDuration, formatRowResult, formatTradeMoment } from '../lib/tradeRowDisplay'
import { OrderTicketFields, emptyOrderTicket, hasOrderTicketData, type OrderTicketData } from '../components/trade/OrderTicketFields'
import type { Database } from '../types/database'

type Trade = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}
type TradeOrder = Database['public']['Tables']['trade_orders']['Row']

const PRICE_TYPE_LABELS: Record<string, string> = { market: 'Market', limit: 'Limit' }

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
  const [closeOrderTicket, setCloseOrderTicket] = useState<OrderTicketData>(emptyOrderTicket)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      const [tradeRes, historyRes, ordersRes] = await Promise.all([
        supabase.from('trades').select('*, instruments(symbol, market)').eq('id', id!).maybeSingle(),
        supabase
          .from('trade_history')
          .select('id', { count: 'exact', head: true })
          .eq('trade_id', id!)
          .eq('field_name', 'stop_loss'),
        supabase.from('trade_orders').select('*').eq('trade_id', id!),
      ])
      if (cancelled) return

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
    // pnl_amount y pnl_r se calculan en el backend (trigger trades_calculate_pnl) —
    // el cliente solo envía exit_price y status, nunca el resultado.
    const { data, error: closeErr } = await supabase
      .from('trades')
      .update({ exit_price: parsed, status: 'closed' })
      .eq('id', trade.id)
      .select('*, instruments(symbol, market)')
      .single()
    setClosing(false)
    if (closeErr) {
      setCloseError(getErrorMessage(closeErr))
      return
    }
    setTrade(data as Trade)
    if (user && hasOrderTicketData(closeOrderTicket)) {
      const orderPlacedAt = closeOrderTicket.orderPlacedTime
        ? new Date(`${new Date().toISOString().slice(0, 10)}T${closeOrderTicket.orderPlacedTime}:00`).toISOString()
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
        <Card tone="dashed" className="animate-pulse py-8 font-body text-[14px] text-text-faint">Cargando detalle del trade…</Card>
      </main>
    )
  }

  if (notFound || !trade) {
    return (
      <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 lg:pb-12">
        <Card tone="dashed" className="text-center">
          <p className="font-display text-[18px] text-text-primary">No encontramos ese trade</p>
          <p className="mt-1 font-body text-[13px] text-text-faint">Puede que se haya eliminado o que no tengas acceso.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/historial"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver al historial</Link></Button>
        </Card>
      </main>
    )
  }

  const stopLossMismatch =
    stopLossChanges != null && trade.moved_stop_loss === false && stopLossChanges > 0

  const plannedRisk = trade.stop_loss == null ? null : Math.abs(trade.entry_price - trade.stop_loss)
  const plannedReward = trade.take_profit == null ? null : Math.abs(trade.take_profit - trade.entry_price)
  const plannedRR = plannedRisk && plannedReward != null ? plannedReward / plannedRisk : null

  return (
      <main className="mx-auto max-w-6xl px-5 pb-28 pt-5 lg:pb-12 lg:pt-7">
        <Link to="/historial" className="mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg pr-2 font-body text-[13px] font-semibold text-text-faint hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Historial
        </Link>
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-mono">Detalle del trade</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[28px] leading-tight text-text-primary sm:text-[34px]">{trade.instruments?.symbol ?? 'Trade'}</h1>
              <UiTag tone={trade.side === 'long' ? 'gain' : 'loss'}>{trade.side}</UiTag>
              <UiTag>{trade.status === 'open' ? 'Abierto' : 'Cerrado'}</UiTag>
              {trade.is_backtest && <UiTag tone="brand">Práctica</UiTag>}
            </div>
            <p className="mt-2 font-mono text-[11px] text-text-faint">
              {formatTradeMoment(trade.traded_at)}{trade.instruments?.market ? ` · ${trade.instruments.market}` : ''}
            </p>
          </div>
        </header>

        {trade.status === 'closed' && (
          <section aria-label="Resultado del trade" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <p className="label-mono">Resultado</p>
              <p className={`num mt-2 text-[24px] font-semibold ${tradeResultColorClass(trade)}`}>{formatRowResult(trade)}</p>
            </Card>
            <Card className="p-4">
              <p className="label-mono">Ganancia neta</p>
              <p className={`num mt-2 text-[24px] font-semibold ${trade.pnl_amount == null ? 'text-text-faint' : trade.pnl_amount >= 0 ? 'text-gain' : 'text-loss'}`}>{formatSigned(trade.pnl_amount)}</p>
              <p className="mt-1 font-body text-[11px] text-text-faint">después de comisiones</p>
            </Card>
            <Card className="p-4">
              <p className="label-mono">R:R planificado</p>
              <p className="num mt-2 text-[24px] font-semibold text-text-primary">{plannedRR == null ? '—' : `${plannedRR.toFixed(1)}:1`}</p>
              <p className="mt-1 font-body text-[11px] text-text-faint">según stop y objetivo</p>
            </Card>
            <Card className="p-4">
              <p className="label-mono">Duración</p>
              <p className="num mt-2 text-[24px] font-semibold text-text-primary">{formatDuration(trade.duration_minutes) ?? '—'}</p>
              <p className="mt-1 font-body text-[11px] text-text-faint">de entrada a cierre</p>
            </Card>
          </section>
        )}

        <PriceMap trade={trade} />

        {trade.status === 'open' && (
          <Card as="section" className="mb-5 border-signal/35">
            <p className="label-mono text-steel">Cerrar trade</p>
            <form onSubmit={(e) => void handleCloseTrade(e)} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="exit-price" className="mb-1.5 block font-body text-[12px] font-semibold text-text-faint">
                  Precio de salida
                </label>
                <input
                  id="exit-price"
                  type="number"
                  step="0.001"
                  inputMode="decimal"
                  required
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="0.000"
                  className={FIELD_CLASS}
                />
              </div>
              <Button type="submit" variant="cta" size="lg" disabled={closing} className="w-full sm:w-auto">
                {closing ? 'Cerrando...' : 'Cerrar trade'}
              </Button>
            </form>
            {!trade.stop_loss && (
              <p className="mt-3 font-body text-[12px] text-text-faint">
                sin stop loss definido — el resultado en R no se podrá calcular
              </p>
            )}
            {closeError && <p role="alert" className="mt-3 font-body text-[13px] text-loss">{closeError}</p>}
            <div className="mt-4">
              <OrderTicketFields data={closeOrderTicket} onChange={setCloseOrderTicket} />
            </div>
          </Card>
        )}

        <Section title="Datos técnicos">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {trade.option_type && (
              <>
                <Field label="Tipo" value={trade.option_type === 'call' ? 'Call' : 'Put'} />
                <Field label="Strike" value={trade.strike_price} />
                <Field
                  label="Vencimiento"
                  value={trade.expiration_date ? formatDateOnly(trade.expiration_date) : null}
                />
              </>
            )}
            <Field label={trade.option_type ? 'Prima de entrada' : 'Entrada'} value={trade.entry_price} />
            <Field label={trade.option_type ? 'Prima de salida' : 'Salida'} value={trade.exit_price} />
            <Field label="Stop loss" value={trade.stop_loss} />
            <Field label="Take profit" value={trade.take_profit} />
            <Field label={trade.option_type ? 'Contratos' : 'Tamaño'} value={trade.position_size} />
            <Field label="Comisiones" value={trade.commission} />
            <Field label="Resultado" value={trade.pnl_amount} />
            <Field label="Resultado en R" value={trade.pnl_r != null ? `${trade.pnl_r}R` : null} />
          </div>
        </Section>

        {orderTickets.length > 0 && (
          <Section title="Detalles de la orden">
            <div className="space-y-4">
              {orderTickets.map((order) => (
                <div key={order.id}>
                  <p className="font-mono text-[11px] text-signal tracking-wide mb-2">
                    {order.leg === 'open' ? 'apertura' : 'cierre'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Número de orden" value={order.order_number} />
                    <Field
                      label="Colocada"
                      value={
                        order.order_placed_at
                          ? new Date(order.order_placed_at).toLocaleString('es', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : null
                      }
                    />
                    <Field
                      label="Tipo de orden"
                      value={order.price_type ? PRICE_TYPE_LABELS[order.price_type] : null}
                    />
                    <Field label="Precio límite" value={order.limit_price} />
                    <Field label="Bid" value={order.bid_price} />
                    <Field label="Ask" value={order.ask_price} />
                    <Field label="Term" value={order.term} />
                    <Field label="All or None" value={order.all_or_none ? 'Sí' : null} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {(trade.entry_reason || trade.confirmations) && (
          <Section title="Contexto">
            <Field label="Razón de entrada" value={trade.entry_reason} block />
            <Field label="Confirmaciones" value={trade.confirmations} block />
          </Section>
        )}

        <Section title="Psicología">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Emoción" value={trade.emotion} />
            <Field label="Confianza" value={trade.confidence_level ? `${trade.confidence_level}/10` : null} />
            <Field label="Estrés" value={trade.stress_level ? `${trade.stress_level}/10` : null} />
            <Field label="Miedo" value={trade.fear_level ? `${trade.fear_level}/10` : null} />
            <Field label="Ansiedad" value={trade.anxiety_level ? `${trade.anxiety_level}/10` : null} />
          </div>
          <div className="flex flex-wrap gap-2">
            {trade.followed_plan && <Tag label="Siguió el plan" />}
            {trade.had_fomo && <Tag label="Tuvo FOMO" />}
            {trade.overtraded && <Tag label="Overtrading" />}
            {trade.moved_stop_loss && <Tag label="Movió el stop (autorreporte)" />}
            {trade.closed_early && <Tag label="Cerró antes de tiempo" />}
            {trade.moved_take_profit && <Tag label="Movió el take profit" />}
            {trade.entered_impulsively && <Tag label="Entró por impulso" />}
            {trade.hesitated && <Tag label="Dudó antes de entrar" />}
            {trade.overconfidence && <Tag label="Exceso de confianza" />}
            {trade.had_distractions && <Tag label="Hubo distracciones" />}
          </div>
          {stopLossChanges != null && stopLossChanges > 0 && (
            <p className="font-body text-[13px] text-text-muted mt-4 border-l-2 border-signal pl-3">
              {stopLossMismatch ? (
                <>
                  Marcó que <span className="text-text-primary">no</span> movió el stop, pero
                  el sistema registró <span className="text-signal">{stopLossChanges}</span>{' '}
                  cambio{stopLossChanges === 1 ? '' : 's'} objetivo{stopLossChanges === 1 ? '' : 's'}.
                </>
              ) : (
                <>
                  El sistema registró <span className="text-signal">{stopLossChanges}</span>{' '}
                  cambio{stopLossChanges === 1 ? '' : 's'} de stop loss.
                </>
              )}
            </p>
          )}
        </Section>

        {(trade.main_mistake || trade.what_to_repeat || trade.what_to_avoid || trade.lesson_learned) && (
          <Section title="Aprendizaje">
            <Field label="Error principal" value={trade.main_mistake} block />
            <Field label="Qué repetir" value={trade.what_to_repeat} block />
            <Field label="Qué evitar" value={trade.what_to_avoid} block />
            <Field label="Lección aprendida" value={trade.lesson_learned} block />
          </Section>
        )}

      </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" className="space-y-4">
      <h2 className="font-display text-[17px] leading-tight text-text-primary">{title}</h2>
      {children}
    </Card>
  )
}

function PriceMap({ trade }: { trade: Trade }) {
  const levels = [
    { label: 'Stop loss', value: trade.stop_loss, kind: 'stop' as const },
    { label: 'Entrada', value: trade.entry_price, kind: 'entry' as const },
    { label: 'Salida', value: trade.exit_price, kind: 'exit' as const },
    { label: 'Take profit', value: trade.take_profit, kind: 'target' as const },
  ].filter((level): level is { label: string; value: number; kind: 'stop' | 'entry' | 'exit' | 'target' } => level.value != null)

  if (levels.length < 2) return null
  const min = Math.min(...levels.map((level) => level.value))
  const max = Math.max(...levels.map((level) => level.value))
  const span = max - min || 1
  const ordered = [...levels].sort((a, b) => b.value - a.value)

  return (
    <Card as="section" aria-label="Mapa de precio" className="mb-5">
      <p className="font-display text-[17px] text-text-primary">Mapa de precio</p>
      <svg className="mt-4 h-10 w-full" viewBox="0 0 360 40" role="img" aria-label="Ubicación de entrada, stop, salida y objetivo" preserveAspectRatio="none">
        <line x1="10" y1="20" x2="350" y2="20" stroke="var(--color-hairline)" strokeWidth="2" />
        {levels.map((level) => {
          const x = 10 + ((level.value - min) / span) * 340
          const dashed = level.kind === 'stop' || level.kind === 'target'
          return (
            <g key={level.kind}>
              <line x1={x} y1="7" x2={x} y2="33" stroke="var(--color-steel)" strokeWidth="2" strokeDasharray={dashed ? '3 2' : undefined} />
              <circle cx={x} cy="20" r={level.kind === 'exit' ? 5 : 4} fill={level.kind === 'exit' ? 'var(--color-signal)' : 'var(--color-panel)'} stroke="var(--color-steel)" strokeWidth="2" />
            </g>
          )
        })}
      </svg>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {ordered.map((level) => (
          <div key={level.kind} className="flex items-start justify-between gap-2">
            <p className="font-body text-[11px] text-text-faint">{level.label}</p>
            <p className="num text-[11px] text-text-primary">{level.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Field({
  label,
  value,
  block,
}: {
  label: string
  value: string | number | null | undefined
  block?: boolean
}) {
  if (value == null || value === '') return null
  return (
    <div className={block ? 'mb-4 last:mb-0' : ''}>
      <p className="label-mono mb-1">{label}</p>
      <p className="font-body text-[14px] leading-relaxed text-text-primary">{value}</p>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return <UiTag>{label}</UiTag>
}
