import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { InsightsSection } from '../components/InsightsSection'
import { useSidebar } from '../lib/sidebar'
import { cn } from '@/lib/utils'

export default function Insights() {
  const { expanded } = useSidebar()

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main
        className={cn(
          'max-w-3xl mx-auto px-6 py-10 pb-28 lg:pb-10 transition-[padding-left] duration-200',
          expanded ? 'lg:pl-80' : 'lg:pl-24',
        )}
      >
        <header className="mb-8 reveal-up">
          <p className="font-mono text-[13px] text-signal mb-2">evidencia</p>
          <h1 className="font-display text-[28px] text-text-primary">Insights</h1>
          <p className="font-body text-[14px] text-text-muted mt-2">
            Patrones basados únicamente en tus operaciones cerradas.
          </p>
        </header>
        <InsightsSection />
      </main>
      <AppFloatingNav />
    </div>
  )
}
