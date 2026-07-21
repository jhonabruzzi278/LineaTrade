import type { ReactNode } from 'react'

// Contenedor tipo "Ajustes" de TradingView: grupo de filas con hairlines entre
// sí, cada fila título + descripción a la izquierda y un control a la derecha.
// Reutiliza el mismo card (borde + gradiente + shadow-card) que ya usa el nav
// de "Más" en Perfil.tsx, en vez de introducir un segundo estilo de contenedor.
export function SettingsGroup({ children }: { children: ReactNode }) {
  return (
    <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card">
      {children}
    </div>
  )
}

interface SettingsRowProps {
  title: string
  description?: string | null
  muted?: boolean
  right?: ReactNode
  footer?: ReactNode
}

export function SettingsRow({ title, description, muted = false, right, footer }: SettingsRowProps) {
  return (
    <div className={`px-5 py-4 transition-opacity duration-200 ${muted ? 'opacity-40' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-body text-[14px] text-text-primary">{title}</p>
          {description && (
            <p className="font-body text-[12.5px] text-text-muted mt-1 leading-relaxed">{description}</p>
          )}
        </div>
        {right && <div className="shrink-0 flex items-center gap-3 pt-0.5">{right}</div>}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  )
}
