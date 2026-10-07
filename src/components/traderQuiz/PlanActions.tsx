import { Link } from 'react-router-dom'
import { Download, RotateCcw } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

interface PlanActionsProps {
  onCreateRules: () => void
  creatingRules: boolean
  onDownload: () => void
  downloading: boolean
  onRetake: () => void
  /** Resultado de la última acción (reglas creadas, paquete listo…). */
  notice: { tone: 'info' | 'error'; text: string; sistemaLink?: boolean } | null
}

// «Llévalo a tu sistema»: solo acciones que existen hoy. Crear reglas inserta
// borradores desactivados en Sistema; descargar entrega el .zip para tu IA externa.
export function PlanActions({ onCreateRules, creatingRules, onDownload, downloading, onRetake, notice }: PlanActionsProps) {
  return (
    <Card as="aside" aria-label="Llévalo a tu sistema" className="lg:sticky lg:top-6">
      <p className="label-mono">Llévalo a tu sistema</p>
      <p className="mt-2 font-body text-[14px] leading-relaxed text-text-muted">Convierte el plan en reglas dentro de LineaTrade o llévalo a tu IA.</p>
      <div className="mt-4 flex flex-col gap-2.5">
        <Button variant="cta" size="lg" onClick={onCreateRules} disabled={creatingRules} className="w-full">
          {creatingRules ? 'Creando reglas...' : 'Crear mis reglas en Sistema'}
        </Button>
        <Button variant="outline" onClick={onDownload} disabled={downloading} className="w-full">
          <Download size={16} aria-hidden="true" />
          {downloading ? 'Preparando paquete...' : 'Descargar paquete (.zip)'}
        </Button>
        <Button variant="outline" onClick={onRetake} className="w-full">
          <RotateCcw size={16} aria-hidden="true" />
          Repetir el cuestionario
        </Button>
      </div>
      <p className="mt-3 font-body text-[12px] leading-relaxed text-text-faint">Las reglas se crean desactivadas: tú las revisas y las activas.</p>
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-3 border-l-2 pl-3 font-body text-[13px] leading-relaxed ${notice.tone === 'error' ? 'border-loss text-loss' : 'border-signal text-text-muted'}`}>
          {notice.text}
          {notice.sistemaLink && (
            <>
              {' '}
              <Link to="/sistema" className="font-semibold text-steel underline">
                Ir a Sistema
              </Link>
            </>
          )}
        </p>
      )}
    </Card>
  )
}
