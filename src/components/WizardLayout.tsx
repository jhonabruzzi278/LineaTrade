import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from './ui/button'
import { ProgressBar } from './ui/progress-bar'

interface WizardLayoutProps {
  stepLabel: string
  progressPercent: number
  onSkip?: () => void
  skipLabel?: string
  onBack?: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextLabel: string
  children: ReactNode
}

// Marco común para flujos guiados: progreso visible, lectura centrada y una
// acción principal fija al final, con controles cómodos en móvil y escritorio.
export function WizardLayout({
  stepLabel,
  progressPercent,
  onSkip,
  skipLabel = 'Omitir',
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel,
  children,
}: WizardLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-ink text-text-primary">
      <header className="shrink-0 border-b border-hairline bg-panel/60">
        <div className="mx-auto max-w-6xl px-5 py-4 sm:py-5">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <p className="label-mono">{stepLabel}</p>
            {onSkip && <Button type="button" variant="ghost" onClick={onSkip}>{skipLabel}</Button>}
          </div>
          <ProgressBar value={progressPercent} label={`Avance: ${Math.round(progressPercent)} por ciento`} className="mt-2" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-7 sm:py-10">
        {children}
      </main>

      <footer className="sticky bottom-0 z-20 shrink-0 border-t border-hairline bg-ink/95 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          {onBack && (
            <Button type="button" variant="outline" size="lg" onClick={onBack} aria-label="Volver al paso anterior" className="shrink-0">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />Atrás
            </Button>
          )}
          <Button type="button" variant="cta" size="lg" onClick={onNext} disabled={nextDisabled} className="flex-1">
            {nextLabel}
          </Button>
        </div>
      </footer>
    </div>
  )
}
