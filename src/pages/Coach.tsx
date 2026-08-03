import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Plus, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  requestCoachReply,
  sendUserMessage,
  type CoachConversation,
  type CoachMessage,
} from '../lib/coach'
import { ChatMessage } from '../components/coach/ChatMessage'

const FREE_TIER_DAILY_LIMIT = 3
// Debe matchear el check(char_length(content) <= 4000) de ai_coach_messages
// (20260728200000_ai_coach.sql) — ese constraint es el boundary real, esto es
// solo feedback inmediato en el input.
const MAX_MESSAGE_LENGTH = 4000

// Modo foco, sin <AppFloatingNav/> — mismo criterio que Backtesting.tsx: un input de
// chat anclado abajo compite por el mismo espacio que la pill flotante de navegación
// (ver CLAUDE.md "pb-28" — acá directamente no aplica esa convención porque no hay
// nav flotante en esta pantalla). Volver al dashboard es un link explícito en el
// header, igual que "Dashboard" en BacktestingHeader.
export default function Coach() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<CoachConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usedToday, setUsedToday] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      try {
        const data = await listConversations(user!.id)
        if (!cancelled) setConversations(data)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setLoadingConversations(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let cancelled = false
    setLoadingMessages(true)
    listMessages(activeId)
      .then((data) => {
        if (!cancelled) setMessages(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let cancelled = false
    async function loadQuota() {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase.from('ai_usage_daily').select('requests_count').eq('usage_date', today).maybeSingle()
      if (!cancelled) setUsedToday(data?.requests_count ?? 0)
    }
    void loadQuota()
    return () => {
      cancelled = true
    }
  }, [messages.length])

  async function handleNewConversation() {
    if (!user) return
    setError(null)
    try {
      const conv = await createConversation(user.id)
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleDeleteConversation(id: string) {
    try {
      await deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) setActiveId(null)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleSend() {
    const content = draft.trim()
    if (!content || !user || !activeId || sending) return
    setDraft('')
    setSending(true)
    setError(null)
    try {
      const userMessage = await sendUserMessage(activeId, user.id, content)
      setMessages((prev) => [...prev, userMessage])
      const result = await requestCoachReply(activeId)
      if (!result.ok) {
        setError(result.message)
      } else {
        setMessages((prev) => [...prev, result.message])
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, updated_at: new Date().toISOString() } : c)).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
        )
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const quotaExhausted = usedToday != null && usedToday >= FREE_TIER_DAILY_LIMIT

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="border-b border-hairline px-4 py-3 flex items-center justify-between shrink-0">
        {activeId ? (
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="flex items-center gap-2 font-mono text-[12px] text-text-faint hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Conversaciones
          </button>
        ) : (
          <Link to="/dashboard" className="flex items-center gap-2 font-mono text-[12px] text-text-faint hover:text-text-primary transition-colors">
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        )}
        <p className="font-mono text-[12px] text-signal">coach de trading</p>
        {activeId ? (
          <button
            type="button"
            onClick={() => void handleDeleteConversation(activeId)}
            aria-label="Eliminar conversación"
            className="p-1.5 rounded-sm text-text-faint hover:text-loss transition-colors"
          >
            <Trash2 size={14} />
          </button>
        ) : (
          <span className="w-[14px]" />
        )}
      </header>

      {!activeId && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => void handleNewConversation()}
              className="w-full flex items-center justify-center gap-2 font-body text-[14px] px-5 py-4 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors mb-6"
            >
              <Plus size={16} />
              Nueva conversación
            </button>

            {error && <p className="font-body text-[13px] text-loss mb-4">{error}</p>}

            {loadingConversations && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

            {!loadingConversations && conversations.length === 0 && (
              <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel px-6 py-10 text-center shadow-card">
                <MessageCircle size={24} className="text-text-faint mx-auto mb-3" />
                <p className="font-body text-[14px] text-text-muted">
                  Preguntale al coach sobre tus propios patrones — ej. "¿en qué días soy más disciplinado?"
                </p>
              </div>
            )}

            {!loadingConversations && conversations.length > 0 && (
              <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveId(conv.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-panel-2/60 transition-colors"
                  >
                    <span className="font-body text-[14px] text-text-primary">{conv.title ?? 'Conversación sin título'}</span>
                    <span className="font-mono text-[11px] text-text-faint shrink-0">
                      {new Date(conv.updated_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeId && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {loadingMessages && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}
              {!loadingMessages &&
                messages.map((message) => <ChatMessage key={message.id} message={message} />)}
              {sending && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-sm border border-hairline bg-panel">
                    <p className="font-mono text-[12px] text-text-faint">Pensando...</p>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-hairline bg-panel px-4 py-3 shrink-0">
            <div className="max-w-2xl mx-auto">
              {error && <p className="font-body text-[13px] text-loss mb-2">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder={quotaExhausted ? 'Alcanzaste tu límite gratuito de hoy' : 'Escribí tu pregunta...'}
                  disabled={sending || quotaExhausted}
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={1}
                  className="flex-1 bg-ink border border-hairline rounded-sm px-3 py-2.5 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors resize-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !draft.trim() || quotaExhausted}
                  aria-label="Enviar mensaje"
                  className="p-2.5 rounded-sm bg-signal text-ink hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
              {usedToday != null && (
                <p className="font-mono text-[11px] text-text-faint mt-2">
                  {usedToday}/{FREE_TIER_DAILY_LIMIT} análisis gratuitos usados hoy ·{' '}
                  <Link to="/configuracion/ia" className="text-text-faint hover:text-text-muted underline">
                    usar mi propia key
                  </Link>
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
