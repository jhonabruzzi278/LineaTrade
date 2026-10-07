import { useState } from 'react'
import { RulesSection } from '../components/sistema/RulesSection'
import { StrategiesSection } from '../components/sistema/StrategiesSection'
import { ObjectivesSection } from '../components/sistema/ObjectivesSection'
import { useAuth } from '../lib/auth'
import { cn } from '@/lib/utils'
import { PageHeader } from '../components/ui/page-header'
import { Tabs } from '../components/ui/tabs'

type Tab = 'reglas' | 'estrategias' | 'objetivos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'reglas', label: 'Reglas' },
  { id: 'estrategias', label: 'Estrategias' },
  { id: 'objetivos', label: 'Objetivos' },
]

// Da UI a trader_rules / strategies / objectives — tablas que ya existían en el
// schema (con RLS y grants) pero sin ninguna pantalla que las usara.
export default function Sistema() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('reglas')

  if (!user) return null

  return (
    <div className="min-h-screen">
      <main
        className={cn('mx-auto max-w-5xl px-5 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10')}
      >
        <PageHeader kicker="Cuenta · mi sistema" title="Tu proceso operativo" lead="Define reglas, estrategias y objetivos que puedas revisar después de cada sesión." />

        <Tabs label="Secciones de mi sistema" items={TABS.map((t) => ({ value: t.id, label: t.label }))} value={tab} onChange={setTab} className="mb-7 w-full sm:w-auto" />

        {tab === 'reglas' && <RulesSection userId={user.id} />}
        {tab === 'estrategias' && <StrategiesSection userId={user.id} />}
        {tab === 'objetivos' && <ObjectivesSection userId={user.id} />}
      </main>
    </div>
  )
}
