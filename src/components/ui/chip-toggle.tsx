import { cn } from '@/lib/utils'

interface ChipToggleProps {
  label: string
  pressed: boolean
  onToggle: () => void
  disabled?: boolean
}

// Chip de selección múltiple (mercados, filtros). `aria-pressed` comunica el
// estado y el contorno de marca no depende solo del color de relleno.
export function ChipToggle({ label, pressed, onToggle, disabled = false }: ChipToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex min-h-11 items-center rounded-full border px-4 font-body text-[13px] font-semibold transition-colors disabled:opacity-60',
        pressed ? 'border-signal bg-signal/15 text-text-primary' : 'border-input text-text-muted hover:border-text-faint',
      )}
    >
      {label}
    </button>
  )
}
