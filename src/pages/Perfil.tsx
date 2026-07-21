import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { getInitials } from '../components/Avatar'
import { MetricCard } from '../components/MetricCard'
import { onboardingSteps } from '../data/onboarding'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { uploadAvatar } from '../lib/avatarUpload'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'
import { GrowthGraphIcon, PercentageIcon, RatioIcon, TradeCountIcon } from '../components/icons/TradeIcons'
import { CameraIcon } from '../components/icons/NavIcons'
import { formatNumber, formatPercent, formatSigned, signedTone } from '../lib/tradeDisplay'
import type { Database } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type TradeStats = Database['public']['Views']['v_user_trade_stats']['Row']

function optionLabel(stepId: string, value: string | null): string | null {
  if (!value) return null
  const step = onboardingSteps.find((s) => s.id === stepId)
  return step?.options.find((o) => o.value === value)?.label ?? value
}

export default function Perfil() {
  const { user, role, avatarUrl, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

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
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  function handleSignOut() {
    void supabase.auth.signOut()
  }

  async function handleAvatarSelected(file: File | undefined) {
    if (!file || !user) return
    setPhotoUploading(true)
    setPhotoError('')
    try {
      await uploadAvatar(file, user.id)
      await refreshProfile()
      showToast('Foto de perfil actualizada.', 'success')
    } catch (error: unknown) {
      setPhotoError(getErrorMessage(error))
    } finally {
      setPhotoUploading(false)
    }
  }

  const facts = profile
    ? [
        { key: 'experience', label: 'Experiencia', value: optionLabel('experience', profile.trading_experience) },
        { key: 'accountType', label: 'Cuenta', value: optionLabel('accountType', profile.account_type) },
        { key: 'broker', label: 'Broker', value: optionLabel('broker', profile.primary_broker) },
      ].filter((fact): fact is { key: string; label: string; value: string } => Boolean(fact.value))
    : []

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-6 py-10 pb-28">
        {/* Tarjeta de perfil — avatar + nombre + chip de rol dentro de una superficie
            propia, como la tarjeta de cuenta de TradingView (avatar, usuario, plan).
            `pl-4` (en vez de `pr-6` simétrico) acerca la foto al borde de la tarjeta;
            `gap-3` (antes `gap-4`) la acerca un poco más al bloque de texto. */}
        <div className="rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel shadow-card pl-4 pr-6 py-6 mb-6">
          <div className="flex items-center gap-3">
            <label
              htmlFor="avatar-upload"
              className={`group relative shrink-0 cursor-pointer ${photoUploading ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <span className="block w-16 h-16 rounded-full bg-panel-2 border border-hairline overflow-hidden flex items-center justify-center font-mono text-[18px] text-signal transition-all duration-200 group-hover:border-signal/60 group-hover:shadow-glow">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.email)
                )}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-signal border-2 border-ink flex items-center justify-center text-ink">
                {photoUploading ? (
                  <span className="w-3 h-3 border-2 border-ink/40 border-t-ink rounded-full animate-spin" aria-hidden="true" />
                ) : (
                  <CameraIcon className="w-3 h-3" />
                )}
              </span>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={photoUploading}
                onChange={(e) => void handleAvatarSelected(e.target.files?.[0])}
              />
            </label>
            {/* Jerarquía clara: nombre grande arriba (con fallback genérico, no el
                email — un email de 20px lee raro como titular), rol como chip
                secundario en la misma línea, y el email SIEMPRE abajo en un solo
                lugar (antes solo aparecía si había display_name, y como fallback
                del propio h1 si no — dos rutas distintas para el mismo dato). */}
            <div className="min-w-0">
              <p className="font-mono text-[13px] text-signal mb-1">tu perfil</p>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-display text-[20px] text-text-primary truncate">
                  {profile?.display_name || 'Tu cuenta'}
                </h1>
                {role && (
                  <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-sm border border-dashed border-text-faint text-text-faint shrink-0">
                    {role}
                  </span>
                )}
              </div>
              <p className="font-body text-[13px] text-text-muted break-all">{user?.email}</p>
            </div>
          </div>
          {photoError && <p className="font-body text-[12px] text-loss mt-4">{photoError}</p>}

          {/* Tags como chips etiquetados en grilla (antes: pills sueltas en flex-wrap
              sin ningún indicio de qué representaba cada una) — cada uno con su
              categoría en mono/mayúscula arriba y el valor abajo, más legible que
              una fila de texto suelto. */}
          {!loading && facts.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-hairline">
              {facts.map((fact) => (
                <div key={fact.key} className="min-w-0 rounded-sm border border-hairline bg-panel px-2.5 py-2">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-text-faint mb-0.5">
                    {fact.label}
                  </p>
                  <p className="font-body text-[12px] text-text-primary truncate">{fact.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tiles de acceso rápido — mismo espíritu que las dos tarjetas
            "Suscripción" / "Recomendar a un amigo" de TradingView, apuntando a lo
            que este producto sí tiene: el sistema propio y la config de IA. */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <QuickActionTile to="/sistema" label="Mi sistema" hint="Reglas, estrategias, objetivos" />
          <QuickActionTile to="/configuracion/ia" label="Config. de IA" hint="Tu propia API key (BYOK)" />
        </div>

        <h2 className="font-display text-[16px] text-text-primary mb-4">Tus números</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MetricCard
            label="Win rate"
            value={formatPercent(stats?.win_rate)}
            icon={<PercentageIcon className="w-4 h-4" />}
          />
          <MetricCard
            label="Profit factor"
            value={formatNumber(stats?.profit_factor)}
            icon={<GrowthGraphIcon className="w-4 h-4" />}
          />
          <MetricCard
            label="R promedio"
            value={formatSigned(stats?.avg_r)}
            icon={<RatioIcon className="w-4 h-4" />}
            tone={signedTone(stats?.avg_r)}
          />
          <MetricCard
            label="Trades"
            value={String(stats?.total_trades ?? 0)}
            icon={<TradeCountIcon className="w-4 h-4" />}
          />
        </div>
        {!loading && (stats?.total_trades ?? 0) > 0 && (stats?.closed_trades ?? 0) === 0 && (
          <p className="font-mono text-[12px] text-text-faint -mt-6 mb-10">
            win rate, profit factor y R promedio solo se calculan sobre trades cerrados.
          </p>
        )}

        <h2 className="font-display text-[16px] text-text-primary mb-4">Más</h2>
        <nav className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card mb-10">
          <ProfileLink to="/historial" label="Historial completo" />
          {role === 'superadmin' && <ProfileLink to="/admin" label="Admin" />}
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 font-body text-[14px] font-medium px-5 py-3 rounded-sm border border-loss/40 text-loss transition-colors duration-200 hover:bg-loss/10 hover:border-loss"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </main>
      <AppFloatingNav />
    </div>
  )
}

function ProfileLink({ to, label, hint }: { to: string; label: string; hint?: string }) {
  return (
    <Link to={to} className="group flex items-center justify-between gap-3 px-5 py-4 hover:bg-panel-2/70 transition-colors">
      <div>
        <p className="font-body text-[14px] text-text-primary">{label}</p>
        {hint && <p className="font-mono text-[11px] text-text-faint mt-0.5">{hint}</p>}
      </div>
      <span className="font-mono text-[13px] text-text-faint opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-signal">
        →
      </span>
    </Link>
  )
}

function QuickActionTile({ to, label, hint }: { to: string; label: string; hint: string }) {
  return (
    <Link
      to={to}
      className="group rounded-sm border border-hairline bg-panel-2 px-4 py-4 flex flex-col gap-2 transition-colors hover:border-signal/40 hover:bg-panel-2/70"
    >
      <span className="font-mono text-[13px] text-text-faint opacity-70 transition-all duration-200 group-hover:opacity-100 group-hover:text-signal group-hover:translate-x-0.5">
        →
      </span>
      <div>
        <p className="font-body text-[14px] text-text-primary">{label}</p>
        <p className="font-mono text-[11px] text-text-faint mt-0.5">{hint}</p>
      </div>
    </Link>
  )
}
