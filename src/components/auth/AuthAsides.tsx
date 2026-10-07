import { Check } from 'lucide-react'
import { academyModules } from '@/data/academy'

// Paneles de apoyo de las pantallas de acceso (solo escritorio). Las cifras de
// ejemplo van rotuladas como ilustrativas; la única cifra real (lecciones de la
// Academia) se calcula desde los datos de la Academia, no se escribe a mano.
const ACADEMY_LESSON_COUNT = academyModules.reduce((total, module) => total + module.lessons.length, 0)

function AsideTile({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'brand' | 'plain' | 'gain' }) {
  const isBrand = tone === 'brand'
  return (
    <div
      className={
        isBrand
          ? 'rounded-[10px] border-2 border-ink bg-signal px-3.5 py-3 text-on-signal shadow-pop'
          : 'rounded-[10px] bg-panel-2 px-3.5 py-3'
      }
    >
      <p className={`label-mono text-[9px] ${isBrand ? 'text-on-signal/80' : ''}`}>{label}</p>
      {isBrand ? (
        <p className="mt-1.5 font-display text-2xl">{value}</p>
      ) : (
        <p className={`num mt-1.5 text-[22px] ${tone === 'gain' ? 'text-gain' : 'text-text-primary'}`}>{value}</p>
      )}
    </div>
  )
}

// Ingresar / recuperar: la promesa del producto con tres métricas de ejemplo.
export function PromiseAside() {
  return (
    <div className="flex flex-1 flex-col justify-between gap-10 rounded-2xl border border-hairline bg-panel p-12 xl:p-14">
      <div>
        <p className="label-mono">Nuestra promesa</p>
        <h2 className="mt-3.5 max-w-[480px] text-balance font-display text-[40px] leading-[1.06] xl:text-[44px]">
          No ayudamos a ganar más dinero. Ayudamos a cometer{' '}
          <span className="rounded-md bg-spark px-2 text-on-spark [box-decoration-break:clone]">menos errores.</span>
        </h2>
      </div>
      <div className="grid max-w-[520px] grid-cols-3 gap-3">
        <AsideTile label="R acum." value="+15.1R" tone="brand" />
        <AsideTile label="Win rate" value="58%" />
        <AsideTile label="R prom." value="+0.42" tone="gain" />
        <p className="label-mono col-span-3 text-[10px]">Vista ilustrativa</p>
      </div>
    </div>
  )
}

const BENEFITS = [
  'Registra un trade con una foto del ticket',
  'Win rate, profit factor y R calculados por el sistema',
  'Patrones de tu psicología detectados con evidencia',
  `Academia con ${ACADEMY_LESSON_COUNT} lecciones`,
]

// Registro / correo enviado: lo que incluye la cuenta.
export function BenefitsAside() {
  return (
    <div className="relative flex flex-1 flex-col justify-between gap-10 overflow-hidden rounded-2xl border-2 border-ink bg-signal p-12 text-on-signal shadow-[8px_8px_0_var(--color-pop)] xl:p-14">
      <div>
        <p className="label-mono text-on-signal/80">Lo que vas a tener</p>
        <h2 className="mt-3.5 max-w-[460px] text-balance font-display text-[40px] leading-[1.04] xl:text-[44px]">
          Un registro honesto de cómo operas.
        </h2>
        <ul className="mt-7 flex flex-col gap-1.5">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 py-1.5 font-body text-[15px]">
              <Check size={20} strokeWidth={2.6} className="mt-0.5 shrink-0 text-spark" aria-hidden="true" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
      <div className="max-w-[360px] -rotate-[1.5deg] self-start rounded-[10px] bg-spark px-4 py-3.5 text-on-spark">
        <p className="label-mono text-[10px] text-on-spark/70">Ejemplo ilustrativo · patrón detectado</p>
        <p className="mt-1 font-body text-[15px] font-bold leading-snug">Con FOMO tu win rate cae a 31%. Sin FOMO: 64%.</p>
      </div>
    </div>
  )
}
