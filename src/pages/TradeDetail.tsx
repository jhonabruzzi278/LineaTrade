import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import type { Database } from '../types/database'

type Trade = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}
type Thread = Database['public']['Tables']['trade_threads']['Row']

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [stopLossChanges, setStopLossChanges] = useState<number | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exitPrice, setExitPrice] = useState('')
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      const [tradeRes, historyRes, threadsRes] = await Promise.all([
        supabase.from('trades').select('*, instruments(symbol, market)').eq('id', id!).maybeSingle(),
        supabase
          .from('trade_history')
          .select('id', { count: 'exact', head: true })
          .eq('trade_id', id!)
          .eq('field_name', 'stop_loss'),
        supabase.from('trade_threads').select('*').eq('trade_id', id!).order('created_at', { ascending: true }),
      ])
      if (cancelled) return

      if (tradeRes.error || !tradeRes.data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setTrade(tradeRes.data as Trade)
      setStopLossChanges(historyRes.count ?? 0)
      if (threadsRes.error) {
        setError(getErrorMessage(threadsRes.error))
      } else {
        setThreads(threadsRes.data ?? [])
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleAddComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user || !trade) return
    const form = e.currentTarget
    const input = form.elements.namedItem('content') as HTMLTextAreaElement
    const content = input.value.trim()
    if (!content) return

    const { data, error: insertError } = await supabase
      .from('trade_threads')
      .insert({ trade_id: trade.id, user_id: user.id, content })
      .select('*')
      .single()
    if (insertError) {
      setError(getErrorMessage(insertError))
      return
    }
    setThreads((prev) => [...prev, data])
    input.value = ''
  }

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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <p className="font-body text-[14px] text-text-muted">Cargando...</p>
        </main>
      </div>
    )
  }

  if (notFound || !trade) {
    return (
      <div className="min-h-screen bg-ink">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center">
          <p className="font-body text-[15px] text-text-muted mb-4">
            No encontramos ese trade — o no te pertenece.
          </p>
          <Link to="/historial" className="text-signal hover:text-signal-dim transition-colors">
            Volver al historial
          </Link>
        </main>
      </div>
    )
  }

  const stopLossMismatch =
    stopLossChanges != null && trade.moved_stop_loss === false && stopLossChanges > 0

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-[26px] text-text-primary">
            {trade.instruments?.symbol ?? '—'}
          </h1>
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded-sm border ${
              trade.side === 'long' ? 'border-signal/40 text-signal' : 'border-steel/40 text-steel'
            }`}
          >
            {trade.side}
          </span>
          <span className="font-mono text-[11px] text-text-faint">{trade.status}</span>
          {trade.pnl_amount != null && (
            <span
              className={`font-mono text-[13px] ml-auto ${trade.pnl_amount >= 0 ? 'text-signal' : 'text-red-400'}`}
            >
              {trade.pnl_amount >= 0 ? '+' : ''}
              {trade.pnl_amount}
              {trade.pnl_r != null && ` (${trade.pnl_r >= 0 ? '+' : ''}${trade.pnl_r}R)`}
            </span>
          )}
        </div>
        <p className="font-mono text-[12px] text-text-faint mb-8">
          {new Date(trade.traded_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>

        {error && <p className="font-body text-[13px] text-red-400 mb-6">{error}</p>}

        {trade.status === 'open' && (
          <div className="border border-hairline rounded-sm bg-panel px-5 py-4 mb-8">
            <p className="font-mono text-[12px] text-text-faint tracking-wide mb-3">cerrar trade</p>
            <form onSubmit={(e) => void handleCloseTrade(e)} className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="exit-price" className="font-body text-[13px] text-text-muted block mb-2">
                  Precio de salida
                </label>
                <input
                  id="exit-price"
                  type="number"
                  step="0.001"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="0.000"
                  className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={closing}
                className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal"
              >
                {closing ? 'Cerrando...' : 'Cerrar trade'}
              </button>
            </form>
            {!trade.stop_loss && (
              <p className="font-mono text-[11px] text-text-faint mt-3">
                sin stop loss definido — el resultado en R no se podrá calcular
              </p>
            )}
            {closeError && <p className="font-body text-[13px] text-red-400 mt-3">{closeError}</p>}
          </div>
        )}

        <Section title="Datos técnicos">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Entrada" value={trade.entry_price} />
            <Field label="Salida" value={trade.exit_price} />
            <Field label="Stop loss" value={trade.stop_loss} />
            <Field label="Take profit" value={trade.take_profit} />
            <Field label="Tamaño" value={trade.position_size} />
            <Field label="Comisiones" value={trade.commission} />
            <Field label="Resultado" value={trade.pnl_amount} />
            <Field label="Resultado en R" value={trade.pnl_r != null ? `${trade.pnl_r}R` : null} />
          </div>
        </Section>

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
          </div>
          <div className="flex flex-wrap gap-2">
            {trade.followed_plan && <Tag label="Siguió el plan" />}
            {trade.had_fomo && <Tag label="Tuvo FOMO" />}
            {trade.overtraded && <Tag label="Overtrading" />}
            {trade.moved_stop_loss && <Tag label="Movió el stop (autoreporte)" />}
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

        <Section title="Hilo de seguimiento">
          <div className="space-y-3 mb-4">
            {threads.length === 0 && (
              <p className="font-body text-[13px] text-text-faint">Sin notas todavía.</p>
            )}
            {threads.map((thread) => (
              <div key={thread.id} className="border border-hairline rounded-sm bg-panel px-4 py-3">
                <p className="font-body text-[14px] text-text-primary">{thread.content}</p>
                <p className="font-mono text-[11px] text-text-faint mt-1">
                  {new Date(thread.created_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                  {thread.ai_generated && ' · IA'}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => void handleAddComment(e)} className="flex gap-3">
            <textarea
              name="content"
              rows={2}
              placeholder="Agregar una nota de seguimiento..."
              className="flex-1 bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors resize-none"
            />
            <button
              type="submit"
              className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors self-end"
            >
              Agregar
            </button>
          </form>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-6 border-t border-hairline first:border-t-0 first:pt-0">
      <h2 className="font-display text-[16px] text-text-primary mb-4">{title}</h2>
      {children}
    </div>
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
      <p className="font-mono text-[11px] text-text-faint tracking-wide mb-1">{label}</p>
      <p className="font-body text-[14px] text-text-primary">{value}</p>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <span className="font-mono text-[11px] px-2 py-1 rounded-sm border border-hairline text-text-muted">
      {label}
    </span>
  )
}
