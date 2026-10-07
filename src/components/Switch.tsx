interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hideLabel?: boolean
}

// Interruptor para respuestas sí/no explícitas. `hideLabel` renderiza solo el
// control (filas de ajustes donde el título lo pinta el contenedor) y deja el
// texto como aria-label. Área táctil de 44px aunque el control sea más chico.
export function Switch({ checked, onChange, label, hideLabel = false }: SwitchProps) {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-[52px] shrink-0 items-center justify-center"
    >
      <span
        className={`relative block h-[26px] w-[46px] rounded-full border transition-colors duration-200 ${
          checked ? 'border-ink bg-signal' : 'border-hairline bg-panel-2'
        }`}
      >
        <span
          className={`absolute top-[2px] h-5 w-5 rounded-full shadow-card transition-all duration-200 ease-out ${
            checked ? 'left-[22px] bg-on-signal' : 'left-[2px] bg-text-muted'
          }`}
        />
      </span>
    </button>
  )

  if (hideLabel) return toggle

  return (
    <label className="flex cursor-pointer select-none items-center justify-between gap-3">
      <span className="font-body text-[14px] text-text-primary">{label}</span>
      {toggle}
    </label>
  )
}
