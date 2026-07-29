import type { CoachMessage } from '../../lib/coach'

type Props = {
  message: CoachMessage
}

// Burbujas alineadas por rol — usuario a la derecha (signal), asistente a la
// izquierda (panel), mismo lenguaje visual que el resto de la app (bordes hairline,
// rounded-sm, nunca completamente redondeado). facts_cited se muestra como chips
// pequeños debajo, igual que AIAnalysisPanel.tsx/InsightsSection.tsx — la misma
// convención visual de "esto es un dato citado, no texto libre" en todo el motor de IA.
export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'
  const factsCited = (message.facts_cited as unknown as Array<{ field_path: string; value: string }> | null) ?? []

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-2.5 rounded-sm font-body text-[14px] whitespace-pre-wrap ${
            isUser ? 'bg-signal/15 border border-signal/30 text-text-primary' : 'bg-panel border border-hairline text-text-primary'
          }`}
        >
          {message.content}
        </div>
        {factsCited.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {factsCited.map((fact, i) => (
              <span
                key={`${fact.field_path}-${i}`}
                className="font-mono text-[10px] px-2 py-0.5 rounded-sm border border-hairline text-text-faint"
                title={fact.field_path}
              >
                {fact.field_path.split('.').pop()}: {fact.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
