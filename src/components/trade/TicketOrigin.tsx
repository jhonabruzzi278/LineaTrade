import { ImagePlus, LoaderCircle } from 'lucide-react'
import { Card } from '../ui/card'
import { Switch } from '../Switch'
import { cn } from '@/lib/utils'

interface TicketDropzoneProps {
  onPhoto: (file: File) => void
  /** La foto ya está adjunta (se volvió atrás desde la revisión). */
  attached: boolean
  isDemo: boolean
  onDemoChange: (value: boolean) => void
}

// Paso «Origen»: captura del ticket del bróker + interruptor de cuenta demo. La foto
// es obligatoria; la lectura con IA es una ayuda, no un requisito (ver NuevoTrade).
export function TicketDropzone({ onPhoto, attached, isDemo, onDemoChange }: TicketDropzoneProps) {
  return (
    <div>
      <p className="label-mono mb-2 lg:text-[11px]">Captura de la operación</p>
      <label
        htmlFor="nt-photo"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-input bg-signal/5 px-4 py-8 text-center transition-colors hover:border-signal/60 focus-within:border-signal lg:gap-2.5 lg:px-6 lg:py-11"
      >
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-signal/50 bg-signal/15 text-steel lg:h-[52px] lg:w-[52px]">
          <ImagePlus className="h-[22px] w-[22px] lg:h-6 lg:w-6" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="font-body text-[15px] font-bold text-text-primary lg:text-[16px]">
          {attached ? 'Foto adjunta: toca para cambiarla' : (
            <>
              <span className="lg:hidden">Sube la captura de tu bróker</span>
              <span className="hidden lg:inline">Sube la captura de tu bróker desde tu galería</span>
            </>
          )}
        </span>
        <span className="num text-[11px] text-text-faint lg:text-[12px]">
          <span className="lg:hidden">La IA pre-llena el formulario — tú lo revisas</span>
          <span className="hidden lg:inline">La IA pre-llena el formulario — tú lo revisas antes de guardar</span>
        </span>
        <input
          id="nt-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onPhoto(file)
          }}
        />
      </label>

      <Card className="mt-4 flex min-h-[60px] items-center gap-3.5 px-3.5 py-2 sm:px-3.5 sm:py-2 lg:mt-[18px]">
        <div className="min-w-0 flex-1">
          <p className="font-body text-[14px] font-bold text-text-primary">Es una cuenta demo</p>
          <p className="mt-0.5 font-body text-[12px] text-text-faint">Se guarda como práctica y no cuenta en tus estadísticas.</p>
        </div>
        <Switch checked={isDemo} onChange={onDemoChange} label="Es una cuenta demo" hideLabel />
      </Card>
    </div>
  )
}

const READING_SKELETONS = ['h-12', 'h-12', 'h-12 col-span-2', 'h-12', 'h-12', 'h-12', 'h-12']

// Estado «Leyendo tu ticket»: miniatura, mensaje de estado y esqueleto del formulario.
export function TicketReading({ previewUrl, brokerName }: { previewUrl: string; brokerName?: string }) {
  return (
    <div>
      <div role="status" aria-live="polite" className="flex items-center gap-3.5 rounded-xl border border-hairline bg-panel p-3.5">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-input object-cover" />
        ) : (
          <span className="h-16 w-16 shrink-0 rounded-lg border border-input bg-panel-2" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-body text-[15px] font-bold text-text-primary">Leyendo la imagen con IA…</p>
          {brokerName && <p className="num mt-1 truncate text-[11px] text-text-faint">{brokerName}</p>}
        </div>
        <LoaderCircle className="h-6 w-6 shrink-0 animate-spin text-steel" strokeWidth={2.6} aria-hidden="true" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3.5" aria-hidden="true">
        {READING_SKELETONS.map((size, i) => (
          <div key={i} className={cn('animate-pulse rounded-lg bg-panel-2', size)} />
        ))}
      </div>
    </div>
  )
}
