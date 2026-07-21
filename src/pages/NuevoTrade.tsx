import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WizardLayout } from '../components/WizardLayout'
import { BrokerPicker } from '../components/trade/BrokerPicker'
import { TechnicalEntryPanel, type TechnicalEntryData } from '../components/trade/TechnicalEntryPanel'
import { PsychologySection, type PsychologyData } from '../components/trade/PsychologySection'
import { emptyOrderTicket, hasOrderTicketData } from '../components/trade/OrderTicketFields'
import { popularBrokers } from '../data/brokers'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { resolveInstrumentId } from '../lib/instruments'
import { combineDateTimeToIso } from '../lib/tradeDisplay'
import { getErrorMessage } from '../lib/errors'
import type { Database } from '../types/database'

type InstrumentMarket = Database['public']['Enums']['instrument_market']

function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const STEP_LABELS = ['Origen', 'Contexto', 'Psicología', 'Aprendizaje']

// Usa componentes de fecha locales, no toISOString() (que convierte a UTC y
// puede adelantar un día cerca de medianoche en husos horarios negativos).
function today(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

interface TradeDraft {
  brokerId?: string
  brokerName?: string
  technical: TechnicalEntryData
  entryReason: string
  confirmations: string
  psychology: PsychologyData
  mainMistake: string
  whatToRepeat: string
  whatToAvoid: string
  lessonLearned: string
}

const initialDraft: TradeDraft = {
  technical: {
    photoAttached: false,
    market: '',
    symbol: '',
    action: 'long',
    date: today(),
    time: nowTime(),
    quantity: '',
    price: '',
    stopLoss: '',
    commission: '',
    optionType: 'call',
    strikePrice: '',
    expirationDate: '',
    orderTicket: emptyOrderTicket,
  },
  entryReason: '',
  confirmations: '',
  psychology: {
    emotion: '',
    confidenceLevel: 5,
    stressLevel: 5,
    followedPlan: false,
    hadFomo: false,
    movedStopLoss: false,
    overtraded: false,
  },
  mainMistake: '',
  whatToRepeat: '',
  whatToAvoid: '',
  lessonLearned: '',
}

// Registra una operación completa: origen técnico (bróker + datos de mercado,
// siempre partiendo de una foto del bróker), contexto, psicología y aprendizaje.
// El paso 0 alimenta trades.* directamente; contexto/psicología/aprendizaje
// alimentan los campos homónimos del schema.
export default function NuevoTrade() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<TradeDraft>(initialDraft)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isLastStep = stepIndex === STEP_LABELS.length - 1

  // Acceso rápido "Foto rápida" del FAB (/nuevo-trade?broker=primary): salta el
  // paso de elegir bróker precargando el bróker principal del onboarding.
  useEffect(() => {
    if (!user || searchParams.get('broker') !== 'primary') return
    let cancelled = false
    async function prefillPrimaryBroker() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_broker')
        .eq('id', user!.id)
        .maybeSingle()
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

  function isStepValid(): boolean {
    if (stepIndex === 0) {
      if (!draft.brokerId || !draft.technical.photoAttached) return false
      const hasCoreFields = Boolean(
        draft.technical.market && draft.technical.symbol && draft.technical.quantity && draft.technical.price,
      )
      if (draft.technical.market === 'options') {
        return hasCoreFields && Boolean(draft.technical.strikePrice && draft.technical.expirationDate)
      }
      return hasCoreFields
    }
    return true
  }

  async function saveOpenOrderTicket(tradeId: string) {
    if (!user || !hasOrderTicketData(draft.technical.orderTicket)) return
    const ticket = draft.technical.orderTicket
    const orderPlacedAt = ticket.orderPlacedTime
      ? combineDateTimeToIso(draft.technical.date, ticket.orderPlacedTime)
      : null
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
      const instrumentId = await resolveInstrumentId(
        draft.technical.symbol,
        draft.technical.market as InstrumentMarket,
        user.id,
      )
      const tradedAt = combineDateTimeToIso(draft.technical.date, draft.technical.time)
      const isOptions = draft.technical.market === 'options'

      const { data, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          instrument_id: instrumentId,
          side: draft.technical.action,
          traded_at: tradedAt,
          entry_price: Number(draft.technical.price),
          position_size: Number(draft.technical.quantity),
          stop_loss: draft.technical.stopLoss ? Number(draft.technical.stopLoss) : null,
          commission: draft.technical.commission ? Number(draft.technical.commission) : 0,
          option_type: isOptions ? draft.technical.optionType : null,
          strike_price: isOptions && draft.technical.strikePrice ? Number(draft.technical.strikePrice) : null,
          expiration_date: isOptions && draft.technical.expirationDate ? draft.technical.expirationDate : null,
          entry_reason: orNull(draft.entryReason),
          confirmations: orNull(draft.confirmations),
          emotion: orNull(draft.psychology.emotion),
          confidence_level: draft.psychology.confidenceLevel,
          stress_level: draft.psychology.stressLevel,
          followed_plan: draft.psychology.followedPlan,
          had_fomo: draft.psychology.hadFomo,
          moved_stop_loss: draft.psychology.movedStopLoss,
          overtraded: draft.psychology.overtraded,
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
    if (isLastStep) {
      void saveTrade()
      return
    }
    setStepIndex((i) => i + 1)
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  if (done) {
    return <NuevoTradeComplete symbol={draft.technical.symbol} />
  }

  return (
    <WizardLayout
      stepLabel={`paso ${stepIndex + 1} de ${STEP_LABELS.length} · ${STEP_LABELS[stepIndex]}`}
      progressPercent={((stepIndex + 1) / STEP_LABELS.length) * 100}
      onBack={stepIndex > 0 ? goBack : undefined}
      onNext={goNext}
      nextDisabled={!isStepValid() || saving}
      nextLabel={saving ? 'Guardando...' : isLastStep ? 'Guardar trade' : 'Continuar'}
    >
      {saveError && <p className="font-body text-[13px] text-loss mb-6">{saveError}</p>}

      {stepIndex === 0 && (
        <>
          <h1 className="font-display text-[26px] text-text-primary mb-2">¿De dónde viene esta operación?</h1>
          <p className="font-body text-[14px] text-text-muted mb-8">
            Elige el bróker y subí la captura de la operación.
          </p>
          <BrokerPicker
            value={draft.brokerId}
            onSelect={(id, name) => setDraft((prev) => ({ ...prev, brokerId: id, brokerName: name }))}
          />
          {draft.brokerId && (
            <div className="mt-8 pt-6 border-t border-hairline">
              <TechnicalEntryPanel
                data={draft.technical}
                onChange={(technical) => setDraft((prev) => ({ ...prev, technical }))}
              />
            </div>
          )}
        </>
      )}

      {stepIndex === 1 && (
        <>
          <h1 className="font-display text-[26px] text-text-primary mb-2">Contexto</h1>
          <p className="font-body text-[14px] text-text-muted mb-8">
            ¿Qué viste antes de entrar? Esto es lo que la IA usará como evidencia más adelante.
          </p>
          <div className="space-y-5">
            <TextAreaField
              label="Razón de entrada"
              value={draft.entryReason}
              onChange={(value) => setDraft((prev) => ({ ...prev, entryReason: value }))}
              placeholder="¿Por qué entraste en este momento?"
            />
            <TextAreaField
              label="Confirmaciones"
              value={draft.confirmations}
              onChange={(value) => setDraft((prev) => ({ ...prev, confirmations: value }))}
              placeholder="¿Qué señales o confluencias confirmaron la entrada?"
            />
          </div>
        </>
      )}

      {stepIndex === 2 && (
        <>
          <h1 className="font-display text-[26px] text-text-primary mb-2">Psicología</h1>
          <p className="font-body text-[14px] text-text-muted mb-8">
            Sin autocensura: esto es lo que después la IA contrasta contra el dato objetivo.
          </p>
          <PsychologySection
            data={draft.psychology}
            onChange={(psychology) => setDraft((prev) => ({ ...prev, psychology }))}
          />
        </>
      )}

      {stepIndex === 3 && (
        <>
          <h1 className="font-display text-[26px] text-text-primary mb-2">Aprendizaje</h1>
          <p className="font-body text-[14px] text-text-muted mb-8">Lo último, mientras el trade sigue fresco.</p>
          <div className="space-y-5">
            <TextAreaField
              label="Error principal"
              value={draft.mainMistake}
              onChange={(value) => setDraft((prev) => ({ ...prev, mainMistake: value }))}
              placeholder="Si hubo un error, ¿cuál fue?"
            />
            <TextAreaField
              label="Qué repetir"
              value={draft.whatToRepeat}
              onChange={(value) => setDraft((prev) => ({ ...prev, whatToRepeat: value }))}
              placeholder="¿Qué hiciste bien y quieres repetir?"
            />
            <TextAreaField
              label="Qué evitar"
              value={draft.whatToAvoid}
              onChange={(value) => setDraft((prev) => ({ ...prev, whatToAvoid: value }))}
              placeholder="¿Qué quieres evitar la próxima vez?"
            />
            <TextAreaField
              label="Lección aprendida"
              value={draft.lessonLearned}
              onChange={(value) => setDraft((prev) => ({ ...prev, lessonLearned: value }))}
              placeholder="Resume la lección en una frase"
            />
          </div>
        </>
      )}
    </WizardLayout>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="font-body text-[13px] text-text-muted block mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors resize-none"
      />
    </div>
  )
}

function NuevoTradeComplete({ symbol }: { symbol: string }) {
  const title = symbol ? `${symbol} quedó registrado` : 'Tu trade quedó registrado'

  return (
    <div className="min-h-screen bg-ink">
      <main className="max-w-md mx-auto px-6 pt-24 text-center">
        <p className="font-mono text-[13px] text-signal mb-4">trade guardado</p>
        <h1 className="font-display text-[26px] text-text-primary mb-3">{title}</h1>
        <Link
          to="/dashboard"
          className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors mt-8"
        >
          Ir al Dashboard
        </Link>
      </main>
    </div>
  )
}
