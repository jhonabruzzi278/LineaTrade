import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useMarketReplay } from '../hooks/useMarketReplay'
import { useBacktestSession } from '../hooks/useBacktestSession'
import type { Trade } from '../lib/backtestTrades'
import { ChartEngine } from '../components/backtesting/ChartEngine'
import { ReplayControls } from '../components/backtesting/ReplayControls'
import { SymbolTimeframePicker } from '../components/backtesting/SymbolTimeframePicker'
import { BacktestOrderPanel } from '../components/backtesting/BacktestOrderPanel'

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
      {bt.error && <p className="font-body text-[13px] text-loss px-4 py-2 bg-loss/10 shrink-0">{bt.error}</p>}
      <div className="flex-1 min-h-0">
        <ChartEngine klines={replay.visibleKlines} />
      </div>
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
