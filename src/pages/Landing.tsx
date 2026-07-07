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
        <section className="pt-20 pb-16">
          <p className="font-mono text-[13px] text-signal tracking-wide mb-5">
            registro de comportamiento — no de mercado
          </p>
          <h1 className="font-display text-[44px] md:text-[56px] leading-[1.08] tracking-tight text-text-primary max-w-3xl">
            No sabes qué error repites.
            <br />
            Tus trades sí.
          </h1>
          <p className="font-body text-[17px] text-text-muted max-w-xl mt-6 leading-relaxed">
            LineaTrade registra cada operación — técnica, contexto y psicología — y te
            muestra el patrón que no puedes ver por tu cuenta. Sin señales. Sin predicciones.
            Sin promesas de rentabilidad.
          </p>
          <div className="flex items-center gap-4 mt-9">
            <Link
              to="/registro"
              className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors"
            >
              Crear cuenta gratis
            </Link>
            <a
              href="#bitacora"
              className="font-body text-[14px] px-5 py-3 rounded-sm border border-hairline text-text-primary hover:border-text-faint transition-colors"
            >
              Ver cómo funciona
            </a>
          </div>

          <div className="mt-16 bg-panel border border-hairline rounded-sm p-8">
            <TraceLine />
            <div className="flex justify-between mt-3 font-mono text-[12px] text-text-faint">
              <span>trade 1</span>
              <span>trade 40</span>
            </div>
          </div>
        </section>

        <section id="bitacora" className="py-20 border-t border-hairline">
          <p className="font-mono text-[13px] text-steel tracking-wide mb-2">bitácora</p>
          <h2 className="font-display text-[28px] text-text-primary mb-12">
            Cuatro principios, sin excepciones.
          </h2>
          <div className="space-y-0">
            {entries.map((entry, i) => (
              <div
                key={entry.n}
                className={`grid grid-cols-[64px_1fr] gap-6 py-7 ${
                  i !== 0 ? 'border-t border-hairline' : ''
                }`}
              >
                <span className="font-mono text-[13px] text-text-faint pt-0.5">{entry.n}</span>
                <div>
                  <h3 className="font-display text-[18px] text-text-primary mb-2">
                    {entry.title}
                  </h3>
                  <p className="font-body text-[15px] text-text-muted leading-relaxed max-w-xl">
                    {entry.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 border-t border-hairline text-center">
          <h2 className="font-display text-[28px] text-text-primary mb-4">
            Tu próximo trade puede ser el primero registrado.
          </h2>
          <Link
            to="/registro"
            className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors mt-4"
          >
            Crear cuenta gratis
          </Link>
        </section>
      </main>

      <footer className="border-t border-hairline py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="font-mono text-[12px] text-text-faint">lineatrade</span>
          <span className="font-mono text-[12px] text-text-faint">
            no da señales. no predice el mercado.
          </span>
        </div>
      </footer>
    </div>
  )
}
