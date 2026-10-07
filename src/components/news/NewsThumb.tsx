import { cn } from '@/lib/utils'

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
  return (
    <div className={cn('relative flex items-end overflow-hidden bg-gradient-to-br from-panel-2 to-hairline', className)}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading={eager ? 'eager' : 'lazy'} decoding="async" />
      ) : (
        showSource && (
          <span className="num m-2.5 rounded bg-ink px-[7px] py-[3px] text-[10px] font-semibold uppercase tracking-[0.04em] text-text-muted">{sourceName}</span>
        )
      )}
    </div>
  )
}
