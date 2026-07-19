import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { TraceLine } from '../components/TraceLine'

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

        <section className="py-20 border-t border-hairline">
          <div className="relative overflow-hidden rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel px-8 py-14 text-center shadow-card">
            <div className="hero-aura left-1/2 -translate-x-1/2 -top-20 w-[420px] h-[300px]" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display text-[28px] text-text-primary mb-4">
                Tu próximo trade puede ser el primero registrado.
              </h2>
              <Link
                to="/registro"
                className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5 mt-4"
              >
                Crear cuenta gratis
              </Link>
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
