import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { ScannerResult } from '../../lib/scanner'
import { explainScanResult } from '../../lib/scanner'
import { formatSigned, signedTone } from '../../lib/tradeDisplay'

const TONE_CLASS = {
  gain: 'text-gain',
  loss: 'text-loss',
  default: 'text-text-primary',
} as const

type Props = {
  result: ScannerResult
}

// Layout de 2 líneas (símbolo + variación arriba, indicadores abajo), mismo criterio
// mobile-first ya establecido en TradeListRow.tsx (ver CLAUDE.md "real mobile-overlap
// bug"): una sola fila con todo (símbolo, %, RSI, volumen, MACD) no entra en 375px
// sin superponerse.
export function ScannerResultRow({ result }: Props) {
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExplain() {
    setExplaining(true)
    setError(null)
    const result_ = await explainScanResult(result.symbol)
    setExplaining(false)
    if (!result_.ok) {
      setError(result_.message)
      return
    }
    setExplanation(result_.data.explanation)
  }

  const rsiZone = result.rsi_14 != null && result.rsi_14 < 30 ? 'sobreventa' : result.rsi_14 != null && result.rsi_14 > 70 ? 'sobrecompra' : null

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-[15px] text-text-primary">{result.symbol}</p>
        <p className={`font-mono text-[14px] tabular-nums ${TONE_CLASS[signedTone(result.price_change_pct)]}`}>
          {formatSigned(result.price_change_pct)}%
        </p>
      </div>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <p className="font-mono text-[11px] text-text-faint">
          RSI {result.rsi_14 ?? '—'}
          {rsiZone && <span className="text-signal"> · {rsiZone}</span>}
        </p>
        {result.volume_spike_ratio != null && result.volume_spike_ratio >= 2 && (
          <p className="font-mono text-[11px] text-signal">vol {result.volume_spike_ratio}x</p>
        )}
        {result.macd_histogram != null && (
          <p className={`font-mono text-[11px] ${result.macd_histogram >= 0 ? 'text-gain' : 'text-loss'}`}>
            MACD {formatSigned(result.macd_histogram)}
          </p>
        )}
      </div>

      {explanation && <p className="font-body text-[13px] text-text-muted mt-2.5 border-l-2 border-signal pl-3">{explanation}</p>}
      {error && <p className="font-body text-[12px] text-loss mt-2">{error}</p>}

      {!explanation && (
        <button
          type="button"
          onClick={() => void handleExplain()}
          disabled={explaining}
          className="flex items-center gap-1.5 font-mono text-[11px] text-signal hover:text-signal-dim transition-colors mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles size={11} />
          {explaining ? 'Analizando...' : 'Explicar con IA'}
        </button>
      )}
    </div>
  )
}
