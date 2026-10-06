import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Entitlement = {
  featureKey: string
  enabled: boolean
  hardLimit: number | null
  period: string | null
}

export function useEntitlements(userId?: string) {
  const [planKey, setPlanKey] = useState('free')
  const [items, setItems] = useState<Entitlement[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!userId) {
      setPlanKey('free')
      setItems([])
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setError(null)
    void supabase.rpc('get_my_entitlements').then(({ data, error: requestError }) => {
      if (!active) return
      if (requestError) {
        setError('No pudimos consultar tu plan.')
      } else {
        setPlanKey(data[0]?.plan_key ?? 'free')
        setItems(data.map((item) => ({
          featureKey: item.feature_key,
          enabled: item.enabled,
          hardLimit: item.hard_limit,
          period: item.period,
        })))
      }
      setLoading(false)
    })

    return () => { active = false }
  }, [userId])

  const byFeature = useMemo(() => new Map(items.map((item) => [item.featureKey, item])), [items])
  return { planKey, items, byFeature, loading, error }
}
