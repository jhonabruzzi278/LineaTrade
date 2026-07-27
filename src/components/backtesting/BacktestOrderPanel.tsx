import { useState } from 'react'
import { BuyIcon, SellIcon } from '../icons/TradeIcons'
import { getErrorMessage } from '../../lib/errors'
import { openBacktestTrade, closeBacktestTrade, type Trade } from '../../lib/backtestTrades'
import { parsePositiveNumber } from '../../lib/backtestValidation'
import type { BacktestSession } from '../../lib/backtestSessions'
import type { Kline } from '../../lib/marketData/types'

type Props = {
  userId: string
  session: BacktestSession
  currentKline: Kline | undefined
  openTrade: Trade | null
  onTradeOpened: (trade: Trade) => void
  onTradeClosed: () => void
}

export function BacktestOrderPanel({ userId, session, currentKline, openTrade, onTradeOpened, onTradeClosed }: Props) {
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [positionSize, setPositionSize] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleOpen(side: 'long' | 'short') {
    if (!currentKline) return
    const size = parsePositiveNumber(positionSize)
    if (size === null) {
      setError('El tamaño de la posición tiene que ser un número mayor a 0.')
      return
    }
    if (stopLoss.trim() && parsePositiveNumber(stopLoss) === null) {
      setError('El stop loss tiene que ser un número mayor a 0.')
      return
    }
    if (takeProfit.trim() && parsePositiveNumber(takeProfit) === null) {
      setError('El take profit tiene que ser un número mayor a 0.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const trade = await openBacktestTrade({
        userId,
        session,
        currentKline,
        side,
        stopLoss: parsePositiveNumber(stopLoss),
        takeProfit: parsePositiveNumber(takeProfit),
        positionSize: size,
      })
      onTradeOpened(trade)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClose() {
    if (!openTrade || !currentKline) return
    setSubmitting(true)
    setError(null)
    try {
      await closeBacktestTrade(openTrade.id, currentKline)
      onTradeClosed()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (openTrade) {
    return (
      <div className="border-t border-hairline bg-panel px-4 py-4">
        {/* max-w-2xl mx-auto: la barra de fondo va full-bleed (como una toolbar de
            TradingView), pero el contenido real se centra y no se estira a lo ancho
            de un monitor grande — sin esto, "Cerrar operación" quedaba como un botón
            perdido en una fila de 1440px. */}
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-body text-[14px] text-text-primary">
              {openTrade.side === 'long' ? 'Compra' : 'Venta'} abierta a{' '}
              <span className="font-mono tabular-nums">{openTrade.entry_price}</span>
            </p>
            {(openTrade.stop_loss || openTrade.take_profit) && (
              <p className="font-mono text-[11px] text-text-faint">
                {openTrade.stop_loss && `SL ${openTrade.stop_loss}`}
                {openTrade.stop_loss && openTrade.take_profit && ' · '}
                {openTrade.take_profit && `TP ${openTrade.take_profit}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleClose()}
            disabled={submitting || !currentKline}
            className="font-body text-[13px] px-4 py-2 rounded-sm border border-loss/40 text-loss hover:bg-loss/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Cerrando...' : 'Cerrar operación'}
          </button>
        </div>
        {error && <p className="max-w-2xl mx-auto font-body text-[13px] text-loss">{error}</p>}
      </div>
    )
  }

  return (
    <div className="border-t border-hairline bg-panel px-4 py-4">
      <div className="max-w-2xl mx-auto">
        {/* grid-cols-2 md:grid-cols-3, no un grid-cols-3 fijo — mismo patrón ya
            establecido en TechnicalEntryPanel.tsx para una fila de 3 inputs numéricos
            (ver CLAUDE.md "Same 375px-first lesson caught a second time"): 3 columnas
            fijas dejan cada input con muy poco margen para escribir cómodo en mobile. */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <div>
            <label htmlFor="bt-sl" className="font-mono text-[11px] text-text-faint block mb-1">
              Stop loss
            </label>
            <input
              id="bt-sl"
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="opcional"
              className="w-full bg-ink border border-hairline rounded-sm px-2 py-2 font-mono text-[13px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
            />
          </div>
          <div>
            <label htmlFor="bt-tp" className="font-mono text-[11px] text-text-faint block mb-1">
              Take profit
            </label>
            <input
              id="bt-tp"
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="opcional"
              className="w-full bg-ink border border-hairline rounded-sm px-2 py-2 font-mono text-[13px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
            />
          </div>
          <div>
            <label htmlFor="bt-size" className="font-mono text-[11px] text-text-faint block mb-1">
              Cantidad
            </label>
            <input
              id="bt-size"
              type="number"
              value={positionSize}
              onChange={(e) => setPositionSize(e.target.value)}
              className="w-full bg-ink border border-hairline rounded-sm px-2 py-2 font-mono text-[13px] text-text-primary focus:outline-none focus:border-signal transition-colors"
            />
          </div>
        </div>

        {error && <p className="font-body text-[13px] text-loss mb-3">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleOpen('long')}
            disabled={submitting || !currentKline}
            className="flex items-center justify-center gap-2 font-body text-[14px] px-4 py-3 rounded-sm bg-gain/10 border border-gain/40 text-gain hover:bg-gain/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BuyIcon className="w-4 h-4" />
            Comprar
          </button>
          <button
            type="button"
            onClick={() => void handleOpen('short')}
            disabled={submitting || !currentKline}
            className="flex items-center justify-center gap-2 font-body text-[14px] px-4 py-3 rounded-sm bg-loss/10 border border-loss/40 text-loss hover:bg-loss/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SellIcon className="w-4 h-4" />
            Vender
          </button>
        </div>
      </div>
    </div>
  )
}
