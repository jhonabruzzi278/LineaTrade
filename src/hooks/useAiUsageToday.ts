import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Usos de IA consumidos hoy (UTC), leídos de ai_usage_daily. Devuelve null
// mientras carga o si no hay sesión.
export function useAiUsageToday(userId?: string): number | null {
  const [used, setUsed] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const today = new Date().toISOString().slice(0, 10)
    void supabase
      .from('ai_usage_daily')
      .select('requests_count')
      .eq('usage_date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setUsed(data?.requests_count ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return userId ? used : null
}
