import { useState } from 'react'
import { Check, Copy, TrendingUp } from 'lucide-react'
import type { CoachMessage } from '../../lib/coach'
import { factName } from '../../lib/insightsView'
import { cn } from '@/lib/utils'

type Props = {
  message: CoachMessage
}

type CitedFact = { field_path: string; value: string }

// Marca del coach: mismo cuadrado azul de la marca, a escala de avatar.
function CoachAvatar() {
  return (
    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-signal text-on-signal" aria-hidden="true">
      <TrendingUp size={16} strokeWidth={2.4} />
    </span>
  )
}

// Mensaje del usuario como burbuja a la derecha; respuesta del coach como texto a
// ancho de columna con su avatar. `facts_cited` se muestra como chips: cada uno es un
// dato literal del journal que respalda la respuesta, no texto libre.
export function ChatMessage({ message }: Props) {
  const [copied, setCopied] = useState(false)

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] bg-panel-2 px-[18px] py-3 font-body text-[15px] leading-relaxed text-text-primary lg:max-w-[78%] lg:text-[16px]">
          {message.content}
        </p>
      </div>
    )
  }

  const factsCited = (message.facts_cited as unknown as CitedFact[] | null) ?? []

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Sin permiso de portapapeles: no hay nada que mostrar.
    }
  }

  return (
    <div className="flex gap-3.5 lg:gap-4">
      <CoachAvatar />
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words font-body text-[15px] leading-[1.75] text-text-primary lg:text-[16px]">{message.content}</p>
        {factsCited.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Datos citados">
            {factsCited.map((fact, i) => (
              <li
                key={`${fact.field_path}-${i}`}
                title={fact.field_path}
                className="num rounded-md border border-hairline bg-panel px-2.5 py-1.5 text-[11px] text-steel lg:text-[12px]"
              >
                {factName(fact.field_path)}: <b className="font-semibold text-text-primary">{fact.value}</b>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={copied ? 'Respuesta copiada' : 'Copiar respuesta'}
          className="mt-2.5 -ml-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-panel hover:text-text-primary"
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}

// El coach está generando la respuesta. Tres puntos con retardo escalonado; con
// movimiento reducido el CSS global los deja quietos y el texto accesible se mantiene.
export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3.5 lg:gap-4">
      <CoachAvatar />
      <div role="status" aria-label="El coach está pensando" className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('h-2 w-2 animate-pulse rounded-full bg-text-faint')} style={{ animationDelay: `${i * 180}ms` }} />
        ))}
      </div>
    </div>
  )
}
