import { InsightsSection } from '../components/InsightsSection'
import { PageHeader } from '../components/ui/page-header'

export default function Insights() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-28 pt-6 lg:pb-12">
      <PageHeader kicker="evidencia" title="Insights" lead="Patrones basados únicamente en tus operaciones cerradas." />
      <InsightsSection />
    </main>
  )
}
