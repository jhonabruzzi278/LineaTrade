import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import type { Area } from 'react-easy-crop'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { AvatarCropModal } from '../components/AvatarCropModal'
import { getInitials } from '../components/Avatar'
import { MetricCard } from '../components/MetricCard'
import { onboardingSteps } from '../data/onboarding'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { uploadAvatar } from '../lib/avatarUpload'
import { getCroppedImageFile } from '../lib/cropImage'
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

// Solo el rango en número (a pedido) — no el texto descriptivo completo del
// onboarding ("Menos de 1 año" → "< 1").
function experienceRange(value: string | null): string | null {
  switch (value) {
    case 'lt_1y':
      return '< 1'
    case '1_3y':
      return '1-3'
    case '3_5y':
      return '3-5'
    case 'gt_5y':
      return '> 5'
    default:
      return null
  }
}

// El tag "Cuenta" mostraba antes el tipo de cuenta (texto: "Cuenta personal",
// etc.) — a pedido, ahora es un dato numérico también: antigüedad en la
// plataforma, calculada a partir de profiles.created_at.
function accountAgeDays(createdAt: string | undefined): number | null {
  if (!createdAt) return null
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, days)
}

export default function Perfil() {
  const { user, role, avatarUrl, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

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

  // Selección de archivo abre el modal de recorte en vez de subir directo —
  // ahí es donde vive el preview grande + el seleccionador de espacio de recorte.
  function handleFileSelected(file: File | undefined) {
    if (!file) return
    setPhotoError('')
    setPendingFile(file)
    setCropSrc(URL.createObjectURL(file))
  }

  function closeCropModal() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setPendingFile(null)
  }

  async function handleCropConfirm(area: Area) {
    if (!cropSrc || !pendingFile || !user) return
    setPhotoUploading(true)
    setPhotoError('')
    try {
      const croppedFile = await getCroppedImageFile(
        cropSrc,
        area,
        pendingFile.name,
        pendingFile.type || 'image/jpeg',
      )
      await uploadAvatar(croppedFile, user.id)
      await refreshProfile()
      showToast('Foto de perfil actualizada.', 'success')
      closeCropModal()
    } catch (error: unknown) {
      setPhotoError(getErrorMessage(error))
    } finally {
      setPhotoUploading(false)
    }
  }

  const accountAge = accountAgeDays(profile?.created_at)
  const facts = profile
    ? [
        { key: 'experience', label: 'Experiencia', value: experienceRange(profile.trading_experience) },
        { key: 'accountAge', label: 'Antigüedad', value: accountAge !== null ? `${accountAge} días` : null },
        { key: 'broker', label: 'Broker', value: optionLabel('broker', profile.primary_broker) },
      ].filter((fact): fact is { key: string; label: string; value: string } => Boolean(fact.value))
    : []

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-6 py-10 pb-28 lg:pb-10 lg:pl-24">
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
              {/* Preview más grande que antes (64px → 96px) para que la foto
                  actual se vea con más detalle en la tarjeta de perfil. */}
              <span className="block w-24 h-24 rounded-full bg-panel-2 border border-hairline overflow-hidden flex items-center justify-center font-mono text-[24px] text-signal transition-all duration-200 group-hover:border-signal/60 group-hover:shadow-glow">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.email)
                )}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-signal border-2 border-ink flex items-center justify-center text-ink">
                {photoUploading ? (
                  <span className="w-3.5 h-3.5 border-2 border-ink/40 border-t-ink rounded-full animate-spin" aria-hidden="true" />
                ) : (
                  <CameraIcon className="w-3.5 h-3.5" />
                )}
              </span>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={photoUploading}
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
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

        {/* Menos prominente que "Cerrar sesión" a propósito — eliminar la
            cuenta es una acción mucho más severa e irreversible, y la
            confirmación real (con el texto "ELIMINAR") vive en la propia
            página de destino, no acá. */}
        <p className="text-center mt-4">
          <Link to="/eliminar-cuenta" className="font-body text-[13px] text-text-faint hover:text-loss transition-colors">
            Eliminar mi cuenta
          </Link>
        </p>
      </main>
      <AppFloatingNav />
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          saving={photoUploading}
          onCancel={closeCropModal}
          onConfirm={(area) => void handleCropConfirm(area)}
        />
      )}
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
