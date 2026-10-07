import { useEffect, useRef, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Debe coincidir con check(char_length(content) <= 4000) de ai_coach_messages
// (20260728200000_ai_coach.sql): esa restricción es el límite real; esto es aviso inmediato.
export const COACH_MAX_MESSAGE_LENGTH = 4000
const MAX_TEXTAREA_HEIGHT_PX = 160
const COUNTER_THRESHOLD = 3500

interface CoachComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  /** Motivo por el que no se puede escribir (límite diario); reemplaza el placeholder. */
  blockedReason?: string
  inputId?: string
}

// Campo de pregunta tipo chat: crece con el texto, Enter envía y Shift+Enter hace salto
// de línea. El botón de enviar es un círculo de 44px para el pulgar.
export function CoachComposer({ value, onChange, onSend, disabled, blockedReason, inputId = 'coach-input' }: CoachComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`
  }, [value])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  const canSend = !disabled && value.trim().length > 0
  return (
    <div>
      <div className="flex items-end gap-2.5 rounded-[26px] border border-input bg-panel py-2 pl-[18px] pr-2 focus-within:border-signal lg:py-2.5 lg:pl-[22px] lg:pr-2.5">
        <label htmlFor={inputId} className="sr-only">
          Tu pregunta
        </label>
        <textarea
          id={inputId}
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={COACH_MAX_MESSAGE_LENGTH}
          disabled={disabled && Boolean(blockedReason)}
          placeholder={blockedReason ?? 'Pregunta sobre tus trades…'}
          className="min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 font-body text-[16px] leading-6 text-text-primary outline-none placeholder:text-text-faint disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-signal text-on-signal transition-opacity', !canSend && 'opacity-45')}
        >
          <ArrowUp size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      {value.length >= COUNTER_THRESHOLD && (
        <p className="num mt-1.5 text-right text-[11px] text-text-faint" aria-live="polite">
          {value.length}/{COACH_MAX_MESSAGE_LENGTH}
        </p>
      )}
    </div>
  )
}
