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
  openTrades: Trade[]
  onTradeOpened: (trade: Trade) => void
  onTradeClosed: (tradeId: string) => void
}

export function BacktestOrderPanel({ userId, session, currentKline, openTrades, onTradeOpened, onTradeClosed }: Props) {
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [positionSize, setPositionSize] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set, no un solo string: si se cierra el trade A y, antes de que resuelva,
  // se cierra el trade B, un solo valor haría que el finally de A borre el
  // estado "cerrando" de B también — reactivando su botón mientras el pedido
  // de B sigue en vuelo (riesgo de disparar closeBacktestTrade dos veces sobre
  // la misma operación).
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set())

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

  async function handleClose(tradeId: string) {
    if (!currentKline) return
    setClosingIds((prev) => new Set(prev).add(tradeId))
    setError(null)
    try {
      await closeBacktestTrade(tradeId, currentKline)
      onTradeClosed(tradeId)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setClosingIds((prev) => {
        const next = new Set(prev)
        next.delete(tradeId)
        return next
      })
    }
  }

  return (
    <div className="border-t border-hairline bg-panel px-4 py-4">
      <div className="max-w-2xl mx-auto">
        {openTrades.length > 0 && (
          <div className="space-y-2 mb-4">
            {openTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-sm border border-hairline bg-panel-2"
              >
                <div>
                  <p className="font-body text-[13px]">
                    <span className={trade.side === 'long' ? 'text-gain' : 'text-loss'}>
                      {trade.side === 'long' ? 'Compra' : 'Venta'}
                    </span>{' '}
                    <span className="text-text-primary font-mono tabular-nums">{trade.entry_price}</span>
                    {trade.position_size != null && trade.position_size !== 1 && (
                      <span className="text-text-faint font-mono text-[11px]"> ×{trade.position_size}</span>
                    )}
                  </p>
                  {(trade.stop_loss || trade.take_profit) && (
                    <p className="font-mono text-[10px] text-text-faint">
                      {trade.stop_loss && `SL ${trade.stop_loss}`}
                      {trade.stop_loss && trade.take_profit && ' · '}
                      {trade.take_profit && `TP ${trade.take_profit}`}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleClose(trade.id)}
                  disabled={closingIds.has(trade.id) || !currentKline}
                  className="shrink-0 font-body text-[12px] px-3 py-1.5 rounded-sm border border-loss/40 text-loss hover:bg-loss/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {closingIds.has(trade.id) ? 'Cerrando...' : 'Cerrar'}
                </button>
              </div>
            ))}
          </div>
        )}

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
