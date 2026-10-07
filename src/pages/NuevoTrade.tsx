import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { WizardLayout } from '../components/WizardLayout'
import { BrokerPicker } from '../components/trade/BrokerPicker'
import { TechnicalEntryPanel } from '../components/trade/TechnicalEntryPanel'
import { TicketDropzone, TicketReading } from '../components/trade/TicketOrigin'
import { PsychologySection, type PsychologyData } from '../components/trade/PsychologySection'
import { hasOrderTicketData } from '../components/trade/OrderTicketFields'
import { buttonVariants, Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { FIELD_CLASS } from '../components/ui/field'
import { Tag } from '../components/ui/tag'
import { popularBrokers } from '../data/brokers'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { resolveInstrumentId } from '../lib/instruments'
import { combineDateTimeToIso } from '../lib/tradeDisplay'
import { emptyTechnicalEntry, hasRequiredTechnicalFields, mergeExtraction, type TechnicalEntryData } from '../lib/tradeDraft'
import { extractTradeFromImage } from '../lib/tradeImageExtraction'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'
import { cn } from '@/lib/utils'
import type { Database } from '../types/database'

type InstrumentMarket = Database['public']['Enums']['instrument_market']
type Strategy = Pick<Database['public']['Tables']['strategies']['Row'], 'id' | 'name'>
type OriginPhase = 'pick' | 'reading' | 'review'

function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const STEP_LABELS = ['Origen', 'Contexto', 'Psicología', 'Aprendizaje']
const RAIL_NOTE = 'Lo que escribas aquí es la evidencia que la IA usará después. Sin autocensura.'

const TEXTAREA_CLASS = cn(FIELD_CLASS, 'min-h-24 resize-y py-3 leading-relaxed')

interface TradeDraft {
  brokerId?: string
  brokerName?: string
  /** Cuenta demo: se guarda como práctica (is_backtest) y no cuenta en las estadísticas. */
  isDemo: boolean
  technical: TechnicalEntryData
  entryReason: string
  confirmations: string
  strategyId: string
  psychology: PsychologyData
  mainMistake: string
  whatToRepeat: string
  whatToAvoid: string
  lessonLearned: string
}

function createInitialDraft(): TradeDraft {
  return {
    isDemo: false,
    technical: emptyTechnicalEntry(),
    entryReason: '',
    confirmations: '',
    strategyId: '',
    psychology: {
      emotion: '',
      confidenceLevel: 5,
      stressLevel: 5,
      fearLevel: 5,
      anxietyLevel: 5,
      followedPlan: false,
      hadFomo: false,
      movedStopLoss: false,
      overtraded: false,
      closedEarly: false,
      movedTakeProfit: false,
      enteredImpulsively: false,
      hesitated: false,
      overconfidence: false,
      hadDistractions: false,
    },
    mainMistake: '',
    whatToRepeat: '',
    whatToAvoid: '',
    lessonLearned: '',
  }
}

// Registra una operación completa: origen técnico (bróker + foto del ticket, leída
// con IA y revisada a mano), contexto, psicología y aprendizaje. El paso «Origen»
// alimenta trades.* directamente; los demás alimentan los campos homónimos del schema.
export default function NuevoTrade() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<OriginPhase>('pick')
  const [draft, setDraft] = useState<TradeDraft>(createInitialDraft)
  const [photoPreview, setPhotoPreview] = useState('')
  const [readError, setReadError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<Strategy[]>([])

  // Libera la URL temporal de la miniatura al cambiarla o al salir.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  // Estrategias activas del usuario para el selector opcional del paso Contexto: el
  // reporte («Mejor/Peor modelo») solo tiene datos reales cuando los trades llevan
  // strategy_id.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('strategies')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setStrategies(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const isLastStep = stepIndex === STEP_LABELS.length - 1

  // Acceso rápido «Foto rápida» del botón central (/nuevo-trade?broker=primary): salta
  // la elección de bróker precargando el bróker principal del onboarding.
  useEffect(() => {
    if (!user || searchParams.get('broker') !== 'primary') return
    let cancelled = false
    async function prefillPrimaryBroker() {
      const { data: profile } = await supabase.from('profiles').select('primary_broker').eq('id', user!.id).maybeSingle()
      if (cancelled || !profile?.primary_broker) return
      const match = popularBrokers.find((broker) => broker.id === profile.primary_broker)
      if (match) {
        setDraft((prev) => (prev.brokerId ? prev : { ...prev, brokerId: match.id, brokerName: match.name }))
      }
    }
    void prefillPrimaryBroker()
    return () => {
      cancelled = true
    }
  }, [user, searchParams])

  function updateTechnical(technical: TechnicalEntryData) {
    setDraft((prev) => ({ ...prev, technical }))
  }

  // La foto es obligatoria; leerla con IA es una ayuda. Si la lectura falla, la foto
  // sigue adjunta y la persona completa los campos a mano.
  async function handlePhoto(file: File) {
    setPhotoPreview(URL.createObjectURL(file))
    setReadError(null)
    setPhase('reading')
    const result = await extractTradeFromImage(file)
    if (!result.ok) {
      setReadError(result.message)
      setDraft((prev) => ({ ...prev, technical: { ...prev.technical, photoAttached: true } }))
      setPhase('review')
      return
    }
    setDraft((prev) => ({ ...prev, technical: mergeExtraction(prev.technical, result.data) }))
    setPhase('review')
    showToast('Datos extraídos de la foto. Revísalos antes de guardar.', 'success')
  }

  function isStepValid(): boolean {
    if (stepIndex !== 0) return true
    if (phase === 'reading') return false
    if (phase === 'pick') return Boolean(draft.brokerId && draft.technical.photoAttached)
    return hasRequiredTechnicalFields(draft.technical)
  }

  async function saveOpenOrderTicket(tradeId: string) {
    if (!user || !hasOrderTicketData(draft.technical.orderTicket)) return
    const ticket = draft.technical.orderTicket
    const orderPlacedAt = ticket.orderPlacedTime ? combineDateTimeToIso(draft.technical.date, ticket.orderPlacedTime) : null
    await supabase.from('trade_orders').insert({
      trade_id: tradeId,
      user_id: user.id,
      leg: 'open',
      order_number: orNull(ticket.orderNumber),
      order_placed_at: orderPlacedAt,
      price_type: ticket.priceType || null,
      limit_price: ticket.limitPrice ? Number(ticket.limitPrice) : null,
      bid_price: ticket.bidPrice ? Number(ticket.bidPrice) : null,
      ask_price: ticket.askPrice ? Number(ticket.askPrice) : null,
      term: orNull(ticket.term),
      all_or_none: ticket.allOrNone,
    })
  }

  async function saveTrade() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    try {
      const instrumentId = await resolveInstrumentId(draft.technical.symbol, draft.technical.market as InstrumentMarket, user.id)
      const tradedAt = combineDateTimeToIso(draft.technical.date, draft.technical.time)
      const isOptions = draft.technical.market === 'options'

      const { data, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          instrument_id: instrumentId,
          side: draft.technical.action,
          traded_at: tradedAt,
          // Una cuenta demo se guarda como práctica: queda fuera de todas las estadísticas reales.
          is_backtest: draft.isDemo,
          timeframe: orNull(draft.technical.timeframe),
          entry_price: Number(draft.technical.price),
          position_size: Number(draft.technical.quantity),
          stop_loss: draft.technical.stopLoss ? Number(draft.technical.stopLoss) : null,
          take_profit: draft.technical.takeProfit ? Number(draft.technical.takeProfit) : null,
          risk_percent: draft.technical.riskPercent ? Number(draft.technical.riskPercent) : null,
          commission: draft.technical.commission ? Number(draft.technical.commission) : 0,
          option_type: isOptions ? draft.technical.optionType : null,
          strike_price: isOptions && draft.technical.strikePrice ? Number(draft.technical.strikePrice) : null,
          expiration_date: isOptions && draft.technical.expirationDate ? draft.technical.expirationDate : null,
          entry_reason: orNull(draft.entryReason),
          confirmations: orNull(draft.confirmations),
          strategy_id: draft.strategyId || null,
          emotion: orNull(draft.psychology.emotion),
          confidence_level: draft.psychology.confidenceLevel,
          stress_level: draft.psychology.stressLevel,
          fear_level: draft.psychology.fearLevel,
          anxiety_level: draft.psychology.anxietyLevel,
          followed_plan: draft.psychology.followedPlan,
          had_fomo: draft.psychology.hadFomo,
          moved_stop_loss: draft.psychology.movedStopLoss,
          overtraded: draft.psychology.overtraded,
          closed_early: draft.psychology.closedEarly,
          moved_take_profit: draft.psychology.movedTakeProfit,
          entered_impulsively: draft.psychology.enteredImpulsively,
          hesitated: draft.psychology.hesitated,
          overconfidence: draft.psychology.overconfidence,
          had_distractions: draft.psychology.hadDistractions,
          main_mistake: orNull(draft.mainMistake),
          what_to_repeat: orNull(draft.whatToRepeat),
          what_to_avoid: orNull(draft.whatToAvoid),
          lesson_learned: orNull(draft.lessonLearned),
        })
        .select('id')
        .single()
      if (error) throw error
      await saveOpenOrderTicket(data.id)
      setDone(true)
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  function goNext() {
    if (stepIndex === 0 && phase === 'pick') {
      setPhase('review')
      return
    }
    if (isLastStep) {
      void saveTrade()
      return
    }
    setStepIndex((i) => i + 1)
  }

  function goBack() {
    if (stepIndex === 0) {
      setPhase('pick')
      return
    }
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function resetFlow() {
    setDraft(createInitialDraft())
    setPhotoPreview('')
    setReadError(null)
    setPhase('pick')
    setStepIndex(0)
    setSaveError(null)
    setDone(false)
  }

  if (done) {
    return <NuevoTradeComplete draft={draft} onAnother={resetFlow} />
  }

  const showBack = stepIndex > 0 || phase === 'review'
  let nextHint: string | undefined
  if (stepIndex === 0 && phase === 'pick') {
    if (!draft.brokerId) nextHint = 'Elige tu bróker y adjunta la captura para continuar'
    else if (!draft.technical.photoAttached) nextHint = 'Falta adjuntar la captura para continuar'
  }

  const symbol = draft.technical.symbol
  const railTitle = symbol && draft.technical.photoAttached ? `Nuevo trade · ${symbol} ${draft.technical.action}` : 'Nuevo trade'

  return (
    <WizardLayout
      stepLabel={`paso ${stepIndex + 1} de ${STEP_LABELS.length} · ${STEP_LABELS[stepIndex]}`}
      progressPercent={((stepIndex + 1) / STEP_LABELS.length) * 100}
      steps={STEP_LABELS}
      stepIndex={stepIndex}
      railTitle={railTitle}
      railNote={stepIndex === 0 ? RAIL_NOTE : undefined}
      contentWidth={stepIndex === 0 ? 'md' : 'lg'}
      onClose={() => navigate('/dashboard')}
      confirmClose={draft.technical.photoAttached || stepIndex > 0}
      onBack={showBack && phase !== 'reading' ? goBack : undefined}
      onNext={goNext}
      nextDisabled={!isStepValid() || saving}
      nextLabel={saving ? 'Guardando…' : isLastStep ? 'Guardar trade' : 'Continuar'}
      nextHint={nextHint}
    >
      {saveError && (
        <p role="alert" className="mb-4 font-body text-[13px] text-loss">
          {saveError}
        </p>
      )}

      {stepIndex === 0 && phase === 'pick' && (
        <>
          <Heading title="¿De dónde viene esta operación?" lead="Elige el bróker y sube la captura de la operación." />
          <BrokerPicker
            value={draft.brokerId}
            onSelect={(id, name) => setDraft((prev) => ({ ...prev, brokerId: id, brokerName: name }))}
          />
          <div className="mt-6 border-t border-hairline pt-6 lg:mt-7 lg:pt-7">
            <TicketDropzone
              onPhoto={(file) => void handlePhoto(file)}
              attached={draft.technical.photoAttached}
              isDemo={draft.isDemo}
              onDemoChange={(isDemo) => setDraft((prev) => ({ ...prev, isDemo }))}
            />
          </div>
        </>
      )}

      {stepIndex === 0 && phase === 'reading' && (
        <>
          <Heading title="Leyendo tu ticket" lead="Esto toma unos segundos. No cierres esta pantalla." />
          <TicketReading previewUrl={photoPreview} brokerName={draft.brokerName} />
        </>
      )}

      {stepIndex === 0 && phase === 'review' && (
        <>
          <Heading
            title={readError ? 'Completa los datos a mano' : 'Revisa los datos de tu ticket'}
            lead={readError ? undefined : 'La IA completó los campos. Revísalos antes de continuar.'}
          />
          <TechnicalEntryPanel
            data={draft.technical}
            onChange={updateTechnical}
            photoPreview={photoPreview}
            brokerName={draft.brokerName}
            readError={readError}
            onPhotoSelected={(file) => void handlePhoto(file)}
          />
        </>
      )}

      {stepIndex === 1 && (
        <>
          <Heading
            title="Contexto"
            lead="¿Qué viste antes de entrar? Esto es lo que la IA usará como evidencia más adelante."
          />
          <div className="flex flex-col gap-[18px]">
            <TextAreaField
              id="nt-reason"
              label="Razón de entrada"
              value={draft.entryReason}
              onChange={(value) => setDraft((prev) => ({ ...prev, entryReason: value }))}
              placeholder="¿Por qué entraste en este momento?"
            />
            <TextAreaField
              id="nt-confirmations"
              label="Confirmaciones"
              value={draft.confirmations}
              onChange={(value) => setDraft((prev) => ({ ...prev, confirmations: value }))}
              placeholder="¿Qué señales o confluencias confirmaron la entrada?"
            />
            {strategies.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nt-strategy" className="font-body text-[14px] font-semibold text-text-muted">
                  Estrategia (opcional)
                </label>
                <div className="relative">
                  <select
                    id="nt-strategy"
                    value={draft.strategyId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, strategyId: e.target.value }))}
                    className={cn(FIELD_CLASS, 'min-h-[52px] appearance-none pr-11')}
                  >
                    <option value="">Sin clasificar</option>
                    {strategies.map((strategy) => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-faint" aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {stepIndex === 2 && (
        <>
          <Heading title="Psicología" lead="Sin autocensura: esto es lo que después la IA contrasta contra el dato objetivo." />
          <PsychologySection data={draft.psychology} onChange={(psychology) => setDraft((prev) => ({ ...prev, psychology }))} />
        </>
      )}

      {stepIndex === 3 && (
        <>
          <Heading title="Aprendizaje" lead="Lo último, mientras el trade sigue fresco." />
          <div className="grid gap-[18px] lg:grid-cols-2 lg:gap-x-6 lg:gap-y-[22px]">
            <TextAreaField
              id="nt-mistake"
              label="Error principal"
              value={draft.mainMistake}
              onChange={(value) => setDraft((prev) => ({ ...prev, mainMistake: value }))}
              placeholder="Si hubo un error, ¿cuál fue?"
            />
            <TextAreaField
              id="nt-repeat"
              label="Qué repetir"
              value={draft.whatToRepeat}
              onChange={(value) => setDraft((prev) => ({ ...prev, whatToRepeat: value }))}
              placeholder="¿Qué hiciste bien y quieres repetir?"
            />
            <TextAreaField
              id="nt-avoid"
              label="Qué evitar"
              value={draft.whatToAvoid}
              onChange={(value) => setDraft((prev) => ({ ...prev, whatToAvoid: value }))}
              placeholder="¿Qué quieres evitar la próxima vez?"
            />
            <TextAreaField
              id="nt-lesson"
              label="Lección aprendida"
              value={draft.lessonLearned}
              onChange={(value) => setDraft((prev) => ({ ...prev, lessonLearned: value }))}
              placeholder="Resume la lección en una frase"
            />
          </div>
          <TradeSummary draft={draft} className="mt-7" badge="Se guarda abierto" />
        </>
      )}
    </WizardLayout>
  )
}

function Heading({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-5 lg:mb-7">
      <h1 className="font-display text-[26px] leading-[1.06] text-text-primary lg:text-[34px]">{title}</h1>
      {lead && <p className="mt-2 font-body text-[14px] leading-relaxed text-text-faint lg:mt-2.5 lg:text-[15px]">{lead}</p>}
    </div>
  )
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="font-body text-[14px] font-semibold text-text-muted">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={TEXTAREA_CLASS}
      />
    </div>
  )
}

// Resumen del trade que se va a guardar (mismo dato en el último paso y al terminar).
function TradeSummary({ draft, className, badge }: { draft: TradeDraft; className?: string; badge?: string }) {
  const { technical } = draft
  const symbol = technical.symbol || '—'
  const units = technical.market === 'options' || technical.market === 'futures' ? 'contratos' : 'unidades'
  return (
    <Card className={cn('flex items-center gap-3.5 px-4 py-3.5 sm:px-[18px] sm:py-3.5', className)}>
      <span className="num flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-panel-2 text-[12px] font-bold text-steel">
        {symbol.slice(0, 3)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-[14px] font-bold text-text-primary">
          {symbol} · {technical.action} · {technical.quantity || '—'} {units}
        </p>
        <p className="num mt-0.5 truncate text-[12px] text-text-faint">
          entrada {technical.price || '—'}
          {technical.stopLoss ? ` · stop ${technical.stopLoss}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {badge && <Tag tone="brand">{badge}</Tag>}
        {draft.isDemo && <Tag>Práctica</Tag>}
      </div>
    </Card>
  )
}

function NuevoTradeComplete({ draft, onAnother }: { draft: TradeDraft; onAnother: () => void }) {
  const symbol = draft.technical.symbol
  const title = symbol ? `${symbol} quedó registrado` : 'Tu trade quedó registrado'

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-24 lg:justify-center lg:pt-8">
      <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-2 border-ink bg-gain shadow-[5px_5px_0_var(--color-pop)]">
        <Check className="h-[42px] w-[42px] text-ink" strokeWidth={2.8} aria-hidden="true" />
      </span>
      <p className="label-mono mt-7 text-gain">Trade guardado</p>
      <h1 className="font-display mt-2.5 text-[34px] leading-[1.04] text-text-primary">{title}</h1>
      <p className="mt-3 font-body text-[16px] leading-relaxed text-text-faint">
        {draft.isDemo
          ? 'Quedó como práctica: no cuenta en tus estadísticas. Sigue abierto hasta que lo cierres.'
          : 'Sigue abierto. Cuando lo cierres, calcularemos el resultado en R por ti.'}
      </p>
      <TradeSummary draft={draft} className="mt-7" badge="Abierto" />
      <div className="mt-8 flex flex-col gap-2.5">
        <Link to="/dashboard" className={cn(buttonVariants({ variant: 'cta', size: 'lg' }), 'w-full')}>
          Ir a Inicio
        </Link>
        <Button variant="outline" size="lg" className="w-full" onClick={onAnother}>
          Registrar otro trade
        </Button>
      </div>
    </main>
  )
}
