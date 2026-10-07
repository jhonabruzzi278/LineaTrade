import { useState } from 'react'
import { AccountSection } from '../account/AccountSection'
import { ChipToggle } from '../ui/chip-toggle'
import { Segmented } from '../ui/segmented'
import { SelectField } from '../ui/select-field'
import { onboardingSteps, type OnboardingOption } from '../../data/onboarding'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { useToast } from '../../lib/toast'
import type { Database } from '../../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

function optionsFor(stepId: string): OnboardingOption[] {
  return onboardingSteps.find((step) => step.id === stepId)?.options ?? []
}

const EXPERIENCE_OPTIONS = optionsFor('experience')
const ACCOUNT_TYPE_OPTIONS = optionsFor('accountType')
const BROKER_OPTIONS = optionsFor('broker')
const MARKET_OPTIONS = optionsFor('instruments')

// Etiquetas cortas para el selector segmentado (las del onboarding son frases).
const ACCOUNT_TYPE_SHORT_LABELS: Record<string, string> = {
  personal: 'Personal',
  prop_firm: 'Fondeo',
  not_started: 'Sin empezar',
}

const CUSTOM_BROKER_PREFIX = 'custom:'

interface TraderProfileCardProps {
  userId: string
  profile: Profile
  onChange: (patch: ProfileUpdate) => void
}

// Los mismos datos que se piden en el onboarding, editables. Cada cambio se
// guarda al instante (sin botón): son preferencias, no un formulario largo.
export function TraderProfileCard({ userId, profile, onChange }: TraderProfileCardProps) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const broker = profile.primary_broker ?? ''
  const markets = profile.traded_instruments ?? []
  const brokerKnown = BROKER_OPTIONS.some((option) => option.value === broker)

  async function save(patch: ProfileUpdate) {
    const previous: ProfileUpdate = {}
    for (const key of Object.keys(patch) as (keyof ProfileUpdate)[]) {
      Object.assign(previous, { [key]: profile[key as keyof Profile] })
    }
    onChange(patch)
    setSaving(true)
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    setSaving(false)
    if (error) {
      onChange(previous)
      showToast(getErrorMessage(error), 'error')
    }
  }

  function toggleMarket(value: string) {
    const next = markets.includes(value) ? markets.filter((m) => m !== value) : [...markets, value]
    void save({ traded_instruments: next })
  }

  return (
    <AccountSection title="Tu perfil de trader">
      <div className="grid gap-3.5 lg:grid-cols-2">
        <SelectField
          id="pf-x"
          label="Experiencia"
          value={profile.trading_experience ?? ''}
          disabled={saving}
          onChange={(e) => void save({ trading_experience: e.target.value || null })}
        >
          {!profile.trading_experience && <option value="">Sin indicar</option>}
          {EXPERIENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="pf-b"
          label="Bróker principal"
          value={broker}
          disabled={saving}
          onChange={(e) => void save({ primary_broker: e.target.value || null })}
        >
          {!broker && <option value="">Sin indicar</option>}
          {broker && !brokerKnown && <option value={broker}>{broker.replace(CUSTOM_BROKER_PREFIX, '')}</option>}
          {BROKER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-3.5 flex flex-col gap-1.5">
        <span id="pf-account-type" className="font-body text-[12px] font-semibold text-text-faint">
          Tipo de cuenta
        </span>
        <Segmented
          label="Tipo de cuenta"
          options={ACCOUNT_TYPE_OPTIONS.map((option) => ({
            value: option.value,
            label: ACCOUNT_TYPE_SHORT_LABELS[option.value] ?? option.label,
          }))}
          value={profile.account_type ?? ''}
          onChange={(value) => void save({ account_type: value })}
        />
      </div>

      <div className="mt-3.5">
        <span className="font-body text-[12px] font-semibold text-text-faint">Mercados</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {MARKET_OPTIONS.map((option) => (
            <ChipToggle
              key={option.value}
              label={option.label}
              pressed={markets.includes(option.value)}
              disabled={saving}
              onToggle={() => toggleMarket(option.value)}
            />
          ))}
        </div>
      </div>

      <p className="mt-3.5 font-body text-[12px] text-text-faint">
        Estos datos vienen de tu onboarding. Puedes cambiarlos cuando quieras.
      </p>
    </AccountSection>
  )
}
