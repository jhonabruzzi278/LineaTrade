import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Nav } from '../components/Nav'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { academyModules } from '../data/academy'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useAuth } from '../lib/auth'
import { resolvePostAuthPath } from '../lib/postAuthRedirect'
import { isStandaloneDisplay } from '../lib/standalone'
import { useToast } from '../lib/toast'

const APK_DOWNLOAD_URL = '/downloads/lineatrade.apk'

// Cifras de la Academia calculadas desde los datos reales, no escritas a mano.
const ACADEMY_MODULE_COUNT = academyModules.length
const ACADEMY_LESSON_COUNT = academyModules.reduce((total, module) => total + module.lessons.length, 0)

// Cifras de planes: espejo de las filas de `plan_entitlements` (migración
// 20260915130000_billing_entitlements.sql). Si cambian allí, cámbialas aquí.
const PLAN_FREE_AI_PER_DAY = 3
const PLAN_PRO_AI_PER_MONTH = 300
const PLAN_PRO_PRICE_CLP = '$4.900'
const PLAN_PRO_TRIAL_DAYS = 31

const faqItems = [
  ['¿LineaTrade entrega señales?', 'No. LineaTrade organiza tu proceso, registra tus decisiones y encuentra patrones en tu propia operativa.'],
  ['¿Necesito conectar mi bróker?', 'No. Puedes registrar las operaciones manualmente o importar datos desde una captura y confirmarlos antes de guardar.'],
  ['¿Mis operaciones son privadas?', 'Sí. Cada usuario accede únicamente a sus propios trades mediante políticas de seguridad en la base de datos.'],
  ['¿Qué incluye el plan gratuito?', 'Journal, dashboard, Academia y una cuota diaria de acciones con IA. Puedes comenzar sin tarjeta.'],
  ['¿Cómo funciona Pro?', `Pro amplía IA, noticias e insights. Cuesta ${PLAN_PRO_PRICE_CLP} CLP al mes e incluye ${PLAN_PRO_TRIAL_DAYS} días de prueba mediante Flow.`],
  ['¿Funciona como aplicación?', 'Sí. Puedes instalar la PWA en tu teléfono o computador y conservar una experiencia de pantalla completa.'],
]

const pillars = [
  ['Journal', 'Técnica, contexto y psicología de cada trade.'],
  ['Análisis', 'Win rate, profit factor y R calculados, no estimados.'],
  ['Coach IA', 'Solo cita datos que existen en tu journal.'],
  ['Academia', `${ACADEMY_LESSON_COUNT} lecciones conectadas con tu práctica.`],
]

const steps = [
  ['01', 'Prepara', 'Define tus objetivos, reglas y estrategias antes de exponer capital.'],
  ['02', 'Registra con una foto', 'Sube la captura de tu ticket: la IA completa los datos y tú los confirmas. Luego anotas contexto y emoción.'],
  ['03', 'Revisa', 'Compara resultado y proceso para saber qué repetir y qué corregir.'],
]

const dataPromises = ['Cada usuario ve solo sus propios trades', 'Sin conectar tu bróker', 'Exporta tu historial cuando quieras']

const freeFeatures = ['Journal y dashboard', 'Academia completa', `${PLAN_FREE_AI_PER_DAY} acciones de IA por día`]
const proFeatures = ['Todo lo de Free', `${PLAN_PRO_AI_PER_MONTH} acciones de IA al mes`, 'Briefs de mercado, insights y alertas avanzadas']

function EyebrowLabel({ children, className = '' }: { children: string; className?: string }) {
  return <p className={`label-mono text-[11px] ${className}`}>{children}</p>
}

function CheckItem({ children, tone = 'default' }: { children: string; tone?: 'default' | 'onBrand' }) {
  return (
    <li className={`flex items-start gap-2.5 py-1.5 font-body text-[14px] ${tone === 'onBrand' ? 'text-on-signal' : 'text-text-muted'}`}>
      <Check size={18} strokeWidth={2.6} className={`mt-0.5 shrink-0 ${tone === 'onBrand' ? 'text-spark' : 'text-steel'}`} aria-hidden="true" />
      {children}
    </li>
  )
}

function ProductPreview() {
  return (
    <div className="relative pb-10 lg:pb-9">
      <Card className="p-4 shadow-elevated lg:p-[18px]">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="font-body text-[14px] font-bold">Tu semana</span>
          <span className="label-mono text-[10px]">Vista ilustrativa</span>
        </div>
        <div className="grid grid-cols-[1.3fr_1fr] gap-2.5 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div className="rounded-[10px] border-2 border-ink bg-signal px-3 py-2.5 text-on-signal shadow-pop">
            <p className="label-mono text-[9px] text-on-signal/80">R acum. · 30D</p>
            <p className="mt-1.5 font-display text-[22px] lg:text-[26px]">+15.1R</p>
          </div>
          <div className="rounded-[10px] bg-panel-2 px-3 py-2.5">
            <p className="label-mono text-[9px]">Win rate</p>
            <p className="num mt-1.5 text-[20px] lg:text-[22px]">58%</p>
          </div>
          <div className="hidden rounded-[10px] bg-panel-2 px-3 py-2.5 lg:block">
            <p className="label-mono text-[9px]">R prom.</p>
            <p className="num mt-1.5 text-[22px] text-gain">+0.42</p>
          </div>
        </div>
        <ul className="mt-3">
          {[
            ['MNQ', 'short · 02 oct', '−1.00R', 'text-loss'],
            ['ES', 'long · 02 oct', '+0.60R', 'text-gain'],
            ['NQ', 'short · 01 oct', '+2.10R', 'text-gain'],
          ].map(([symbol, meta, result, tone], index) => (
            <li key={symbol} className={`flex items-center justify-between gap-3 border-t border-hairline px-0.5 py-2.5 text-[14px] ${index > 0 ? 'hidden lg:flex' : ''}`}>
              <b>{symbol}</b>
              <span className="num text-[12px] text-text-faint">{meta}</span>
              <span className={`num ${tone}`}>{result}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="absolute -bottom-0 right-0 w-60 -rotate-2 rounded-[10px] bg-spark px-3.5 py-3 text-on-spark shadow-card lg:-left-7 lg:right-auto lg:bottom-0 lg:w-[270px]">
        <p className="label-mono text-[10px] text-on-spark/70">Patrón ilustrativo · 12 trades</p>
        <p className="mt-1 font-body text-[13px] font-bold leading-snug lg:text-[14px]">Con FOMO tu win rate cae a 31%. Sin FOMO: 64%.</p>
      </div>
    </div>
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
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-10 lg:grid-cols-2 lg:gap-14 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="min-w-0">
            <EyebrowLabel className="text-steel">Journal · análisis · academia para traders</EyebrowLabel>
            <h1 className="mt-4 text-balance font-display text-[40px] leading-[1.04] sm:text-[52px] lg:mt-5 lg:text-[64px] lg:leading-[1.02]">
              Ayudamos a cometer{' '}
              <span className="rounded-md bg-spark px-1.5 text-on-spark [box-decoration-break:clone] lg:px-2.5">menos errores.</span>
            </h1>
            <p className="mt-5 max-w-[500px] text-pretty font-body text-base text-text-muted lg:mt-6 lg:text-lg">
              Registra tus trades, entiende tus patrones y construye tu proceso. No damos señales ni predicciones: te mostramos qué hiciste y qué se repite.
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap lg:mt-8 lg:gap-3">
              <Button asChild variant="cta" size="lg">
                <Link to="/registro">Crear cuenta gratis</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#como-funciona">Ver cómo funciona</a>
              </Button>
            </div>
            <p className="num mt-4 text-center text-[11px] text-text-faint sm:text-left lg:text-[12px]">Plan gratuito · Sin conectar tu bróker · Tus datos son privados</p>
          </div>
          <div className="min-w-0">
            <ProductPreview />
          </div>
        </section>

        <section className="border-y border-hairline bg-panel">
          <ul className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4 lg:px-10">
            {pillars.map(([title, body], index) => (
              <li key={title} className={`border-hairline px-5 py-4 lg:px-5 lg:py-6 ${index % 2 === 1 ? 'border-l' : ''} ${index >= 2 ? 'border-t lg:border-t-0' : ''} ${index > 0 ? 'lg:border-l' : 'lg:pl-0'}`}>
                <p className="font-display text-sm lg:text-base">{title}</p>
                <p className="mt-1 font-body text-[12px] leading-snug text-text-faint lg:text-[13px]">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14 lg:px-10 lg:py-28">
          <EyebrowLabel>Cómo funciona</EyebrowLabel>
          <h2 className="mt-3 max-w-[720px] text-balance font-display text-[28px] leading-[1.08] lg:text-[44px] lg:leading-[1.05]">Menos ruido. Más contexto antes de actuar.</h2>
          <ol className="mt-7 grid gap-3 lg:mt-12 lg:grid-cols-3 lg:gap-5">
            {steps.map(([number, title, body]) => (
              <li key={number}>
                <Card as="article" className="flex h-full gap-4 p-[18px] lg:block lg:p-6">
                  <span className="num text-[13px] text-spark">{number}</span>
                  <div>
                    <h3 className="font-display text-[17px] lg:mt-10 lg:text-[22px]">{title}</h3>
                    <p className="mt-1.5 text-pretty font-body text-[14px] leading-relaxed text-text-faint lg:mt-2.5 lg:text-[15px]">{body}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-14 lg:grid-cols-2 lg:gap-5 lg:px-10 lg:pb-28">
          <Card className="flex flex-col justify-between gap-6 p-[22px] lg:min-h-[300px] lg:p-8">
            <div>
              <EyebrowLabel>La IA no inventa</EyebrowLabel>
              <h3 className="mt-3 text-balance font-display text-[22px] leading-[1.12] lg:text-[30px] lg:leading-[1.1]">Cada afirmación cita un dato de tu journal.</h3>
            </div>
            <div className="rounded-[10px] border border-hairline bg-ink px-3.5 py-3 lg:px-4 lg:py-3.5">
              <p className="font-body text-[13px] leading-relaxed text-text-muted lg:text-[14px]">
                “Tus trades en <b className="text-text-primary">Apertura NY</b> tienen un R promedio de <span className="num text-gain">+0.71</span>.”
              </p>
              <p className="num mt-2 break-all text-[10px] text-steel lg:text-[11px]">fuente → stats_por_estrategia.apertura_ny.avg_r · ejemplo ilustrativo</p>
            </div>
          </Card>
          <Card tone="brand" className="flex flex-col justify-between gap-6 p-[22px] shadow-[5px_5px_0_var(--color-pop)] lg:min-h-[300px] lg:p-8 lg:shadow-[6px_6px_0_var(--color-pop)]">
            <div>
              <EyebrowLabel className="text-on-signal/80">Tus datos son tuyos</EyebrowLabel>
              <h3 className="mt-3 text-balance font-display text-[22px] leading-[1.12] lg:text-[30px] lg:leading-[1.1]">Sin rankings, sin compartir, sin señales.</h3>
            </div>
            <ul>
              {dataPromises.map((promise) => <CheckItem key={promise} tone="onBrand">{promise}</CheckItem>)}
            </ul>
          </Card>
        </section>

        <section id="academia" className="scroll-mt-24 border-y border-hairline bg-panel">
          <div className="mx-auto grid max-w-6xl items-center gap-7 px-5 py-14 lg:grid-cols-2 lg:gap-14 lg:px-10 lg:py-24">
            <div>
              <EyebrowLabel>Academia LineaTrade</EyebrowLabel>
              <h2 className="mt-3 text-balance font-display text-[28px] leading-[1.08] lg:text-[40px] lg:leading-[1.05]">Aprende una idea. Pruébala. Registra evidencia.</h2>
              <p className="mt-4 hidden max-w-[460px] text-pretty font-body text-base text-text-muted lg:block">
                {ACADEMY_MODULE_COUNT} módulos y {ACADEMY_LESSON_COUNT} lecciones que conectan fundamentos, estructura, liquidez y ejecución con prácticas dentro de tu journal.
              </p>
              <Button asChild variant="outline" size="lg" className="mt-5 w-full lg:mt-7 lg:w-auto">
                <Link to="/registro">Entrar al aula</Link>
              </Button>
            </div>
            <ol className="flex flex-col gap-2 lg:gap-2.5">
              {academyModules.map((module, index) => (
                <li key={module.id} className="flex items-center gap-3.5 rounded-xl border border-hairline bg-ink px-4 py-3.5 lg:gap-[18px] lg:px-5 lg:py-4">
                  <span className="num text-[12px] text-spark lg:text-[13px]">{String(index + 1).padStart(2, '0')}</span>
                  <span className="font-body text-[14px] font-semibold lg:text-[15px]">{module.title}</span>
                  <span className="num ml-auto hidden text-[12px] text-text-faint lg:inline">{module.lessons.length} lecciones</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="planes" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-14 lg:px-10 lg:py-28">
          <EyebrowLabel>Planes</EyebrowLabel>
          <h2 className="mt-3 text-balance font-display text-[28px] leading-[1.08] lg:text-[40px]">Empieza gratis. Amplía cuando lo necesites.</h2>
          <div className="mt-7 grid gap-4 lg:mt-10 lg:grid-cols-2 lg:gap-5">
            <Card className="p-[22px] lg:p-8">
              <p className="font-body text-[15px] font-bold">Free</p>
              <p className="mt-2 font-display text-[38px] lg:mt-3.5 lg:text-[48px]">$0</p>
              <ul className="mt-3 lg:mt-4">{freeFeatures.map((feature) => <CheckItem key={feature}>{feature}</CheckItem>)}</ul>
              <Button asChild variant="outline" size="lg" className="mt-5 w-full lg:mt-6 lg:w-auto">
                <Link to="/registro">Comenzar gratis</Link>
              </Button>
            </Card>
            <Card className="border-2 border-signal p-[22px] shadow-[5px_5px_0_var(--color-pop)] lg:p-8 lg:shadow-[6px_6px_0_var(--color-pop)]">
              <div className="flex items-center justify-between gap-3">
                <p className="font-body text-[15px] font-bold text-steel">Pro</p>
                <span className="num rounded bg-spark px-2 py-0.5 text-[10px] font-semibold text-on-spark lg:text-[11px]">{PLAN_PRO_TRIAL_DAYS} días de prueba</span>
              </div>
              <p className="mt-2 font-display text-[38px] lg:mt-3.5 lg:text-[48px]">
                {PLAN_PRO_PRICE_CLP} <span className="font-body text-sm font-medium tracking-normal text-text-faint lg:text-base">CLP / mes</span>
              </p>
              <ul className="mt-3 lg:mt-4">{proFeatures.map((feature) => <CheckItem key={feature}>{feature}</CheckItem>)}</ul>
              <Button asChild size="lg" className="mt-5 w-full lg:mt-6 lg:w-auto">
                <Link to="/registro">Probar Pro {PLAN_PRO_TRIAL_DAYS} días</Link>
              </Button>
            </Card>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-14 lg:grid-cols-[1fr_2fr] lg:gap-12 lg:px-10 lg:pb-28">
          <div>
            <EyebrowLabel>Preguntas frecuentes</EyebrowLabel>
            <h2 className="mt-3 text-balance font-display text-2xl leading-[1.1] lg:text-[34px]">Antes de tu primer registro.</h2>
          </div>
          <Accordion type="single" collapsible defaultValue="faq-0" className="min-w-0 border-t border-hairline">
            {faqItems.map(([question, answer], index) => (
              <AccordionItem key={question} value={`faq-${index}`}>
                <AccordionTrigger className="min-h-11 gap-3 text-left text-[15px] font-bold lg:text-base">{question}</AccordionTrigger>
                <AccordionContent><p className="text-[14px] leading-relaxed text-text-faint lg:text-[15px]">{answer}</p></AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section id="descargar" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-12 lg:px-10 lg:pb-24">
          <div className="grid items-center gap-6 rounded-[14px] bg-spark px-[22px] py-7 text-on-spark lg:grid-cols-2 lg:gap-8 lg:px-12 lg:py-14">
            <h2 className="text-balance font-display text-[26px] leading-[1.08] lg:text-[40px] lg:leading-[1.05]">Tu próxima mejora empieza registrando una decisión.</h2>
            <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:justify-end lg:gap-3">
              <Link to="/registro" className="inline-flex min-h-[50px] items-center justify-center rounded-[10px] bg-on-spark px-5 font-body text-[15px] font-bold text-spark transition-opacity hover:opacity-90">
                Crear cuenta gratis
              </Link>
              <button type="button" onClick={() => void installApp()} className="inline-flex min-h-[50px] items-center justify-center rounded-[10px] border-2 border-on-spark px-5 font-body text-[15px] font-bold text-on-spark transition-colors hover:bg-on-spark/10">
                Instalar app
              </button>
              <a href={APK_DOWNLOAD_URL} download className="inline-flex min-h-[50px] items-center justify-center rounded-[10px] border-2 border-on-spark px-5 font-body text-[15px] font-bold text-on-spark transition-colors hover:bg-on-spark/10">
                Descargar APK (Android)
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 pb-8 pt-6 font-body text-[12px] text-text-faint lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-10 lg:py-7 lg:text-[13px]">
          <span className="lg:order-2">Herramienta educativa. No constituye asesoría financiera.</span>
          <div className="flex items-center justify-between gap-6 lg:order-1 lg:contents">
            <span className="lg:order-1">© 2026 LineaTrade</span>
            <Link to="/privacidad" className="min-h-6 hover:text-text-primary lg:order-3">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
