export interface ParsedTradeRow {
  tradedAt: string
  symbol: string
  market: string
  side: 'long' | 'short'
  status: 'open' | 'closed'
  optionType: 'call' | 'put' | null
  strikePrice: number | null
  expirationDate: string | null
  entryPrice: number
  exitPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  positionSize: number | null
  commission: number
  entryReason: string | null
  emotion: string | null
  mainMistake: string | null
}

// Mismo orden de columnas que tradeExport.ts's CSV_COLUMNS — este parser
// solo entiende el formato que genera nuestro propio "Exportar CSV" en
// Historial, no el de ningún broker en particular (cada uno exporta
// distinto; mapear eso es un problema mucho más grande que journaling).
const EXPECTED_HEADER = [
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
]

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}

function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function orNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

interface ParseResult {
  rows: ParsedTradeRow[]
  errors: string[]
}

export function parseTradesCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { rows: [], errors: ['El archivo está vacío.'] }
  }

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const isValidHeader = EXPECTED_HEADER.every((col) => header.includes(col))
  if (!isValidHeader) {
    return {
      rows: [],
      errors: [
        'El archivo no tiene el formato esperado. Usa el CSV que genera "Exportar CSV" en Historial.',
      ],
    }
  }

  const rows: ParsedTradeRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1
    const values = parseCsvLine(lines[i])
    const get = (col: string): string => values[header.indexOf(col)] ?? ''

    const tradedAt = get('fecha').trim()
    const symbol = get('simbolo').trim().toUpperCase()
    const market = get('mercado').trim()
    const side = get('lado').trim() as 'long' | 'short'
    const status = get('estado').trim() as 'open' | 'closed'
    const entryPrice = orNumber(get('entrada'))
    const exitPrice = orNumber(get('salida'))

    if (!tradedAt || !symbol || !market || (side !== 'long' && side !== 'short')) {
      errors.push(`Fila ${rowNumber}: fecha, símbolo, mercado y lado (long/short) son obligatorios.`)
      continue
    }
    if (status !== 'open' && status !== 'closed') {
      errors.push(`Fila ${rowNumber}: estado debe ser "open" o "closed".`)
      continue
    }
    if (entryPrice == null) {
      errors.push(`Fila ${rowNumber}: precio de entrada inválido.`)
      continue
    }
    if (status === 'closed' && exitPrice == null) {
      errors.push(`Fila ${rowNumber}: un trade "closed" necesita precio de salida.`)
      continue
    }

    const optionTypeRaw = get('tipo_opcion').trim().toLowerCase()
    rows.push({
      tradedAt,
      symbol,
      market,
      side,
      status,
      optionType: optionTypeRaw === 'call' || optionTypeRaw === 'put' ? optionTypeRaw : null,
      strikePrice: orNumber(get('strike')),
      expirationDate: orNull(get('vencimiento')),
      entryPrice,
      exitPrice,
      stopLoss: orNumber(get('stop_loss')),
      takeProfit: orNumber(get('take_profit')),
      positionSize: orNumber(get('tamano')),
      commission: orNumber(get('comision')) ?? 0,
      entryReason: orNull(get('razon_entrada')),
      emotion: orNull(get('emocion')),
      mainMistake: orNull(get('error_principal')),
    })
  }

  return { rows, errors }
}
