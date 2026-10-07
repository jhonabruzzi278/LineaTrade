import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountSection } from '../components/account/AccountSection'
import { DataCard } from '../components/perfil/DataCard'
import { PreferencesCard } from '../components/perfil/PreferencesCard'
import { ProfileIdentityCard } from '../components/perfil/ProfileIdentityCard'
import { TraderProfileCard } from '../components/perfil/TraderProfileCard'
import { Button } from '../components/ui/button'
import { ProgressBar } from '../components/ui/progress-bar'
import { useAiUsageToday } from '../hooks/useAiUsageToday'
import { useEntitlements } from '../hooks/useEntitlements'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import type { Database } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type TradeStats = Database['public']['Views']['v_user_trade_stats']['Row']

const PLAN_LABELS: Record<string, string> = { free: 'Plan Free', pro: 'Plan Pro', byok: 'Plan BYOK' }

// Resumen del plan: usa los entitlements reales; el avance diario solo se
// muestra cuando el límite de IA es diario (Free), que es lo que mide ai_usage_daily.
function PlanSummary({ userId }: { userId: string }) {
  const { planKey, byFeature } = useEntitlements(userId)
  const used = useAiUsageToday(userId)
  const ai = byFeature.get('ai_actions')
  const showDaily = ai?.period === 'day' && ai.hardLimit !== null && used !== null
  const limit = ai?.hardLimit ?? 0

  return (
    <AccountSection title="Plan">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <p className="font-body text-[16px] font-bold text-text-primary">{PLAN_LABELS[planKey] ?? planKey}</p>
          {showDaily && (
            <>
              <p className="num mt-1 text-[12px] text-text-faint">
                {used} de {limit} usos de IA hoy
              </p>
              <ProgressBar
                className="mt-2.5 w-[220px] max-w-full"
                value={limit > 0 ? (used / limit) * 100 : 0}
                label={`${used} de ${limit} usos de IA hoy`}
              />
            </>
          )}
          {!showDaily && planKey === 'byok' && <p className="mt-1 font-body text-[12px] text-text-faint">Usas tu propia clave: sin límite diario.</p>}
        </div>
        <Button asChild variant="outline">
          <Link to="/planes">Ver planes</Link>
        </Button>
      </div>
    </AccountSection>
  )
}

export default function Perfil() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const [profileRes, statsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
        supabase.from('v_user_trade_stats').select('*').eq('user_id', user!.id).maybeSingle(),
      ])
      if (cancelled) return
      setProfile(profileRes.data ?? null)
      setStats(statsRes.data ?? null)
      setLoadError(profileRes.error ? getErrorMessage(profileRes.error) : null)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return null

  function patchProfile(patch: Partial<Profile>) {
    setProfile((current) => (current ? { ...current, ...patch } : current))
  }

  return (
    <>
      <ProfileIdentityCard
        profile={profile}
        stats={stats}
        loading={loading}
        onNameSaved={(displayName) => patchProfile({ display_name: displayName })}
      />
      {loadError && (
        <p role="alert" className="font-body text-[13px] text-loss">
          No pudimos cargar tu perfil: {loadError}
        </p>
      )}
      {profile && <TraderProfileCard userId={user.id} profile={profile} onChange={patchProfile} />}
      <PreferencesCard userId={user.id} />
      <PlanSummary userId={user.id} />
      <DataCard />
    </>
  )
}
