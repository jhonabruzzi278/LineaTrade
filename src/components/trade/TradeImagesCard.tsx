import { useEffect, useState, type ChangeEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { Card } from '../ui/card'
import { Segmented } from '../ui/segmented'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../lib/toast'
import { getSignedImageUrl, uploadTradeImage, type ImageStage } from '../../lib/tradeImages'
import { cn } from '@/lib/utils'
import type { Database } from '../../types/database'

type TradeImage = Database['public']['Tables']['trade_images']['Row'] & { url: string | null }

const STAGE_LABELS: Record<ImageStage, string> = { before: 'Antes', during: 'Durante', after: 'Después' }
const STAGE_OPTIONS = (Object.keys(STAGE_LABELS) as ImageStage[]).map((value) => ({ value, label: STAGE_LABELS[value] }))

// Capturas del trade por etapa (antes / durante / después). El bucket es privado:
// cada imagen se muestra con una URL firmada que se genera al cargar la pantalla.
export function TradeImagesCard({ tradeId }: { tradeId: string }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [images, setImages] = useState<TradeImage[]>([])
  const [stage, setStage] = useState<ImageStage>('before')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('trade_images')
        .select('*')
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: true })
      if (!data) return
      const withUrls = await Promise.all(data.map(async (img) => ({ ...img, url: await getSignedImageUrl(img.storage_path) })))
      if (!cancelled) setImages(withUrls)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [tradeId])

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo si falla
    if (!file || !user) return
    setUploading(true)
    setError(null)
    try {
      const row = await uploadTradeImage(file, user.id, tradeId, stage)
      const url = await getSignedImageUrl(row.storage_path)
      setImages((prev) => [...prev, { ...row, url }])
      showToast('Imagen subida.', 'success')
    } catch (uploadError: unknown) {
      setError(getErrorMessage(uploadError))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card as="section" className="px-5 py-5 sm:px-6">
      <h2 className="font-display mb-4 text-[16px] text-text-primary">Capturas</h2>

      {images.length > 0 ? (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <li key={img.id}>
              <a
                href={img.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-square overflow-hidden rounded-[10px] border border-hairline"
              >
                {img.url ? (
                  <img src={img.url} alt={`Captura del trade — ${STAGE_LABELS[img.stage]}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-panel-2 font-body text-[12px] text-text-faint">
                    No se pudo cargar
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-1 text-center font-mono text-[10px] uppercase text-text-primary">
                  {STAGE_LABELS[img.stage]}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 font-body text-[14px] text-text-faint">Aún no hay capturas de este trade.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Etapa de la captura" options={STAGE_OPTIONS} value={stage} onChange={setStage} className="w-full sm:w-64" />
        <label
          className={cn(
            'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-input px-4 font-body text-[14px] font-bold text-text-primary transition-colors hover:border-text-faint hover:bg-panel-2/50 focus-within:outline focus-within:outline-2 focus-within:outline-signal',
            uploading && 'pointer-events-none opacity-50',
          )}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {uploading ? 'Subiendo…' : `Agregar imagen (${STAGE_LABELS[stage].toLowerCase()})`}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void handleUpload(e)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 font-body text-[13px] text-loss">
          {error}
        </p>
      )}
    </Card>
  )
}
