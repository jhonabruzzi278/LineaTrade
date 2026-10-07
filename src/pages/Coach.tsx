import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Menu, Trash2, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
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
import { titleFromFirstMessage } from '../lib/coachView'
import { useAiUsageToday } from '../hooks/useAiUsageToday'
import { useEntitlements } from '../hooks/useEntitlements'
import { ChatMessage, ThinkingIndicator } from '../components/coach/ChatMessage'
import { CoachComposer } from '../components/coach/CoachComposer'
import { CoachWelcome } from '../components/coach/CoachWelcome'
import { ConversationList } from '../components/coach/ConversationList'

const FALLBACK_DAILY_LIMIT = 3
const ICON_BUTTON = 'inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-panel hover:text-text-primary'

// Pantalla de foco a pantalla completa (fuera del marco con barra lateral, ver App.tsx):
// un chat necesita el borde inferior para el campo de texto. Por eso trae su propio
// historial (barra lateral en escritorio, panel deslizable en móvil) y «Volver a la app».
// La conversación se crea al enviar la primera pregunta, no antes: no quedan vacías.
export default function Coach() {
  const { user } = useAuth()
  const { planKey, byFeature } = useEntitlements(user?.id)
  const baseUsed = useAiUsageToday(user?.id)
  const [replies, setReplies] = useState(0)
  const [conversations, setConversations] = useState<CoachConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const closeDrawerRef = useRef<HTMLButtonElement>(null)
  // Conversación recién creada localmente: sus mensajes ya están en memoria, no hay que releerlos.
  const justCreatedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listConversations(user.id)
      .then((data) => {
        if (!cancelled) setConversations(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    if (justCreatedRef.current === activeId) {
      justCreatedRef.current = null
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
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, sending])

  // Panel móvil: Escape lo cierra y el foco entra al botón de cerrar.
  useEffect(() => {
    if (!drawerOpen) return
    closeDrawerRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  const dailyLimit = byFeature.get('ai_actions')?.hardLimit === undefined ? FALLBACK_DAILY_LIMIT : (byFeature.get('ai_actions')?.hardLimit ?? null)
  const used = baseUsed == null ? null : baseUsed + replies
  const quotaExhausted = dailyLimit != null && used != null && used >= dailyLimit
  const usageLabel = dailyLimit != null && used != null ? `${used}/${dailyLimit} análisis hoy` : null
  const planLabel = `Plan ${planKey.charAt(0).toUpperCase()}${planKey.slice(1)}`

  function startNewConversation() {
    setActiveId(null)
    setMessages([])
    setDraft('')
    setError(null)
    setDrawerOpen(false)
  }

  function selectConversation(id: string) {
    setActiveId(id)
    setError(null)
    setDrawerOpen(false)
  }

  async function handleDeleteActive() {
    if (!activeId) return
    if (!window.confirm('¿Eliminar esta conversación? No se puede deshacer.')) return
    try {
      await deleteConversation(activeId)
      setConversations((prev) => prev.filter((c) => c.id !== activeId))
      startNewConversation()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function send(rawContent: string) {
    const content = rawContent.trim()
    if (!content || !user || sending || quotaExhausted) return
    setDraft('')
    setSending(true)
    setError(null)
    let userMessageSaved = false
    try {
      let conversationId = activeId
      if (!conversationId) {
        const created = await createConversation(user.id, titleFromFirstMessage(content))
        justCreatedRef.current = created.id
        setConversations((prev) => [created, ...prev])
        setActiveId(created.id)
        conversationId = created.id
      }
      const userMessage = await sendUserMessage(conversationId, user.id, content)
      userMessageSaved = true
      setMessages((prev) => [...prev, userMessage])
      const result = await requestCoachReply(conversationId)
      if (!result.ok) {
        setError(result.message)
      } else {
        setMessages((prev) => [...prev, result.message])
        setReplies((n) => n + 1)
        const now = new Date().toISOString()
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, updated_at: now } : c)).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
      }
    } catch (err) {
      setError(getErrorMessage(err))
      // Si ni siquiera se guardó la pregunta, se devuelve al campo para no perder el texto.
      if (!userMessageSaved) setDraft(content)
    } finally {
      setSending(false)
    }
  }

  const isWelcome = !activeId && messages.length === 0
  const sidebar = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      loading={loadingConversations}
      onSelect={selectConversation}
      onNew={startNewConversation}
      usageLabel={usageLabel}
      planLabel={planLabel}
    />
  )

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-ink">
      <aside aria-label="Historial de conversaciones" className="hidden w-[280px] shrink-0 flex-col border-r border-hairline bg-panel px-3 py-3.5 lg:flex">
        <Link to="/dashboard" aria-label="LineaTrade, volver a la app" className="font-display px-1.5 pb-3.5 text-[16px] text-text-primary">
          LineaTrade
        </Link>
        <div className="min-h-0 flex-1">{sidebar}</div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Cerrar historial" tabIndex={-1} onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-ink/70" />
          <div role="dialog" aria-modal="true" aria-label="Historial de conversaciones" className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col border-r border-hairline bg-panel px-3 pb-[18px] pt-3">
            <div className="flex items-center justify-between pb-3 pl-1">
              <span className="font-display text-[16px] text-text-primary">Conversaciones</span>
              <button ref={closeDrawerRef} type="button" onClick={() => setDrawerOpen(false)} aria-label="Cerrar historial" className={ICON_BUTTON}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1">{sidebar}</div>
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-1 lg:px-7">
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Abrir historial" className={`${ICON_BUTTON} lg:hidden`}>
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2 font-body text-[15px] font-bold text-text-primary">
            Coach IA
            <span className="num hidden rounded bg-panel-2 px-[7px] py-0.5 text-[10px] font-medium text-text-faint lg:inline">solo con tus datos</span>
          </div>
          <div className="flex items-center">
            {activeId && (
              <button type="button" onClick={() => void handleDeleteActive()} aria-label="Eliminar conversación" className={ICON_BUTTON}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            )}
            <Link to="/dashboard" aria-label="Volver a la app" className={`${ICON_BUTTON} lg:hidden`}>
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isWelcome ? (
            <div className="flex min-h-full items-center justify-center px-5 py-8">
              <CoachWelcome onPick={(question) => void send(question)} disabled={sending || quotaExhausted} />
            </div>
          ) : (
            <div className="mx-auto flex max-w-[760px] flex-col gap-7 px-4 pb-5 pt-6 lg:gap-[30px] lg:px-6 lg:pt-9">
              {loadingMessages && <p className="font-body text-[14px] text-text-faint">Cargando conversación…</p>}
              {!loadingMessages && messages.map((message) => <ChatMessage key={message.id} message={message} />)}
              {sending && <ThinkingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <footer className="shrink-0 px-3 pb-[18px] pt-2 lg:px-6">
          <div className="mx-auto max-w-[760px]">
            {error && (
              <p role="alert" className="mb-2 px-1 font-body text-[13px] text-loss">
                {error}
              </p>
            )}
            <CoachComposer
              value={draft}
              onChange={setDraft}
              onSend={() => void send(draft)}
              disabled={sending || quotaExhausted}
              blockedReason={quotaExhausted ? 'Alcanzaste tu límite gratuito de hoy' : undefined}
            />
            <p className="mt-2.5 text-center font-body text-[11px] text-text-faint lg:text-[12px]">
              <span className="num lg:hidden">{usageLabel ? `${usageLabel} · ` : ''}</span>
              El coach responde solo con datos de tu journal. No da señales ni asesoría financiera.
              {quotaExhausted && (
                <>
                  {' '}
                  <Link to="/configuracion/ia" className="font-semibold text-steel underline">
                    Usar mi propia key
                  </Link>
                </>
              )}
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
