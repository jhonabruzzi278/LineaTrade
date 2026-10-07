import { Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import type { CoachConversation } from '../../lib/coach'
import { groupConversations } from '../../lib/coachView'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  conversations: CoachConversation[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onNew: () => void
  /** Texto de uso diario (p. ej. «2/3 análisis hoy»); null mientras carga o sin límite. */
  usageLabel: string | null
  planLabel: string
}

// Historial de conversaciones agrupado por recencia (barra lateral en escritorio y
// panel deslizable en móvil). «Volver a la app» es la salida de esta pantalla de foco.
export function ConversationList({ conversations, activeId, loading, onSelect, onNew, usageLabel, planLabel }: ConversationListProps) {
  const groups = groupConversations(conversations)
  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onNew}
        className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-input px-3.5 font-body text-[14px] font-semibold text-text-primary transition-colors hover:border-text-faint"
      >
        <Plus size={16} aria-hidden="true" />
        Nueva conversación
      </button>

      <nav aria-label="Conversaciones" className="mt-2 flex-1 overflow-y-auto">
        {loading && <p className="px-3 py-3 font-body text-[13px] text-text-faint">Cargando…</p>}
        {!loading && conversations.length === 0 && <p className="px-3 py-3 font-body text-[13px] leading-relaxed text-text-faint">Aún no hay conversaciones. Haz tu primera pregunta.</p>}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="label-mono px-3 pb-1.5 pt-4">{group.label}</p>
            <ul>
              {group.items.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={conversation.id === activeId ? 'page' : undefined}
                    className={cn(
                      'block min-h-11 w-full truncate rounded-lg px-3 text-left font-body text-[14px] transition-colors',
                      conversation.id === activeId ? 'bg-panel-2 font-semibold text-text-primary' : 'text-text-muted hover:bg-panel hover:text-text-primary',
                    )}
                  >
                    {conversation.title ?? 'Conversación sin título'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-3 border-t border-hairline pt-3">
        <Link to="/dashboard" className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 font-body text-[14px] font-medium text-text-faint transition-colors hover:text-text-primary">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a la app
        </Link>
        <p className="num px-3 pt-1.5 text-[11px] text-text-faint">
          {planLabel}
          {usageLabel ? ` · ${usageLabel}` : ''}
        </p>
      </div>
    </div>
  )
}
