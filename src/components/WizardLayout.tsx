import { useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { BrandMark } from './shell/BrandMark'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ProgressBar } from './ui/progress-bar'
import { cn } from '@/lib/utils'

interface WizardLayoutProps {
  stepLabel: string
  progressPercent: number
  /** Etiquetas de los pasos: activa la barra segmentada y el riel lateral de escritorio. */
  steps?: string[]
  /** Índice (desde 0) del paso actual; obligatorio si se pasan `steps`. */
  stepIndex?: number
  /** Título del riel («Nuevo trade», «Tu perfil · 2 minutos»). */
  railTitle?: string
  railNote?: string
  onSkip?: () => void
  skipLabel?: string
  onBack?: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextLabel: string
  /** Texto de apoyo junto al botón principal («Falta adjuntar la captura…»). */
  nextHint?: string
  /** Muestra la X de «Cerrar sin guardar». */
  onClose?: () => void
  /** Pide confirmación antes de cerrar (hay datos sin guardar). */
  confirmClose?: boolean
  /** Muestra la marca en la cabecera móvil (Onboarding); en Nuevo trade el espacio es para el paso. */
  showBrandOnMobile?: boolean
  /** Ancho máximo del contenido en escritorio. */
  contentWidth?: 'md' | 'lg'
  children: ReactNode
}

const WIDTH_CLASS = { md: 'max-w-[600px]', lg: 'max-w-[720px]' } as const

// Marco de los flujos en modo foco (Onboarding, Nuevo trade, cuestionario IA Trader):
// sin barra de navegación, con progreso por pasos. En escritorio suma un riel
// lateral con la lista de pasos; en móvil el pie de acciones queda fijo abajo.
export function WizardLayout({
  stepLabel,
  progressPercent,
  steps,
  stepIndex = 0,
  railTitle,
  railNote,
  onSkip,
  skipLabel = 'Omitir',
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel,
  nextHint,
  onClose,
  confirmClose = false,
  contentWidth = 'md',
  showBrandOnMobile = false,
  children,
}: WizardLayoutProps) {
  const [confirming, setConfirming] = useState(false)
  const width = WIDTH_CLASS[contentWidth]

  function handleClose() {
    if (!onClose) return
    if (confirmClose) setConfirming(true)
    else onClose()
  }

  return (
    <div className="min-h-screen lg:flex">
      {steps && (
        <aside className="hidden w-[300px] shrink-0 flex-col gap-9 border-r border-hairline px-8 py-7 lg:flex">
          <BrandMark />
          <div>
            {railTitle && <p className="label-mono mb-2.5 text-[11px]">{railTitle}</p>}
            <ol>
              {steps.map((label, i) => {
                const done = i < stepIndex
                const current = i === stepIndex
                return (
                  <li
                    key={label}
                    aria-current={current ? 'step' : undefined}
                    className={cn('flex items-center gap-3 py-2.5 font-body text-[14px]', current ? 'font-bold text-text-primary' : done ? 'text-text-faint' : 'text-text-faint/80')}
                  >
                    <span
                      className={cn(
                        'num flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                        current && 'border-signal bg-signal text-on-signal',
                        done && 'border-gain bg-gain/15 text-gain',
                        !current && !done && 'border-input',
                      )}
                    >
                      {done ? <Check className="h-[13px] w-[13px]" strokeWidth={3.2} aria-hidden="true" /> : i + 1}
                    </span>
                    {label}
                    {done && <span className="sr-only"> (completado)</span>}
                  </li>
                )
              })}
            </ol>
          </div>
          {railNote && <p className="mt-auto font-body text-[13px] leading-relaxed text-text-faint">{railNote}</p>}
        </aside>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="px-5 pt-3 lg:px-14 lg:pt-7">
          <div className="flex items-center gap-3 lg:gap-6">
            {steps && showBrandOnMobile && <BrandMark className="lg:hidden" />}
            {steps ? (
              <div
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={steps.length}
                aria-valuenow={stepIndex + 1}
                aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}
                className="hidden flex-1 gap-1.5 lg:flex"
              >
                {steps.map((label, i) => (
                  <span key={label} className={cn('h-[5px] flex-1 rounded-[3px]', i <= stepIndex ? 'bg-signal' : 'bg-input')} />
                ))}
              </div>
            ) : (
              <div className="hidden flex-1 lg:block">
                <ProgressBar value={progressPercent} label={stepLabel} className="h-[5px]" />
              </div>
            )}
            <span className={cn('num text-[12px] text-text-faint', steps ? (showBrandOnMobile ? 'ml-auto lg:ml-0' : 'mr-auto lg:mr-0') : 'mr-auto lg:mr-0')}>{stepLabel}</span>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="min-h-11 px-2 font-body text-[13px] font-semibold text-text-faint hover:text-text-primary"
              >
                {skipLabel}
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar sin guardar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-text-faint hover:text-text-primary lg:border lg:border-hairline"
              >
                <X className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
              </button>
            )}
          </div>
          {/* Móvil: barra de progreso bajo la fila de encabezado. */}
          <div className="mt-2 lg:hidden">
            {steps ? (
              <div className="flex gap-[5px]" aria-hidden="true">
                {steps.map((label, i) => (
                  <span key={label} className={cn('h-[5px] flex-1 rounded-[3px]', i <= stepIndex ? 'bg-signal' : 'bg-input')} />
                ))}
              </div>
            ) : (
              <ProgressBar value={progressPercent} label={stepLabel} className="h-[5px]" />
            )}
          </div>
        </header>

        <main className="flex-1 px-5 pb-6 pt-6 lg:px-14 lg:py-8">
          <div className={cn('mx-auto w-full', width)}>{children}</div>
        </main>

        <footer className="sticky bottom-0 border-t border-hairline bg-ink px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:static lg:border-0 lg:px-14 lg:pb-8 lg:pt-0">
          {nextHint && <p className="mb-2.5 text-center font-body text-[12px] text-text-faint lg:hidden">{nextHint}</p>}
          <div className={cn('mx-auto flex w-full items-center gap-2.5 lg:gap-4', width)}>
            {onBack && (
              <Button variant="outline" size="lg" onClick={onBack} className="lg:min-h-12">
                Atrás
              </Button>
            )}
            {nextHint && <span className="hidden flex-1 text-right font-body text-[13px] text-text-faint lg:block">{nextHint}</span>}
            <Button
              variant="cta"
              size="lg"
              onClick={onNext}
              disabled={nextDisabled}
              className={cn('flex-1 lg:px-8', nextHint ? 'lg:flex-none' : 'lg:ml-auto lg:flex-none')}
            >
              {nextLabel}
            </Button>
          </div>
        </footer>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 p-4 sm:items-center" role="presentation">
          <Card role="alertdialog" aria-modal="true" aria-labelledby="wizard-close-title" className="w-full max-w-sm">
            <h2 id="wizard-close-title" className="font-display text-[18px] text-text-primary">
              ¿Salir sin guardar?
            </h2>
            <p className="mt-2 font-body text-[14px] leading-relaxed text-text-faint">Lo que escribiste hasta ahora se perderá.</p>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
              <Button variant="outline" size="lg" autoFocus onClick={() => setConfirming(false)} className="flex-1">
                Seguir editando
              </Button>
              <Button variant="danger" size="lg" onClick={onClose} className="flex-1">
                Salir
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
