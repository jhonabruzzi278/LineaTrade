// Función pura, sin dependencias de React/Supabase — a propósito, para que se pueda
// probar con un test unitario simple sin levantar ni un componente ni la stack local.
// Usada por BacktestOrderPanel.tsx para stop loss / take profit / cantidad, que
// comparten la misma regla ("vacío es válido si es opcional, pero si hay algo tiene
// que ser un número > 0").
export function parsePositiveNumber(raw: string): number | null {
  if (!raw.trim()) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function isBlankOrPositiveNumber(raw: string): boolean {
  return !raw.trim() || parsePositiveNumber(raw) !== null
}
