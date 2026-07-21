// Insignia circular de color por fuente — hace más fácil distinguir de un
// vistazo qué medio publicó cada nota en un feed largo, como los círculos de
// color por ticker/fuente en el feed de noticias de TradingView. El color sale
// de un hash determinístico del nombre (misma fuente = mismo color siempre),
// restringido a la paleta de marca (no hex arbitrario) para no romper el
// sistema de diseño.
const PALETTE = ['bg-signal', 'bg-gain', 'bg-loss', 'bg-signal-dim', 'bg-gain-dim', 'bg-loss-dim'] as const

function hashSource(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return hash
}

interface SourceAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function SourceAvatar({ name, size = 'sm' }: SourceAvatarProps) {
  const dims = size === 'lg' ? 'w-16 h-16 text-[24px]' : size === 'md' ? 'w-8 h-8 text-[12px]' : 'w-5 h-5 text-[9px]'
  const bg = PALETTE[hashSource(name) % PALETTE.length]
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center shrink-0 rounded-full font-mono font-bold text-ink ${dims} ${bg}`}
    >
      {initial}
    </span>
  )
}
