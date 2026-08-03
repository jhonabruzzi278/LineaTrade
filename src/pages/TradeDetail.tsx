import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { AIAnalysisPanel } from '../components/AIAnalysisPanel'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'
import { formatDateOnly } from '../lib/tradeDisplay'
import { uploadTradeImage, getSignedImageUrl, type ImageStage } from '../lib/tradeImages'
import { OrderTicketFields, emptyOrderTicket, hasOrderTicketData, type OrderTicketData } from '../components/trade/OrderTicketFields'
import type { Database } from '../types/database'

type Trade = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}
type Thread = Database['public']['Tables']['trade_threads']['Row']
type TradeImage = Database['public']['Tables']['trade_images']['Row'] & { url: string | null }
type TradeOrder = Database['public']['Tables']['trade_orders']['Row']
type LatestAnalysis = { responseText: string; createdAt: string }

const PRICE_TYPE_LABELS: Record<string, string> = { market: 'Market', limit: 'Limit' }

const IMAGE_STAGE_LABELS: Record<ImageStage, string> = {
  before: 'Antes',
  during: 'Durante',
  after: 'Después',
}

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [stopLossChanges, setStopLossChanges] = useState<number | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exitPrice, setExitPrice] = useState('')
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [images, setImages] = useState<TradeImage[]>([])
  const [uploadStage, setUploadStage] = useState<ImageStage>('before')
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [latestAnalysis, setLatestAnalysis] = useState<LatestAnalysis | null>(null)
  const [orderTickets, setOrderTickets] = useState<TradeOrder[]>([])
  const [closeOrderTicket, setCloseOrderTicket] = useState<OrderTicketData>(emptyOrderTicket)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      const [tradeRes, historyRes, threadsRes, imagesRes, analysisRes, ordersRes] = await Promise.all([
        supabase.from('trades').select('*, instruments(symbol, market)').eq('id', id!).maybeSingle(),
        supabase
          .from('trade_history')
          .select('id', { count: 'exact', head: true })
          .eq('trade_id', id!)
          .eq('field_name', 'stop_loss'),
        supabase.from('trade_threads').select('*').eq('trade_id', id!).order('created_at', { ascending: true }),
        supabase.from('trade_images').select('*').eq('trade_id', id!).order('created_at', { ascending: true }),
        supabase
          .from('ai_analysis')
          .select('response_text, created_at')
          .eq('trade_id', id!)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
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
      if (threadsRes.error) {
        setError(getErrorMessage(threadsRes.error))
      } else {
        setThreads(threadsRes.data ?? [])
      }
      if (analysisRes.data) {
        setLatestAnalysis({ responseText: analysisRes.data.response_text, createdAt: analysisRes.data.created_at })
      }
      setOrderTickets(ordersRes.data ?? [])
      if (imagesRes.data) {
        const withUrls = await Promise.all(
          imagesRes.data.map(async (img) => ({ ...img, url: await getSignedImageUrl(img.storage_path) })),
        )
        if (!cancelled) setImages(withUrls)
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
    showToast('Nota agregada.', 'success')
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

  async function handleUploadImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo si falla
    if (!file || !user || !trade) return

    setUploading(true)
    setImageError(null)
    try {
      const row = await uploadTradeImage(file, user.id, trade.id, uploadStage)
      const url = await getSignedImageUrl(row.storage_path)
      setImages((prev) => [...prev, { ...row, url }])
      showToast('Imagen subida.', 'success')
    } catch (uploadErr: unknown) {
      setImageError(getErrorMessage(uploadErr))
    } finally {
      setUploading(false)
    }
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
      <main className="max-w-3xl mx-auto px-6 py-10 pb-28 lg:pb-10 lg:pl-24">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-[26px] text-text-primary">
            {trade.instruments?.symbol ?? '—'}
          </h1>
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded-sm border ${
              trade.side === 'long' ? 'border-gain/40 text-gain' : 'border-loss/40 text-loss'
            }`}
          >
            {trade.side}
          </span>
          <span className="font-mono text-[11px] text-text-faint">{trade.status}</span>
          {trade.pnl_amount != null && (
            <span
              className={`font-mono text-[13px] ml-auto ${trade.pnl_amount >= 0 ? 'text-gain' : 'text-loss'}`}
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

        {error && <p className="font-body text-[13px] text-loss mb-6">{error}</p>}

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
            {closeError && <p className="font-body text-[13px] text-loss mt-3">{closeError}</p>}
            <div className="mt-4">
              <OrderTicketFields data={closeOrderTicket} onChange={setCloseOrderTicket} />
            </div>
          </div>
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

        <Section title="Análisis de IA">
          <AIAnalysisPanel tradeId={trade.id} initialAnalysis={latestAnalysis} />
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
          <div className="mb-6">
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {images.map((img) => (
                  <a
                    key={img.id}
                    href={img.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-sm overflow-hidden border border-hairline block"
                  >
                    {img.url ? (
                      <img
                        src={img.url}
                        alt={`Captura del trade — ${IMAGE_STAGE_LABELS[img.stage]}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-panel-2 flex items-center justify-center">
                        <span className="font-mono text-[10px] text-text-faint">error</span>
                      </div>
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-ink/80 font-mono text-[10px] text-text-primary text-center py-1">
                      {IMAGE_STAGE_LABELS[img.stage]}
                    </span>
                  </a>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1.5">
                {(Object.keys(IMAGE_STAGE_LABELS) as ImageStage[]).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setUploadStage(stage)}
                    className={`font-mono text-[11px] px-2.5 py-1.5 rounded-sm border transition-colors ${
                      uploadStage === stage
                        ? 'border-signal text-signal'
                        : 'border-hairline text-text-muted hover:border-text-faint'
                    }`}
                  >
                    {IMAGE_STAGE_LABELS[stage]}
                  </button>
                ))}
              </div>
              <label
                className={`font-body text-[13px] px-4 py-2 rounded-sm border border-hairline text-text-muted hover:border-text-faint transition-colors cursor-pointer ${
                  uploading ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                {uploading ? 'Subiendo...' : `+ Imagen (${IMAGE_STAGE_LABELS[uploadStage].toLowerCase()})`}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleUploadImage(e)} />
              </label>
            </div>
            {imageError && <p className="font-body text-[13px] text-loss mt-2">{imageError}</p>}
          </div>

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
      <AppFloatingNav />
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
