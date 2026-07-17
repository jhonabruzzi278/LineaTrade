import type { Database } from '../types/database'

type TradeRow = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}

const CSV_COLUMNS = [
  'fecha',
  'simbolo',
  'mercado',
  'lado',
  'estado',
  'tipo_opcion',
  'strike',
  'vencimiento',
  'entrada',
  'salida',
  'stop_loss',
  'take_profit',
  'tamano',
  'comision',
  'resultado',
  'resultado_r',
  'razon_entrada',
  'emocion',
  'error_principal',
] as const

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return ''
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function tradeToRow(trade: TradeRow): string {
  const fields: (string | number | null)[] = [
    trade.traded_at,
    trade.instruments?.symbol ?? '',
    trade.instruments?.market ?? '',
    trade.side,
    trade.status,
    trade.option_type,
    trade.strike_price,
    trade.expiration_date,
    trade.entry_price,
    trade.exit_price,
    trade.stop_loss,
    trade.take_profit,
    trade.position_size,
    trade.commission,
    trade.pnl_amount,
    trade.pnl_r,
    trade.entry_reason,
    trade.emotion,
    trade.main_mistake,
  ]
  return fields.map(escapeCsvField).join(',')
}

export function tradesToCsv(trades: TradeRow[]): string {
  const header = CSV_COLUMNS.join(',')
  const rows = trades.map(tradeToRow)
  return [header, ...rows].join('\n')
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
