interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

// Toggle estilo app nativa (iOS-like) — reemplaza los <input type="checkbox">
// planos en formularios donde la respuesta es un sí/no explícito.
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="font-body text-[14px] text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors duration-200 ${
          checked ? 'bg-signal border-signal' : 'bg-panel-2 border-hairline'
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-ink shadow-card transition-transform duration-200 ease-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}
