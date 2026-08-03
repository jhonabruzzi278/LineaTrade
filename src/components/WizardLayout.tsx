import type { ReactNode } from 'react'

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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-hairline">
        <div className="max-w-md mx-auto px-6 py-5 flex items-center justify-between">
          <span className="font-mono text-[12px] text-text-faint tracking-wide">{stepLabel}</span>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="font-body text-[13px] text-text-faint hover:text-text-muted transition-colors"
            >
              {skipLabel}
            </button>
          )}
        </div>
        <div className="h-[2px] bg-panel-2">
          <div
            className="h-full bg-signal shadow-[0_0_12px_rgba(201,156,84,0.6)] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto px-6 pt-12 pb-8 w-full">{children}</main>

      <footer className="max-w-md mx-auto px-6 py-8 w-full flex items-center gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="font-body text-[14px] px-5 py-3 rounded-sm border border-hairline text-text-primary hover:border-text-faint transition-colors"
          >
            Atrás
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1 font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal disabled:hover:shadow-none"
        >
          {nextLabel}
        </button>
      </footer>
    </div>
  )
}
