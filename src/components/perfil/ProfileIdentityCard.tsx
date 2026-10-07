import { useRef, useState, type FormEvent } from 'react'
import { Camera } from 'lucide-react'
import type { Area } from 'react-easy-crop'
import { AvatarCropModal } from '../AvatarCropModal'
import { getInitials } from '../Avatar'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Field } from '../ui/field'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { uploadAvatar } from '../../lib/avatarUpload'
import { getCroppedImageFile } from '../../lib/cropImage'
import { getErrorMessage } from '../../lib/errors'
import { useToast } from '../../lib/toast'
import { formatPercent, formatSigned, signedTone } from '../../lib/tradeDisplay'
import { cn } from '@/lib/utils'
import type { Database } from '../../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type TradeStats = Database['public']['Views']['v_user_trade_stats']['Row']

const NAME_MAX_LENGTH = 60
const MS_PER_DAY = 1000 * 60 * 60 * 24

function accountAgeDays(createdAt: string | undefined): number | null {
  if (!createdAt) return null
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / MS_PER_DAY))
}

function memberSince(createdAt: string | undefined): string | null {
  if (!createdAt) return null
  return new Date(createdAt).toLocaleDateString('es', { month: 'long', year: 'numeric' })
}

interface StatTileProps {
  label: string
  value: string
  tone?: 'default' | 'gain' | 'loss'
}

function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  return (
    <div className="rounded-[10px] border border-hairline bg-ink px-3 py-2.5">
      <p className="label-mono text-[9px]">{label}</p>
      <p className={cn('num mt-1.5 text-[18px] font-medium', tone === 'gain' && 'text-gain', tone === 'loss' && 'text-loss')}>{value}</p>
    </div>
  )
}

interface ProfileIdentityCardProps {
  profile: Profile | null
  stats: TradeStats | null
  loading: boolean
  onNameSaved: (displayName: string | null) => void
}

// Tarjeta principal del perfil: foto (con recorte), nombre editable, correo
// (solo lectura: es la identidad de acceso) y un resumen de números reales.
export function ProfileIdentityCard({ profile, stats, loading, onNameSaved }: ProfileIdentityCardProps) {
  const { user, avatarUrl, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const savedName = profile?.display_name ?? ''
  const draftName = name ?? savedName
  const isDirty = draftName.trim() !== savedName.trim()
  const since = memberSince(profile?.created_at)
  const age = accountAgeDays(profile?.created_at)

  async function handleSaveName(event: FormEvent) {
    event.preventDefault()
    if (!user || !isDirty) return
    const next = draftName.trim() || null
    setSavingName(true)
    setNameError('')
    const { error } = await supabase.from('profiles').update({ display_name: next }).eq('id', user.id)
    setSavingName(false)
    if (error) {
      setNameError(getErrorMessage(error))
      return
    }
    onNameSaved(next)
    setName(null)
    showToast('Cambios guardados.', 'success')
  }

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
    // Permite volver a elegir el mismo archivo tras cancelar el recorte.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCropConfirm(area: Area) {
    if (!cropSrc || !pendingFile || !user) return
    setPhotoUploading(true)
    setPhotoError('')
    try {
      const croppedFile = await getCroppedImageFile(cropSrc, area, pendingFile.name, pendingFile.type || 'image/jpeg')
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

  return (
    <Card as="section" aria-label="Tus datos de cuenta" className="p-4 lg:px-[26px] lg:py-6">
      <div className="flex flex-wrap items-center gap-4 lg:gap-[22px]">
        <div className="relative h-20 w-20 shrink-0 lg:h-24 lg:w-24">
          <span className="font-display flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-hairline bg-panel-2 text-[27px] text-steel lg:text-[32px]">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(user?.email)}
          </span>
          <button
            type="button"
            aria-label="Cambiar foto"
            disabled={photoUploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-signal text-on-signal transition-colors hover:bg-signal-dim disabled:opacity-60"
          >
            {photoUploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-signal/40 border-t-on-signal" aria-hidden="true" />
            ) : (
              <Camera className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            disabled={photoUploading}
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <p className="break-words font-body text-[20px] font-bold text-text-primary">{profile?.display_name || 'Tu cuenta'}</p>
          <p className="mt-[3px] break-all font-body text-[14px] text-text-faint">{user?.email}</p>
          {since && <p className="num mt-1.5 text-[11px] text-text-faint">Miembro desde {since}</p>}
        </div>
      </div>
      {photoError && (
        <p role="alert" className="mt-3 font-body text-[12px] text-loss">
          {photoError}
        </p>
      )}

      <form onSubmit={(e) => void handleSaveName(e)} className="mt-[18px]">
        <div className="grid gap-3.5 lg:grid-cols-2">
          <Field
            id="pf-n"
            label="Nombre para mostrar"
            value={draftName}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
          <Field id="pf-e" label="Correo" value={user?.email ?? ''} disabled readOnly hint="Es el correo con el que entras." />
        </div>

        <div className="mt-[18px] grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatTile label="Trades" value={loading ? '—' : String(stats?.total_trades ?? 0)} />
          <StatTile label="Win rate" value={formatPercent(stats?.win_rate)} />
          <StatTile
            label="R prom."
            value={stats?.avg_r == null ? '—' : `${formatSigned(stats.avg_r)}R`}
            tone={signedTone(stats?.avg_r)}
          />
          <StatTile label="Antigüedad" value={age === null ? '—' : `${age} d`} />
        </div>
        {!loading && (stats?.total_trades ?? 0) > 0 && (stats?.closed_trades ?? 0) === 0 && (
          <p className="mt-2.5 font-body text-[12px] text-text-faint">
            Win rate y R promedio solo se calculan sobre trades cerrados.
          </p>
        )}

        {nameError && (
          <p role="alert" className="mt-3 font-body text-[12px] text-loss">
            {nameError}
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="cta" size="lg" disabled={!isDirty || savingName} className="w-full lg:w-auto">
            {savingName ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          saving={photoUploading}
          onCancel={closeCropModal}
          onConfirm={(area) => void handleCropConfirm(area)}
        />
      )}
    </Card>
  )
}
