// Formato de cifras para /reporte. Signo explícito con el menos tipográfico (U+2212)
// y decimales fijos para que las columnas no «bailen». null → «—», nunca un 0 inventado.

const MINUS = '−'

export function formatSignedDecimal(value: number | null | undefined, digits = 2): string {
  if (value == null) return '—'
  const rounded = Number(value.toFixed(digits))
  if (rounded === 0) return (0).toFixed(digits)
  const abs = Math.abs(rounded).toFixed(digits)
  return rounded > 0 ? `+${abs}` : `${MINUS}${abs}`
}

export function formatUnsignedDecimal(value: number | null | undefined, digits = 2): string {
  return value == null ? '—' : value.toFixed(digits)
}

export function formatR(value: number | null | undefined): string {
  return value == null ? '—' : `${formatSignedDecimal(value, 1)}R`
}

export function formatDrawdown(value: number | null | undefined): string {
  if (value == null) return '—'
  return value === 0 ? (0).toFixed(2) : `${MINUS}${value.toFixed(2)}`
}

/** 65 → «1 h 05 min»; 38 → «38 min»; 120 → «2 h». */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const total = Math.round(minutes)
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`
}

export function tradeCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'trade' : 'trades'}`
}
