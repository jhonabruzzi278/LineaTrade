import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { TraceLine } from '../components/TraceLine'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useAuth } from '../lib/auth'
import { resolvePostAuthPath } from '../lib/postAuthRedirect'
import { isStandaloneDisplay } from '../lib/standalone'
import { useToast } from '../lib/toast'

// Actualizar esta ruta cuando el APK real esté generado y subido (ver guía de
// conversión PWA → APK). Hasta entonces el botón de descarga apunta a un
// archivo que todavía no existe en public/downloads/.
const APK_DOWNLOAD_URL = '/downloads/lineatrade.apk'

const faqItems = [
  {
    id: 'senales',
    question: '¿LineaTrade me da señales o me dice qué operar?',
    answer:
      'No. LineaTrade no es una herramienta de señales ni de predicción de mercado — no te dice qué comprar ni cuándo. Registra lo que vos ya operaste (técnica, contexto, psicología) y te muestra los patrones de comportamiento que se repiten. Te ayudamos a cometer menos errores, no a "ganar más".',
  },
  {
    id: 'metricas',
    question: '¿De dónde salen el win rate, el profit factor y el R promedio?',
    answer:
      'Todos salen de cálculos directos sobre tus propios trades cerrados, nunca de una estimación ni de un modelo de IA. Si la IA analiza un trade, solo puede citar cifras que ya existen en tu journal — no inventa ni redondea para sonar convincente.',
  },
  {
    id: 'broker',
    question: '¿Tengo que conectar la cuenta de mi bróker?',
    answer:
      'No. Registrás cada operación a mano o sacándole una foto al ticket de tu bróker — la IA lee la imagen y precarga los datos, pero vos revisás y confirmás antes de guardar. LineaTrade nunca pide acceso ni credenciales de tu cuenta de trading.',
  },
  {
    id: 'privacidad',
    question: '¿Quién puede ver mis trades?',
    answer:
      'Solo vos. No hay rankings, no hay perfiles públicos, no hay nada compartido entre usuarios. El único acceso externo posible es soporte técnico del equipo, y ese acceso queda siempre registrado — nunca es silencioso.',
  },
  {
    id: 'ia-gratis',
    question: '¿Es gratis analizar mis trades con IA?',
    answer:
      'Sí, con un límite diario en el modelo compartido. Si querés análisis ilimitados podés conectar tu propia API key desde Configuración — el costo de esos análisis corre por tu cuenta, sin límite de LineaTrade.',
  },
]

const entries = [
  {
    n: '001',
    title: 'Registra, no interpretes',
    body: 'Cada operación queda documentada: precio, contexto, emoción, disciplina. Sin editorializar en el momento, cuando el juicio está más comprometido.',
  },
  {
    n: '002',
    title: 'El sistema calcula, nunca opina',
    body: 'Win rate, expectancy, drawdown: cifras exactas, siempre trazables a tus propios datos. Ningún número sale de una suposición.',
  },
  {
    n: '003',
    title: 'La IA interpreta, con evidencia',
    body: 'Cada observación cita el dato del journal que la respalda. Si no hay evidencia suficiente, te lo dice — no inventa un patrón para sonar útil.',
  },
  {
    n: '004',
    title: 'Tus datos son tuyos',
    body: 'Sin rankings, sin red social, sin nada compartido entre usuarios. Tu bitácora es privada por diseño, no por promesa.',
  },
]

export default function Landing() {
  const { user, loading } = useAuth()
  const { canInstall, promptInstall } = useInstallPrompt()
  const { showToast } = useToast()
  const [authedPath, setAuthedPath] = useState<string | null>(null)

  // Un usuario que ya tiene sesión activa (p. ej. volviendo del enlace de
  // confirmación de email — Supabase detecta el token en la URL y abre sesión
  // antes de que este componente renderice) nunca debería ver la landing de
  // marketing con un botón "Ingresar": antes obligaba a tocar Ingresar y
  // volver a escribir usuario/contraseña con una sesión ya válida. Se manda
  // directo a la app, igual que ProtectedRoute hace lo inverso.
  useEffect(() => {
    if (!user) {
      setAuthedPath(null)
      return
    }
    let cancelled = false
    resolvePostAuthPath(user.id)
      .then((path) => {
        if (!cancelled) setAuthedPath(path)
      })
      .catch(() => {
        if (!cancelled) setAuthedPath('/dashboard')
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading || (user && !authedPath)) {
    return <div className="min-h-screen bg-ink" />
  }
  if (authedPath) {
    return <Navigate to={authedPath} replace />
  }
  // La app instalada (PWA agregada a inicio / TWA del APK) tampoco debería
  // mostrar nunca la landing de marketing: si no hay sesión, va directo a
  // /login (que linkea a /registro para altas nuevas). vite.config.ts ya evita
  // esto en el arranque normal desde el ícono (start_url: /dashboard); esto
  // cubre cualquier otro link a "/" navegado sin sesión — el caso real es el
  // enlace de confirmación de email cuando por algún motivo no trae sesión.
  if (isStandaloneDisplay()) {
    return <Navigate to="/login" replace />
  }

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall()
      return
    }
    showToast(
      'Tu navegador no ofrece instalación directa. En Android: menú ⋮ → Agregar a pantalla de inicio. En iPhone: Compartir → Agregar a inicio.',
      'info',
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <Nav />

      <main className="max-w-5xl mx-auto px-6">
        <section className="relative pt-20 pb-16 overflow-hidden">
          {/* Ambiente: dos auras difusas detrás del hero, nunca afectan el layout. */}
          <div className="hero-aura -top-24 -left-16 w-[520px] h-[520px]" aria-hidden="true" />
          <div className="steel-aura top-40 -right-24 w-[440px] h-[440px]" aria-hidden="true" />

          <div className="relative">
            <p className="reveal-up font-mono text-[13px] text-signal tracking-wide mb-5">
              registro de comportamiento — no de mercado
            </p>
            <h1
              className="reveal-up font-display text-[44px] md:text-[56px] leading-[1.08] tracking-tight text-text-primary max-w-3xl"
              style={{ animationDelay: '0.08s' }}
            >
              No sabes qué error repites.
              <br />
              Tus trades sí.
            </h1>
            <p
              className="reveal-up font-body text-[17px] text-text-muted max-w-xl mt-6 leading-relaxed"
              style={{ animationDelay: '0.16s' }}
            >
              LineaTrade registra cada operación — técnica, contexto y psicología — y te
              muestra el patrón que no puedes ver por tu cuenta. Sin señales. Sin predicciones.
              Sin promesas de rentabilidad.
            </p>
            <div
              className="reveal-up flex items-center gap-4 mt-9"
              style={{ animationDelay: '0.24s' }}
            >
              <Link
                to="/registro"
                className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5"
              >
                Crear cuenta gratis
              </Link>
              <a
                href="#bitacora"
                className="font-body text-[14px] px-5 py-3 rounded-sm border border-hairline text-text-primary transition-colors hover:border-text-faint hover:bg-panel-2/50"
              >
                Ver cómo funciona
              </a>
              <a
                href="#descargar"
                className="font-body text-[14px] text-text-muted transition-colors hover:text-text-primary"
              >
                Descargar app ↓
              </a>
            </div>

            <div
              className="reveal-up relative mt-16 overflow-hidden rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel p-8 shadow-elevated"
              style={{ animationDelay: '0.32s' }}
            >
              <div className="grain-overlay absolute inset-0" aria-hidden="true" />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <span className="font-mono text-[11px] text-text-faint tracking-wide">
                    traza de comportamiento
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_8px_rgba(227,169,74,0.8)]" />
                    40 operaciones
                  </span>
                </div>
                <TraceLine />
                <div className="flex justify-between mt-3 font-mono text-[12px] text-text-faint">
                  <span>trade 1</span>
                  <span>trade 40</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="bitacora" className="py-20 border-t border-hairline scroll-mt-20">
          <p className="font-mono text-[13px] text-steel tracking-wide mb-2">bitácora</p>
          <h2 className="font-display text-[28px] text-text-primary mb-12">
            Cuatro principios, sin excepciones.
          </h2>
          <div className="space-y-0">
            {entries.map((entry, i) => (
              <div
                key={entry.n}
                className={`group grid grid-cols-[64px_1fr] gap-6 py-7 px-4 -mx-4 rounded-sm transition-colors hover:bg-panel-2/40 ${
                  i !== 0 ? 'border-t border-hairline' : ''
                }`}
              >
                <span className="font-mono text-[13px] text-text-faint pt-0.5 transition-colors group-hover:text-signal">
                  {entry.n}
                </span>
                <div className="transition-transform duration-200 group-hover:translate-x-1">
                  <h3 className="font-display text-[18px] text-text-primary mb-2">{entry.title}</h3>
                  <p className="font-body text-[15px] text-text-muted leading-relaxed max-w-xl">
                    {entry.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-hairline">
          <p className="font-mono text-[13px] text-steel tracking-wide mb-2">test de perfil</p>
          <h2 className="font-display text-[28px] text-text-primary mb-4 max-w-xl">
            Convierte la IA en tu trader.
          </h2>
          <p className="font-body text-[15px] text-text-muted leading-relaxed max-w-xl mb-8">
            19 preguntas sobre tu tiempo, tu dinero y tu forma de ser. El motor calcula un plan de
            trading a tu medida — riesgo por operación, ratio riesgo:beneficio, win rate mínimo —
            y te da un paquete listo para que tu IA (ChatGPT, Claude) diseñe y respalde la
            estrategia. Herramienta educativa, sin asesoramiento financiero.
          </p>
          <Link
            to="/ia-trader"
            className="font-body text-[14px] px-5 py-3 rounded-sm border border-hairline text-text-primary transition-colors hover:border-signal hover:bg-panel-2/50"
          >
            Empezar el test — 2 minutos
          </Link>
        </section>

        <section id="descargar" className="py-20 border-t border-hairline scroll-mt-20">
          <div className="grid gap-10 md:grid-cols-5 md:gap-12 items-start">
            <div className="md:col-span-2">
              <p className="font-mono text-[13px] text-steel tracking-wide mb-2">app instalable</p>
              <h2 className="font-display text-[28px] text-text-primary mb-4">
                Llevá tu bitácora en el bolsillo.
              </h2>
              <p className="font-body text-[15px] text-text-muted leading-relaxed">
                LineaTrade es una PWA instalable: funciona como una app nativa — ícono en tu
                pantalla de inicio, pantalla completa, sin barra del navegador — sin pasar por
                ninguna tienda de aplicaciones.
              </p>
            </div>

            <div className="md:col-span-3">
              <div className="relative overflow-hidden rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel p-8 shadow-card">
                <div className="grain-overlay absolute inset-0" aria-hidden="true" />
                <div className="relative flex flex-col gap-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5"
                    >
                      Instalar app
                    </button>
                    <a
                      href={APK_DOWNLOAD_URL}
                      download
                      className="font-body text-[14px] px-5 py-3 rounded-sm border border-hairline text-text-primary transition-colors hover:border-text-faint hover:bg-panel-2/50"
                    >
                      Descargar APK (Android)
                    </a>
                  </div>
                  <p className="font-mono text-[12px] text-text-faint leading-relaxed">
                    En iPhone no hay instalación con un click: abrí lineartrade.vercel.app en
                    Safari → tocá Compartir → Agregar a inicio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-hairline">
          <div className="grid gap-10 md:grid-cols-5 md:gap-12">
            <div className="md:col-span-2">
              <p className="font-mono text-[13px] text-steel tracking-wide mb-2">preguntas frecuentes</p>
              <h2 className="font-display text-[28px] text-text-primary mb-4">
                Antes de registrar tu primer trade.
              </h2>
              <p className="font-body text-[15px] text-text-muted leading-relaxed hidden md:block">
                Para más detalle sobre cómo tratamos tus datos, ver la{' '}
                <Link to="/privacidad" className="text-signal hover:text-signal-dim transition-colors">
                  política de privacidad
                </Link>
                .
              </p>
            </div>

            <div className="md:col-span-3">
              <Accordion type="single" collapsible>
                {faqItems.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="text-[15px]">{item.question}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-[14px]">{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <p className="font-body text-[15px] text-text-muted leading-relaxed md:hidden">
              Para más detalle sobre cómo tratamos tus datos, ver la{' '}
              <Link to="/privacidad" className="text-signal hover:text-signal-dim transition-colors">
                política de privacidad
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="py-20 border-t border-hairline">
          <div className="relative overflow-hidden rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel px-8 py-14 text-center shadow-card">
            <div className="hero-aura left-1/2 -translate-x-1/2 -top-20 w-[420px] h-[300px]" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display text-[28px] text-text-primary mb-4">
                Tu próximo trade puede ser el primero registrado.
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                <Link
                  to="/registro"
                  className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5"
                >
                  Crear cuenta gratis
                </Link>
                <a
                  href="#descargar"
                  className="font-body text-[14px] text-text-muted transition-colors hover:text-text-primary"
                >
                  o instalá la app →
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between gap-4">
          <span className="font-mono text-[12px] text-text-faint">lineatrade</span>
          <span className="font-mono text-[12px] text-text-faint hidden sm:inline">
            no da señales. no predice el mercado.
          </span>
          <Link
            to="/privacidad"
            className="font-mono text-[12px] text-text-faint hover:text-text-muted transition-colors"
          >
            privacidad
          </Link>
        </div>
      </footer>
    </div>
  )
}
