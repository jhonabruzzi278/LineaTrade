import { BarChart3, UserRound } from 'lucide-react'
import { Tag } from '../ui/tag'
import type { CoachMessage } from '../../lib/coach'

type Props = {
  message: CoachMessage
}

// El coach ocupa el ancho de lectura como ChatGPT; los mensajes propios quedan
// en una superficie discreta y las métricas citadas aparecen separadas del texto.
export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'
  const factsCited = (message.facts_cited as unknown as Array<{ field_path: string; value: string }> | null) ?? []

  return (
    <article aria-label={isUser ? 'Tu mensaje' : 'Respuesta del Coach IA'} className={`grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3 ${isUser ? 'ml-auto max-w-[90%]' : 'mr-auto w-full'}`}>
      <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${isUser ? 'bg-panel-2 text-text-muted' : 'bg-signal/15 text-steel'}`} aria-hidden="true">
        {isUser ? <UserRound size={15} /> : <BarChart3 size={15} />}
      </span>
      <div className="min-w-0">
        <p className="mb-1 font-body text-[12px] font-bold text-text-primary">{isUser ? 'Tú' : 'Coach IA'}</p>
        <div className={`font-body text-[14px] leading-relaxed text-text-primary ${isUser ? 'rounded-2xl bg-panel-2 px-4 py-3' : 'whitespace-pre-wrap'}`}>
          {message.content}
        </div>
        {factsCited.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Datos del journal citados">
            {factsCited.map((fact, index) => (
              <Tag key={`${fact.field_path}-${index}`} tone="neutral" className="normal-case tracking-normal" >
                <span title={fact.field_path}>{fact.field_path.split('.').pop()}: {fact.value}</span>
              </Tag>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
