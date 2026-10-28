import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Newspaper } from 'lucide-react'

interface NewsThumbProps {
  imageUrl: string | null
  sourceName: string
  className?: string
  /** Muestra el nombre de la fuente sobre el placeholder (tarjetas grandes). */
  showSource?: boolean
  eager?: boolean
}

// Miniatura de una nota: la imagen del feed o, si no hay, un degradado neutro con la
// fuente. Sin colores por fuente: el color queda reservado para marca y P&L.
export function NewsThumb({ imageUrl, sourceName, className, showSource = false, eager = false }: NewsThumbProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = Boolean(imageUrl && !imageFailed)

  return (
    <div className={cn('relative flex items-end overflow-hidden bg-panel-2', className)}>
      {hasImage ? (
        <img
          src={imageUrl!}
          alt=""
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-panel-2 via-panel-2 to-hairline text-text-faint">
          <Newspaper className="h-6 w-6 opacity-60" strokeWidth={1.5} />
          <span className="max-w-[85%] truncate px-2 text-center font-body text-[10px] font-semibold uppercase tracking-[0.08em] opacity-80">{sourceName}</span>
        </div>
      )}
      {hasImage && showSource && (
        <span className="relative z-10 m-2.5 rounded bg-ink/85 px-[7px] py-[3px] text-[10px] font-semibold uppercase tracking-[0.04em] text-text-muted">{sourceName}</span>
      )}
    </div>
  )
}
