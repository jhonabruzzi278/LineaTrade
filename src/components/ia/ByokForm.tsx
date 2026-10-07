import { useState, type FormEvent } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '../ui/button'
import { Field } from '../ui/field'
import { SelectField } from '../ui/select-field'
import { Tag } from '../ui/tag'
import { AI_PROVIDERS, CUSTOM_MODEL_VALUE, findProvider, modelHasVision, type AiProviderId } from '../../data/aiProviders'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { cn } from '@/lib/utils'

interface ByokFormProps {
  initialProvider?: string | null
  initialModel?: string | null
  submitLabel: string
  onSaved: () => void
  onCancel?: () => void
}

function Step({ number, children }: { number: number; children: string }) {
  return (
    <div className="mt-5 flex items-center gap-2.5 font-body text-[14px] font-bold text-text-primary first:mt-0">
      <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-signal text-[12px] text-on-signal" aria-hidden="true">
        {number}
      </span>
      {children}
    </div>
  )
}

// Los tres pasos: proveedor, clave, modelo. La clave se envía por RPC y nunca
// vuelve al cliente: el campo se vacía tras guardar y no existe ninguna lectura.
export function ByokForm({ initialProvider, initialModel, submitLabel, onSaved, onCancel }: ByokFormProps) {
  const startProvider = findProvider(initialProvider ?? '')?.id ?? AI_PROVIDERS[0].id
  const startKnown = findProvider(startProvider)?.models.some((m) => m.value === initialModel) ?? false
  const [providerId, setProviderId] = useState<AiProviderId>(startProvider)
  const [apiKey, setApiKey] = useState('')
  const [modelChoice, setModelChoice] = useState(
    initialModel ? (startKnown ? initialModel : CUSTOM_MODEL_VALUE) : (findProvider(startProvider)?.models[0].value ?? ''),
  )
  const [customModel, setCustomModel] = useState(initialModel && !startKnown ? initialModel : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const provider = findProvider(providerId) ?? AI_PROVIDERS[0]
  const model = modelChoice === CUSTOM_MODEL_VALUE ? customModel.trim() : modelChoice
  const vision = modelHasVision(providerId, model)
  const canSubmit = apiKey.trim() !== '' && model !== '' && !saving

  function selectProvider(id: AiProviderId) {
    setProviderId(id)
    setModelChoice(findProvider(id)?.models[0].value ?? '')
    setCustomModel('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const { error: saveError } = await supabase.rpc('set_byok_api_key', {
      p_provider: providerId,
      p_api_key: apiKey.trim(),
      p_model: model,
    })
    setSaving(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    setApiKey('')
    onSaved()
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <Step number={1}>Elige tu proveedor</Step>
      <div role="radiogroup" aria-label="Proveedor" className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {AI_PROVIDERS.map((option) => {
          const selected = option.id === providerId
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectProvider(option.id)}
              className={cn(
                'flex min-h-14 items-center gap-2.5 rounded-[10px] px-3.5 text-left font-body text-[14px] font-semibold text-text-primary transition-colors',
                selected ? 'border-2 border-signal bg-signal/10' : 'border border-hairline bg-ink hover:border-text-faint',
              )}
            >
              <span className="num flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-panel-2 text-[11px] font-bold text-steel" aria-hidden="true">
                {option.badge}
              </span>
              {option.label}
            </button>
          )
        })}
      </div>

      <Step number={2}>Pega tu clave</Step>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Field
            id="byok-key"
            label="Clave de API"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={provider.keyPlaceholder}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <a
          href={provider.keyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 font-body text-[13px] font-semibold text-steel hover:underline"
        >
          Dónde obtenerla
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <Step number={3}>Elige el modelo</Step>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SelectField id="byok-model" label="Modelo" value={modelChoice} onChange={(e) => setModelChoice(e.target.value)}>
          {provider.models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
          <option value={CUSTOM_MODEL_VALUE}>Otro modelo…</option>
        </SelectField>
        {modelChoice === CUSTOM_MODEL_VALUE && (
          <Field id="byok-model-custom" label="Nombre del modelo" placeholder="ej. gpt-4o-mini" value={customModel} onChange={(e) => setCustomModel(e.target.value)} />
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {vision === true && <Tag tone="brand">Visión</Tag>}
        {vision === false && <Tag tone="spark">Sin visión</Tag>}
      </div>
      <p className="mt-2 font-body text-[12px] text-text-faint">
        {vision === false
          ? 'Este modelo no lee imágenes: la lectura de capturas de trades no funcionará con él.'
          : 'La lectura de capturas de trades necesita un modelo con visión. El mismo modelo se usa para texto e imágenes.'}
      </p>

      {error && (
        <p role="alert" className="mt-3 font-body text-[13px] text-loss">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2.5">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="cta" disabled={!canSubmit}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
