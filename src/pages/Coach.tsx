import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Plus, Send, Trash2, Menu, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Tag } from '../components/ui/tag'
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

// Modo foco, sin <AppFloatingNav/>: un input de
// chat anclado abajo compite por el mismo espacio que la pill flotante de navegación
// (ver CLAUDE.md "pb-28" — acá directamente no aplica esa convención porque no hay
// nav flotante en esta pantalla). Volver al dashboard es un link explícito en el
// header.
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
  const [showHistory, setShowHistory] = useState(false)
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
      setMessages([])
      setActiveId(conv.id)
      setShowHistory(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleStartWithPrompt(prompt: string) {
    if (!user) return
    setError(null)
    try {
      const conv = await createConversation(user.id)
      setConversations((prev) => [conv, ...prev])
      setMessages([])
      setActiveId(conv.id)
      setDraft(prompt)
      setShowHistory(false)
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
  const suggestions = [
    '¿En qué días soy más disciplinado?',
    '¿Cómo me va cuando tengo FOMO?',
    '¿Qué estrategia me funciona mejor?',
    '¿Qué errores repito más?',
  ]

  return (
    <div className="flex h-dvh min-h-[480px] overflow-hidden bg-ink text-text-primary">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-hairline bg-panel/70 lg:flex">
        <div className="border-b border-hairline p-4">
          <Link to="/dashboard" className="mb-4 inline-flex min-h-11 items-center gap-2 font-body text-[13px] font-semibold text-text-faint hover:text-text-primary">
            <ArrowLeft size={16} aria-hidden="true" />Volver a la app
          </Link>
          <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void handleNewConversation()}>
            <Plus size={16} aria-hidden="true" />Nueva conversación
          </Button>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          loading={loadingConversations}
          onSelect={(id) => { setActiveId(id); setShowHistory(false) }}
        />
        <div className="border-t border-hairline p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-body text-[13px] font-semibold">Plan Free</span>
            <Tag tone="neutral">{usedToday ?? '—'}/{FREE_TIER_DAILY_LIMIT} hoy</Tag>
          </div>
          <Link to="/planes" className="mt-2 inline-flex min-h-11 items-center font-body text-[12px] font-semibold text-steel hover:text-text-primary">Ver planes</Link>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-hairline px-3 sm:px-5">
          <button type="button" onClick={() => setShowHistory((show) => !show)} aria-label={showHistory ? 'Volver al coach' : 'Ver conversaciones'} className="flex h-11 w-11 items-center justify-center rounded-lg text-text-muted hover:bg-panel hover:text-text-primary lg:hidden">
            {showHistory ? <ArrowLeft size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="font-display text-[16px] text-text-primary">Coach IA</p>
            <p className="font-body text-[11px] text-text-faint">Solo con los datos de tu journal</p>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone="brand">{usedToday ?? '—'}/{FREE_TIER_DAILY_LIMIT} análisis hoy</Tag>
            {activeId && (
              <Button type="button" variant="ghost" size="icon" aria-label="Eliminar conversación" onClick={() => void handleDeleteConversation(activeId)}>
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            )}
            <Button asChild variant="outline" className="hidden sm:inline-flex"><Link to="/dashboard">Volver a la app</Link></Button>
          </div>
        </header>

        {error && <p role="alert" className="mx-auto mt-3 w-[min(100%-2rem,760px)] rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 font-body text-[13px] text-loss">{error}</p>}

        {showHistory ? (
          <div className="flex-1 overflow-y-auto p-4 lg:hidden">
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-[20px]">Conversaciones</h1>
                  <Link to="/dashboard" className="inline-flex min-h-11 items-center font-body text-[12px] font-semibold text-steel">Volver a la app</Link>
                </div>
                <Button type="button" variant="cta" onClick={() => void handleNewConversation()}><Plus size={16} aria-hidden="true" />Nueva</Button>
              </div>
              <ConversationList conversations={conversations} activeId={activeId} loading={loadingConversations} onSelect={(id) => { setActiveId(id); setShowHistory(false) }} />
            </div>
          </div>
        ) : activeId ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto max-w-[760px] space-y-6">
                {loadingMessages && <p className="font-body text-[14px] text-text-faint">Cargando conversación…</p>}
                {!loadingMessages && messages.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="font-display text-[20px]">¿Qué quieres revisar?</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setDraft(suggestion)} className="min-h-11 rounded-full border border-hairline px-4 font-body text-[13px] text-text-muted hover:border-signal/50 hover:text-text-primary">{suggestion}</button>)}
                    </div>
                  </div>
                )}
                {!loadingMessages && messages.map((message) => <ChatMessage key={message.id} message={message} />)}
                {sending && <div className="font-body text-[13px] text-text-faint">El coach está revisando tus datos…</div>}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="shrink-0 border-t border-hairline bg-panel/80 px-3 py-3 sm:px-6">
              <div className="mx-auto max-w-[760px]">
                <div className="flex items-end gap-2 rounded-2xl border border-input bg-ink p-2 shadow-sm">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend() } }}
                    placeholder={quotaExhausted ? 'Alcanzaste el límite gratuito de hoy' : 'Pregunta sobre tus trades…'}
                    aria-label="Mensaje para el Coach IA"
                    disabled={sending || quotaExhausted}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={1}
                    className="max-h-40 min-h-11 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 font-body text-[16px] text-text-primary placeholder:text-text-faint focus:outline-none disabled:opacity-50 sm:text-[15px]"
                  />
                  <Button type="button" variant="cta" size="icon" onClick={() => void handleSend()} disabled={loadingMessages || sending || !draft.trim() || quotaExhausted} aria-label="Enviar mensaje">
                    <Send size={16} aria-hidden="true" />
                  </Button>
                </div>
                <p className="mt-2 text-center font-body text-[11px] text-text-faint">
                  {usedToday != null ? `${usedToday}/${FREE_TIER_DAILY_LIMIT} análisis gratuitos usados hoy · ` : ''}El coach cita datos del journal; no da señales ni asesoría financiera.{' '}
                  <Link to="/configuracion/ia" className="text-steel hover:underline">Usar mi propia IA</Link>
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
            <div className="mx-auto flex min-h-full max-w-[760px] flex-col justify-center">
              <div className="mb-6 text-center">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-signal/30 bg-signal/10 text-steel"><Sparkles size={22} aria-hidden="true" /></span>
                <h1 className="font-display text-[24px] leading-tight sm:text-[30px]">¿Qué quieres entender de tus trades?</h1>
                <p className="mx-auto mt-2 max-w-lg font-body text-[14px] leading-relaxed text-text-faint">El coach revisa tu journal y cita los datos que respaldan cada respuesta.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void handleStartWithPrompt(suggestion)} className="flex min-h-[60px] items-center justify-between gap-3 rounded-xl border border-hairline bg-panel px-4 py-3 text-left font-body text-[13px] font-semibold text-text-primary transition-colors hover:border-signal/40 hover:bg-panel-2">
                    <span>{suggestion}</span><MessageCircle size={16} className="shrink-0 text-text-faint" aria-hidden="true" />
                  </button>
                ))}
              </div>
              {loadingConversations && <p className="mt-6 text-center font-body text-[12px] text-text-faint">Cargando conversaciones…</p>}
              {!loadingConversations && conversations.length === 0 && <p className="mt-6 text-center font-body text-[12px] text-text-faint">Empieza con una pregunta sobre tus propios patrones.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function ConversationList({
  conversations,
  activeId,
  loading,
  onSelect,
}: {
  conversations: CoachConversation[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
}) {
  if (loading) return <p className="p-4 font-body text-[13px] text-text-faint">Cargando conversaciones…</p>
  if (conversations.length === 0) return <p className="p-4 font-body text-[13px] text-text-faint">Tus conversaciones aparecerán aquí.</p>
  return (
    <nav aria-label="Conversaciones" className="flex-1 overflow-y-auto p-2">
      <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-text-faint">Recientes</p>
      {conversations.map((conversation) => (
        <button key={conversation.id} type="button" aria-current={activeId === conversation.id ? 'page' : undefined} onClick={() => onSelect(conversation.id)} className={`mb-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left font-body text-[13px] transition-colors ${activeId === conversation.id ? 'bg-panel-2 text-text-primary' : 'text-text-muted hover:bg-panel hover:text-text-primary'}`}>
          <MessageCircle size={15} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{conversation.title ?? 'Conversación sin título'}</span>
          <span className="shrink-0 font-mono text-[10px] text-text-faint">{new Date(conversation.updated_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
        </button>
      ))}
    </nav>
  )
}
