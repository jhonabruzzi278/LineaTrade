import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { AccountRow, AccountSection } from '../account/AccountSection'
import { Button } from '../ui/button'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { downloadCsv, tradesToCsv } from '../../lib/tradeExport'
import { useToast } from '../../lib/toast'
import type { Database } from '../../types/database'

type TradeRow = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}

// Exportar y cerrar sesión. Cerrar sesión no navega: al quedar sin usuario,
// <ProtectedRoute> redirige solo (ver CLAUDE.md, «Signing out»).
export function DataCard() {
  const { showToast } = useToast()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    const { data, error } = await supabase
      .from('trades')
      .select('*, instruments(symbol, market)')
      .is('deleted_at', null)
      .order('traded_at', { ascending: false })
    setExporting(false)
    if (error) {
      showToast(getErrorMessage(error), 'error')
      return
    }
    const trades = (data as TradeRow[] | null) ?? []
    if (trades.length === 0) {
      showToast('Todavía no tienes trades para exportar.', 'info')
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`lineatrade-trades-${today}.csv`, tradesToCsv(trades))
    showToast(`${trades.length} trade${trades.length === 1 ? '' : 's'} exportado${trades.length === 1 ? '' : 's'}.`, 'success')
  }

  return (
    <AccountSection title="Tus datos">
      <AccountRow
        title="Exportar mis trades"
        description="Descarga un CSV con tus trades, incluidos los de práctica."
        control={
          <Button type="button" variant="outline" disabled={exporting} onClick={() => void handleExport()}>
            {exporting ? 'Preparando…' : 'Descargar CSV'}
          </Button>
        }
      />
      <AccountRow
        title="Cerrar sesión"
        description="Saldrás de este dispositivo."
        control={
          <Button type="button" variant="danger" onClick={() => void supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        }
      />
      <p className="border-t border-hairline pt-3.5 font-body text-[12px] text-text-faint">
        ¿Quieres borrar todo?{' '}
        <Link to="/eliminar-cuenta" className="font-semibold text-text-muted underline-offset-2 hover:text-loss hover:underline">
          Eliminar mi cuenta
        </Link>
      </p>
    </AccountSection>
  )
}
