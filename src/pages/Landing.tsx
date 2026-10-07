import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useAuth } from '../lib/auth'
import { resolvePostAuthPath } from '../lib/postAuthRedirect'
import { isStandaloneDisplay } from '../lib/standalone'
import { useToast } from '../lib/toast'

const APK_DOWNLOAD_URL = '/downloads/lineatrade.apk'

const faqItems = [
  ['¿LineaTrade entrega señales?', 'No. LineaTrade organiza tu proceso, registra tus decisiones y encuentra patrones en tu propia operativa.'],
  ['¿Necesito conectar mi bróker?', 'No. Puedes registrar las operaciones manualmente o importar datos desde una captura y confirmarlos antes de guardar.'],
  ['¿Mis operaciones son privadas?', 'Sí. Cada usuario accede únicamente a sus propios trades mediante políticas de seguridad en la base de datos.'],
  ['¿Qué incluye el plan gratuito?', 'Journal, dashboard, Academia y una cuota diaria de acciones con IA. Puedes comenzar sin tarjeta.'],
  ['¿Cómo funciona Pro?', 'Pro amplía IA, noticias e insights. Cuesta $4.900 CLP al mes e incluye 31 días de prueba mediante Flow.'],
  ['¿Funciona como aplicación?', 'Sí. Puedes instalar la PWA en tu teléfono o computador y conservar una experiencia de pantalla completa.'],
]

const steps = [
  ['01', 'Prepara', 'Define estrategia, riesgo y checklist antes de exponer capital.'],
  ['02', 'Ejecuta y registra', 'Documenta contexto, entrada, gestión, emoción y evidencia visual.'],
  ['03', 'Revisa', 'Compara resultado y proceso para saber qué repetir y qué corregir.'],
]

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-panel shadow-elevated">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold text-text-primary">Tu mesa de trabajo</span>
        <span className="rounded-full border border-hairline px-3 py-1 font-mono text-[10px] text-text-muted">Vista ilustrativa</span>
      </div>
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="min-h-64 rounded-xl bg-ink p-5">
          <div className="flex items-end justify-between">
            <div><p className="text-xs text-text-faint">Disciplina semanal</p><p className="mt-1 text-3xl font-semibold tabular-nums text-text-primary">8.4</p></div>
            <p className="font-mono text-xs text-gain">+1.2 esta semana</p>
          </div>
          <div className="mt-10 flex h-28 items-end gap-2" aria-label="Evolución de disciplina de siete sesiones">
            {[42, 56, 48, 68, 62, 78, 88].map((height, index) => <span key={height + index} className="flex-1 rounded-t bg-steel/20" style={{ height: `${height}%`, backgroundColor: index === 6 ? 'var(--color-signal)' : undefined }} />)}
          </div>
          <div className="mt-3 flex justify-between font-mono text-xs text-text-faint"><span>Lun</span><span>Hoy</span></div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-text-faint">Siguiente decisión</p>
          <div className="rounded-xl bg-panel-2 p-4"><p className="text-sm font-semibold text-text-primary">Completar checklist</p><p className="mt-2 text-sm text-text-muted">2 condiciones pendientes antes de operar.</p></div>
          <div className="rounded-xl bg-panel-2 p-4"><p className="text-sm font-semibold text-text-primary">Riesgo de hoy</p><p className="mt-2 font-mono text-xl text-signal">0.50%</p></div>
          <div className="rounded-xl bg-panel-2 p-4"><p className="text-sm font-semibold text-text-primary">Noticia clave</p><p className="mt-2 text-sm text-text-muted">IPC de EE. UU. · 09:30</p></div>
        </div>
      </div>
    </div>
  )
}

function WordReveal() {
  const rootRef = useRef<HTMLParagraphElement>(null)
  const [visibleWords, setVisibleWords] = useState<Set<number>>(() => new Set())
  const words = [
    ...'Una buena sesión empieza con'.split(' ').map((word) => ({ word, highlight: false })),
    ...'una decisión que puedes explicar.'.split(' ').map((word) => ({ word, highlight: true })),
  ]

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = Number((entry.target as HTMLElement).dataset.wordIndex)
        setVisibleWords((current) => new Set(current).add(index))
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.5, rootMargin: '0px 0px -12% 0px' })
    root.querySelectorAll('[data-word-index]').forEach((word) => observer.observe(word))
    return () => observer.disconnect()
  }, [])

  return (
    <p ref={rootRef} className="max-w-3xl text-balance font-display text-3xl leading-tight tracking-tight sm:text-4xl" aria-label="Una buena sesión empieza con una decisión que puedes explicar.">
      {words.map(({ word, highlight }, index) => (
        <span key={`${word}-${index}`} data-word-index={index} className={`inline-block transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${visibleWords.has(index) ? highlight ? 'text-steel' : 'text-text-primary' : highlight ? 'text-steel/30' : 'text-text-faint/35'}`}>
          {word}{index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  )
}

export default function Landing() {
  const { user, loading } = useAuth()
  const { canInstall, promptInstall } = useInstallPrompt()
  const { showToast } = useToast()
  const [authedPath, setAuthedPath] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setAuthedPath(null); return }
    let cancelled = false
    resolvePostAuthPath(user.id).then((path) => { if (!cancelled) setAuthedPath(path) }).catch(() => { if (!cancelled) setAuthedPath('/dashboard') })
    return () => { cancelled = true }
  }, [user])

  if (loading || (user && !authedPath)) return <div className="min-h-screen bg-ink" />
  if (authedPath) return <Navigate to={authedPath} replace />
  if (isStandaloneDisplay()) return <Navigate to="/login" replace />

  async function installApp() {
    if (canInstall) await promptInstall()
    else showToast('Abre el menú de tu navegador y selecciona Agregar a pantalla de inicio.', 'info')
  }

  return (
    <div className="landing-page min-h-screen bg-ink text-text-primary">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-panel focus:px-4 focus:py-3">Saltar al contenido</a>
      <Nav />
      <main id="contenido">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-14 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:py-24">
          <div className="min-w-0">
            <p className="mb-6 text-sm font-semibold text-steel">Journal, proceso y aprendizaje para traders</p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-text-primary sm:text-6xl">Tu operativa.<br />Con perspectiva.</h1>
            <p className="mt-6 max-w-lg text-pretty text-base text-text-muted sm:text-lg">Registra tus trades, entiende tus patrones y construye tu proceso. Tu journal, análisis y formación en una sola mesa de trabajo.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/registro" className="rounded-full bg-signal px-5 py-3 text-base font-semibold text-white transition-[background-color,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-signal-dim active:scale-[0.98]">Crear cuenta gratis</Link>
              <a href="#como-funciona" className="rounded-full bg-text-primary px-5 py-3 text-base font-semibold text-ink transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-90 active:scale-[0.98]">Ver cómo funciona</a>
            </div>
            <p className="mt-4 text-sm text-text-faint">Plan gratuito · Sin conectar tu bróker · Tus datos son privados</p>
          </div>
          <div className="min-w-0"><ProductPreview /><p className="mt-3 text-center text-xs text-text-faint">Ejemplo de sesión · Los datos mostrados son ilustrativos.</p></div>
        </section>

        <section className="border-y border-hairline bg-panel">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 py-8 text-center text-sm font-semibold text-text-muted sm:grid-cols-4"><span>Journal</span><span>Coach IA</span><span>Academia</span><span>IA con evidencia</span></div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-4 pt-16"><WordReveal /></section>

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
          <div className="mb-12 max-w-2xl"><p className="text-sm font-semibold text-steel">Tu mesa de trabajo</p><h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight">Menos ruido. Más contexto antes de actuar.</h2></div>
          <div className="grid gap-4 md:grid-cols-3">{steps.map(([number, title, body]) => <article key={number} className="rounded-2xl border border-hairline bg-panel p-6"><span className="font-mono text-xs text-signal">{number}</span><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 text-pretty text-sm text-text-muted">{body}</p></article>)}</div>
        </section>

        <section id="academia" className="scroll-mt-24 bg-panel py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
            <div><p className="text-sm font-semibold text-steel">Academia LineaTrade</p><h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight">Aprende una idea. Pruébala. Registra evidencia.</h2><p className="mt-5 text-pretty text-base text-text-muted">Cinco módulos y 27 lecciones conectan fundamentos, estructura, liquidez y ejecución con prácticas dentro de tu journal.</p><Link to="/registro" className="mt-8 inline-flex rounded-full border border-hairline bg-ink px-5 py-3 text-base font-semibold transition-[background-color,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-panel-2 active:scale-[0.98]">Entrar al aula</Link></div>
            <div className="space-y-3">{['Fundamentos del proceso', 'Prepara tu mesa de trabajo', 'Estructura del mercado', 'Liquidez y zonas', 'Ejecución y revisión'].map((title, index) => <div key={title} className="flex items-center gap-5 rounded-xl bg-ink px-5 py-4"><span className="font-mono text-xs text-signal">0{index + 1}</span><span className="text-sm font-semibold">{title}</span></div>)}</div>
          </div>
        </section>

        <section id="planes" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
          <div className="mb-8"><p className="text-sm font-semibold text-steel">A tu ritmo</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Empieza gratis. Amplía cuando lo necesites.</h2></div>
          <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-hairline bg-panel p-8"><p className="text-sm text-text-faint">Free</p><p className="mt-4 text-4xl font-semibold">$0</p><p className="mt-3 text-sm text-text-muted">Journal, dashboard, Academia y cuota diaria de IA.</p><Link to="/registro" className="mt-8 inline-flex rounded-full bg-text-primary px-5 py-3 text-base font-semibold text-ink">Comenzar gratis</Link></div><div className="rounded-2xl border border-signal/40 bg-panel p-8"><p className="text-sm text-signal">Pro · 31 días de prueba</p><p className="mt-4 text-4xl font-semibold tabular-nums">$4.900 <span className="text-base font-medium text-text-muted">CLP al mes</span></p><p className="mt-3 text-sm text-text-muted">Más IA, briefs, insights y alertas avanzadas.</p><Link to="/registro" className="mt-8 inline-flex rounded-full bg-signal px-5 py-3 text-base font-semibold text-white">Probar Pro</Link></div></div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.7fr_1.3fr]"><div><p className="text-sm font-semibold text-steel">Preguntas frecuentes</p><h2 className="mt-3 text-3xl font-semibold">Antes de tu primer registro.</h2></div><Accordion type="single" collapsible>{faqItems.map(([question, answer], index) => <AccordionItem key={question} value={`faq-${index}`}><AccordionTrigger className="text-base">{question}</AccordionTrigger><AccordionContent><p className="text-sm text-text-muted">{answer}</p></AccordionContent></AccordionItem>)}</Accordion></section>

        <section className="mx-auto max-w-6xl px-6 py-20"><div className="rounded-2xl bg-text-primary px-8 py-16 text-center text-ink"><h2 className="mx-auto max-w-[680px] text-balance text-4xl font-semibold">Tu próxima mejora empieza registrando una decisión.</h2><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/registro" className="rounded-full bg-signal px-5 py-3 text-base font-semibold text-white">Crear cuenta gratis</Link><button type="button" onClick={() => void installApp()} className="rounded-full border border-ink/20 px-5 py-3 text-base font-semibold">Instalar aplicación</button><a href={APK_DOWNLOAD_URL} download className="sr-only">Descargar APK</a></div></div></section>
      </main>
      <footer className="border-t border-hairline py-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-text-faint"><span>© 2026 LineaTrade</span><span>Herramienta educativa. No constituye asesoría financiera.</span><Link to="/privacidad" className="hover:text-text-primary">Privacidad</Link></div></footer>
    </div>
  )
}
