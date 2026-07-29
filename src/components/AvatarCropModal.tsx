import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

interface AvatarCropModalProps {
  imageSrc: string
  saving: boolean
  onCancel: () => void
  onConfirm: (area: Area) => void
}

// Modal de recorte para la foto de perfil: preview grande de la imagen
// seleccionada (a diferencia del círculo de 96px en la tarjeta de Perfil) +
// un seleccionador de recorte circular (react-easy-crop) que el usuario puede
// mover/escalar antes de confirmar la subida.
export function AvatarCropModal({ imageSrc, saving, onCancel, onConfirm }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels)
  }, [])

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-ink/85 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-sm border border-hairline bg-panel-2 shadow-card p-5">
        <p className="font-mono text-[12px] uppercase tracking-wider text-signal mb-1">Ajustar foto</p>
        <p className="font-body text-[12px] text-text-faint mb-4">
          Movela y ajustá el zoom para elegir qué parte se ve en tu perfil.
        </p>

        <div className="relative w-full h-80 rounded-sm overflow-hidden bg-ink">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full mt-4 accent-signal"
          aria-label="Zoom de la imagen"
        />

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 font-body text-[13px] font-medium px-4 py-2.5 rounded-sm border border-hairline text-text-muted transition-colors hover:text-text-primary hover:border-text-faint disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => croppedArea && onConfirm(croppedArea)}
            disabled={saving || !croppedArea}
            className="flex-1 font-body text-[13px] font-medium px-4 py-2.5 rounded-sm bg-signal text-ink transition-colors hover:bg-signal-dim disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
