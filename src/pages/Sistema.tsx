import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { RulesSection } from '../components/sistema/RulesSection'
import { StrategiesSection } from '../components/sistema/StrategiesSection'
import { ObjectivesSection } from '../components/sistema/ObjectivesSection'
import { useAuth } from '../lib/auth'

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
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="font-mono text-[13px] text-signal mb-2">tu sistema</p>
        <h1 className="font-display text-[28px] text-text-primary mb-8">Reglas, estrategias y objetivos</h1>

        <div className="flex gap-2 mb-8 border-b border-hairline">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`font-body text-[13px] px-4 py-3 border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-signal text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'reglas' && <RulesSection userId={user.id} />}
        {tab === 'estrategias' && <StrategiesSection userId={user.id} />}
        {tab === 'objetivos' && <ObjectivesSection userId={user.id} />}
      </main>
    </div>
  )
}
