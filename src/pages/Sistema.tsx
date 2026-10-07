import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Callout } from '../components/ui/callout'
import { Tabs } from '../components/ui/tabs'
import { RulesSection } from '../components/sistema/RulesSection'
import { StrategiesSection } from '../components/sistema/StrategiesSection'
import { ObjectivesSection } from '../components/sistema/ObjectivesSection'
import { useAuth } from '../lib/auth'

type Tab = 'reglas' | 'objetivos' | 'estrategias'

const TABS: { value: Tab; label: string }[] = [
  { value: 'reglas', label: 'Reglas' },
  { value: 'objetivos', label: 'Objetivos' },
  { value: 'estrategias', label: 'Estrategias' },
]

// Aviso por pestaña: deja claro qué verifica el journal por sí solo y qué no.
const NOTES: Record<Tab, ReactNode> = {
  reglas:
    'Tus reglas son tu referencia personal. El journal verifica por ti si moviste el stop; las demás las revisas tú al cerrar cada trade.',
  objetivos: (
    <>
      Tú actualizas el valor actual de cada objetivo. Tus estadísticas reales están en el{' '}
      <Link to="/reporte" className="font-semibold text-steel hover:underline">
        Reporte
      </Link>
      .
    </>
  ),
  estrategias:
    'La estrategia se elige al registrar un trade y alimenta el «mejor y peor modelo» del Reporte. Los trades sin estrategia quedan sin clasificar.',
}

// Da UI a trader_rules / strategies / objectives. El encabezado y el subnav
// de cuenta los pone AccountLayout.
export default function Sistema() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('reglas')

  if (!user) return null

  return (
    <>
      <Tabs items={TABS} value={tab} onChange={setTab} label="Sistema" className="w-full lg:w-fit" />
      <Callout>{NOTES[tab]}</Callout>
      {tab === 'reglas' && <RulesSection userId={user.id} />}
      {tab === 'objetivos' && <ObjectivesSection userId={user.id} />}
      {tab === 'estrategias' && <StrategiesSection userId={user.id} />}
    </>
  )
}
