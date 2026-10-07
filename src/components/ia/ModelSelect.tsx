import { Field } from '../ui/field'
import { SelectField } from '../ui/select-field'
import { CUSTOM_MODEL_VALUE, findProvider } from '../../data/aiProviders'

interface ModelSelectProps {
  id: string
  providerId: string
  /** Modelo efectivo (nombre real, no el valor interno de «Otro»). */
  value: string
  onChange: (model: string) => void
}

// Selector de modelo del proveedor con salida a nombre libre («Otro modelo…»).
// Controlado por el nombre real del modelo: si no está en la lista del
// proveedor se muestra como «Otro» con su campo de texto.
export function ModelSelect({ id, providerId, value, onChange }: ModelSelectProps) {
  const models = findProvider(providerId)?.models ?? []
  const isKnown = models.some((m) => m.value === value)
  const selectValue = isKnown ? value : CUSTOM_MODEL_VALUE

  return (
    <>
      <SelectField
        id={id}
        label="Modelo"
        value={selectValue}
        onChange={(e) => onChange(e.target.value === CUSTOM_MODEL_VALUE ? '' : e.target.value)}
      >
        {models.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
        <option value={CUSTOM_MODEL_VALUE}>Otro modelo…</option>
      </SelectField>
      {!isKnown && (
        <Field id={`${id}-custom`} label="Nombre del modelo" placeholder="ej. gpt-4o-mini" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </>
  )
}
