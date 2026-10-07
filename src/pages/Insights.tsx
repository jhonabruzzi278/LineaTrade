import { InsightsSection } from '../components/InsightsSection'
import { cn } from '@/lib/utils'
import { PageHeader } from '../components/ui/page-header'

export default function Insights() {

  return (
    <div className="min-h-screen">
      <main
        className={cn(
          'max-w-3xl mx-auto px-6 py-10 pb-28 lg:pb-10'
        )}
      >
        <PageHeader kicker="Análisis · evidencia" title="Insights" lead="Patrones basados únicamente en tus operaciones cerradas." />
        <InsightsSection />
      </main>
    </div>
  )
}
