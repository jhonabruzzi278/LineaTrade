import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Etiqueta mono en mayúsculas sobre el título (p. ej. «journal»). */
  kicker?: string
  title: string
  lead?: string
  /** Acciones a la derecha (botones, selector de periodo…). */
  actions?: ReactNode
}

// Encabezado estándar de pantalla: etiqueta, título en Archivo expandido y
// una línea de apoyo. Mismo ritmo en todas las áreas.
export function PageHeader({ kicker, title, lead, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <p className="label-mono">{kicker}</p>}
        <h1 className="font-display mt-1.5 text-[26px] leading-tight text-text-primary sm:text-[32px]">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl font-body text-[14px] leading-relaxed text-text-faint sm:text-[15px]">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}
