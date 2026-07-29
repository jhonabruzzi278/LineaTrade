import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useMarketReplay } from '../hooks/useMarketReplay'
import { useBacktestSession } from '../hooks/useBacktestSession'
import type { Trade } from '../lib/backtestTrades'
import {
  createChartAnnotation,
  deleteChartAnnotation,
  isRangeShape,
  listChartAnnotations,
  listConfluenceTypes,
  type ChartAnnotation,
  type ConfluenceType,
} from '../lib/confluences'
import { getErrorMessage } from '../lib/errors'
import { detectConfluenceCandidates } from '../lib/confluenceDetection'
import { detectConfluencesWithAI } from '../lib/confluenceAIDetection'
import { ChartEngine, type AnnotationView } from '../components/backtesting/ChartEngine'
import { ReplayControls } from '../components/backtesting/ReplayControls'
import { SymbolTimeframePicker } from '../components/backtesting/SymbolTimeframePicker'
import { BacktestOrderPanel } from '../components/backtesting/BacktestOrderPanel'
import { DrawingToolbar } from '../components/backtesting/DrawingToolbar'
import { ConfluenceLegendPanel } from '../components/backtesting/ConfluenceLegendPanel'
import { ConfluenceSuggestionsPanel, type Suggestion } from '../components/backtesting/ConfluenceSuggestionsPanel'

const MAX_SUGGESTIONS_SHOWN = 8

// Modo foco, sin <AppHeader/>/<AppFloatingNav/> — un gráfico de replay necesita el
// máximo alto de viewport posible (ver docs/lineatrade-backtesting-plan.md §3.3).
// Ruta protegida (App.tsx): abre real `trades` contra auth.uid().
//
// Página deliberadamente delgada — solo compone useBacktestSession (ciclo de vida
// de la sesión) + useMarketReplay (estado del replay) y renderiza. Toda la lógica
// con estado vive en esos dos hooks, cada uno probable por separado sin montar
// esta página completa.
export default function Backtesting() {
  const { user } = useAuth()
  const bt = useBacktestSession(user?.id)
  const replay = useMarketReplay(bt.klines)
  const [openTrade, setOpenTrade] = useState<Trade | null>(null)

  const [confluenceTypes, setConfluenceTypes] = useState<ConfluenceType[]>([])
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([])
  const [drawingType, setDrawingType] = useState<ConfluenceType | null>(null)
  const [pendingPoint, setPendingPoint] = useState<{ time: number; price: number } | null>(null)
  const [confluenceError, setConfluenceError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggesting, setSuggesting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listConfluenceTypes()
      .then((types) => {
        if (!cancelled) setConfluenceTypes(types)
      })
      .catch((err: unknown) => {
        if (!cancelled) setConfluenceError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sessionId = bt.session?.id
  useEffect(() => {
    if (!sessionId) {
      setAnnotations([])
      return
    }
    let cancelled = false
    listChartAnnotations(sessionId)
      .then((rows) => {
        if (!cancelled) setAnnotations(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setConfluenceError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const confluenceTypeById = useMemo(() => new Map(confluenceTypes.map((t) => [t.id, t])), [confluenceTypes])

  // Mismo principio de "ocultar el futuro" que ya aplica useMarketReplay.ts a las
  // velas: una confluencia dibujada más adelante en la línea de tiempo no debería
  // aparecer si el usuario retrocede el replay a un punto anterior a ella.
  const visibleAnnotations = useMemo(() => {
    const cutoff = replay.currentKline?.time
    if (cutoff === undefined) return []
    return annotations.filter((a) => a.time_start <= cutoff)
  }, [annotations, replay.currentKline])

  const annotationViews = useMemo<AnnotationView[]>(
    () =>
      visibleAnnotations.flatMap((a) => {
        const type = confluenceTypeById.get(a.confluence_type_id)
        if (!type) return []
        return [
          {
            id: a.id,
            timeStart: a.time_start,
            priceStart: a.price_start,
            timeEnd: a.time_end,
            priceEnd: a.price_end,
            color: type.color,
            shape: type.shape,
          },
        ]
      }),
    [visibleAnnotations, confluenceTypeById],
  )

  const legendEntries = useMemo(
    () =>
      visibleAnnotations.flatMap((a) => {
        const type = confluenceTypeById.get(a.confluence_type_id)
        if (!type) return []
        return [{ id: a.id, confluenceName: type.name, color: type.color }]
      }),
    [visibleAnnotations, confluenceTypeById],
  )

  function handleSelectType(type: ConfluenceType) {
    setConfluenceError(null)
    setPendingPoint(null)
    setDrawingType((current) => (current?.id === type.id ? null : type))
  }

  function handleCancelDrawing() {
    setDrawingType(null)
    setPendingPoint(null)
  }

  async function handleChartPoint(point: { time: number; price: number }) {
    if (!drawingType || !user || !bt.session) return
    const needsSecondPoint = isRangeShape(drawingType.shape)

    if (needsSecondPoint && !pendingPoint) {
      setPendingPoint(point)
      return
    }

    const p1 = needsSecondPoint && pendingPoint ? pendingPoint : point
    try {
      const created = await createChartAnnotation({
        userId: user.id,
        backtestSessionId: bt.session.id,
        symbol: bt.session.symbol,
        timeframe: bt.session.timeframe,
        confluenceTypeId: drawingType.id,
        timeStart: p1.time,
        priceStart: p1.price,
        timeEnd: needsSecondPoint ? point.time : null,
        priceEnd: needsSecondPoint ? point.price : null,
      })
      setAnnotations((prev) => [...prev, created])
    } catch (err) {
      setConfluenceError(getErrorMessage(err))
    } finally {
      setPendingPoint(null)
      setDrawingType(null)
    }
  }

  async function handleDeleteAnnotation(id: string) {
    try {
      await deleteChartAnnotation(id)
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setConfluenceError(getErrorMessage(err))
    }
  }

  // Detección determinística (instantánea, sin IA) sobre las velas visibles, seguida
  // de la llamada a la IA que solo filtra/explica esos candidatos — ver "Nota de
  // diseño" del plan: la IA nunca calcula coordenadas nuevas, solo prioriza.
  async function handleSuggestConfluences() {
    if (!bt.session) return
    setSuggesting(true)
    setConfluenceError(null)
    try {
      const candidates = detectConfluenceCandidates(replay.visibleKlines)
      const result = await detectConfluencesWithAI(bt.session.symbol, bt.session.timeframe, candidates)
      if (!result.ok) {
        setConfluenceError(result.message)
        return
      }
      const byKey = new Map(candidates.map((c) => [c.key, c]))
      const kept = result.evaluations
        .filter((e) => e.keep)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, MAX_SUGGESTIONS_SHOWN)
        .flatMap((e) => {
          const candidate = byKey.get(e.key)
          return candidate ? [{ ...candidate, confidence: e.confidence, note: e.note }] : []
        })
      setSuggestions(kept)
      if (kept.length === 0) {
        setConfluenceError('La IA no encontró confluencias relevantes en las velas visibles.')
      }
    } catch (err) {
      setConfluenceError(getErrorMessage(err))
    } finally {
      setSuggesting(false)
    }
  }

  async function handleAcceptSuggestion(suggestion: Suggestion) {
    if (!user || !bt.session) return
    const type = confluenceTypes.find((t) => t.name === suggestion.confluenceName)
    if (!type) {
      setConfluenceError(`No existe el tipo de confluencia "${suggestion.confluenceName}" todavía.`)
      return
    }
    try {
      const created = await createChartAnnotation({
        userId: user.id,
        backtestSessionId: bt.session.id,
        symbol: bt.session.symbol,
        timeframe: bt.session.timeframe,
        confluenceTypeId: type.id,
        timeStart: suggestion.timeStart,
        priceStart: suggestion.priceStart,
        timeEnd: suggestion.timeEnd,
        priceEnd: suggestion.priceEnd,
        source: 'ai_suggested',
      })
      setAnnotations((prev) => [...prev, created])
      setSuggestions((prev) => prev.filter((s) => s.key !== suggestion.key))
    } catch (err) {
      setConfluenceError(getErrorMessage(err))
    }
  }

  function handleDismissSuggestion(key: string) {
    setSuggestions((prev) => prev.filter((s) => s.key !== key))
  }

  if (bt.phase !== 'active' || !bt.session) {
    return (
      <div className="min-h-screen bg-ink flex flex-col">
        <BacktestingHeader />
        <div className="flex-1 flex items-center justify-center">
          <SymbolTimeframePicker loading={bt.phase === 'loading'} error={bt.error} onStart={(p) => void bt.start(p)} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-ink flex flex-col overflow-hidden">
      <BacktestingHeader
        subtitle={`${bt.session.symbol} · ${bt.session.timeframe}`}
        onFinish={() => {
          setOpenTrade(null)
          void bt.finish()
        }}
        finishing={bt.finishing}
      />
      {(bt.error || confluenceError) && (
        <p className="font-body text-[13px] text-loss px-4 py-2 bg-loss/10 shrink-0">{bt.error || confluenceError}</p>
      )}
      <div className="flex-1 min-h-0">
        <ChartEngine
          klines={replay.visibleKlines}
          annotations={annotationViews}
          pendingPoint={pendingPoint && drawingType ? { ...pendingPoint, color: drawingType.color } : null}
          drawingActive={Boolean(drawingType)}
          onChartPoint={(point) => void handleChartPoint(point)}
        />
      </div>
      <DrawingToolbar
        confluenceTypes={confluenceTypes}
        drawingType={drawingType}
        hasPendingPoint={Boolean(pendingPoint)}
        onSelectType={handleSelectType}
        onCancel={handleCancelDrawing}
        onSuggestAI={() => void handleSuggestConfluences()}
        suggesting={suggesting}
      />
      <ConfluenceSuggestionsPanel
        suggestions={suggestions}
        onAccept={(s) => void handleAcceptSuggestion(s)}
        onDismiss={handleDismissSuggestion}
      />
      <ConfluenceLegendPanel entries={legendEntries} onDelete={(id) => void handleDeleteAnnotation(id)} />
      <ReplayControls
        currentIndex={replay.currentIndex}
        total={bt.klines.length}
        isPlaying={replay.isPlaying}
        onTogglePlay={() => replay.setIsPlaying((p) => !p)}
        onStepForward={() => replay.stepForward()}
        onStepBack={() => replay.stepBackward()}
        onReset={replay.reset}
        speedMs={replay.speedMs}
        onSpeedChange={replay.setSpeedMs}
      />
      {user && (
        <BacktestOrderPanel
          userId={user.id}
          session={bt.session}
          currentKline={replay.currentKline}
          openTrade={openTrade}
          onTradeOpened={setOpenTrade}
          onTradeClosed={() => setOpenTrade(null)}
        />
      )}
    </div>
  )
}

function BacktestingHeader({
  subtitle,
  onFinish,
  finishing = false,
}: {
  subtitle?: string
  onFinish?: () => void
  finishing?: boolean
}) {
  return (
    <header className="border-b border-hairline px-4 py-3 flex items-center justify-between shrink-0">
      <Link
        to="/dashboard"
        className="flex items-center gap-2 font-mono text-[12px] text-text-faint hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Dashboard
      </Link>
      {subtitle && <p className="font-mono text-[12px] text-signal">{subtitle}</p>}
      {onFinish ? (
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="font-body text-[13px] px-3 py-1.5 rounded-sm border border-hairline text-text-muted hover:border-text-faint transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {finishing ? 'Finalizando...' : 'Finalizar sesión'}
        </button>
      ) : (
        <span />
      )}
    </header>
  )
}
