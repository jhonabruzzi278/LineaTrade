import { MetricCard } from '../MetricCard'
import {
  ARCHETYPE_LABELS,
  INSTRUMENT_CATEGORY_LABELS,
  STYLE_LABELS,
  type TraderPlan,
} from '../../lib/traderPlanEngine'

interface PlanReportProps {
  plan: TraderPlan
  blurred?: boolean
}

// blurred=true es el teaser público (ver PlanTeaser.tsx): se muestra la
// sección "Cómo debes operar" en claro y el resto tapado, en vez de ocultar
// componentes enteros — así el usuario ve que el plan existe y es concreto,
// no una promesa vacía.
export function PlanReport({ plan, blurred = false }: PlanReportProps) {
  return (
    <div className="space-y-8">
      <section>
        <p className="font-mono text-[12px] text-signal mb-3 tracking-wide">cómo debes operar</p>
        <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card">
          <PlanRow label="Nivel" value={plan.level === 'principiante' ? 'Principiante' : plan.level === 'intermedio' ? 'Intermedio' : 'Avanzado'} />
          <PlanRow label="Estilo" value={STYLE_LABELS[plan.style]} />
          <PlanRow label="Arquetipo" value={ARCHETYPE_LABELS[plan.archetype]} />
          <PlanRow
            label="Instrumento"
            value={`${plan.recommendedInstrument} (${INSTRUMENT_CATEGORY_LABELS[plan.instrumentCategory]})`}
          />
        </div>
      </section>

      <div className={blurred ? 'relative' : undefined}>
        {blurred && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/80 backdrop-blur-sm rounded-sm">
            <p className="font-body text-[14px] text-text-muted text-center px-6 max-w-xs">
              Regístrate gratis para ver tu gestión de riesgo completa y descargar tu paquete para IA.
            </p>
          </div>
        )}
        <div className={blurred ? 'pointer-events-none select-none blur-[3px]' : undefined}>
          <section className="mb-8">
            <p className="font-mono text-[12px] text-signal mb-3 tracking-wide">gestión del riesgo</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="riesgo por operación" value={`${plan.riskPerTradePercent}%`} />
              <MetricCard label="ratio riesgo:beneficio" value={`1:${plan.riskRewardRatio}`} />
              <MetricCard label="apalancamiento máximo" value={`1:${plan.maxLeverage}`} />
              <MetricCard label="pérdida semanal máxima" value={`${plan.maxWeeklyLossMultiple}× riesgo/op`} />
            </div>
          </section>

          <section className="mb-8">
            <p className="font-mono text-[12px] text-signal mb-3 tracking-wide">qué esperar</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="win rate mínimo viable" value={`${plan.minViableWinRatePercent}%`} />
              <MetricCard label="expectativa en tu suelo" value={`${plan.floorExpectancyR > 0 ? '+' : ''}${plan.floorExpectancyR}R`} />
            </div>
            <p className="font-body text-[13px] text-text-muted mt-3">
              Objetivo mensual realista: {plan.realisticMonthlyReturnRange[0]}–{plan.realisticMonthlyReturnRange[1]}%. No es un
              suelo garantizado — es el techo razonable para tu perfil.
            </p>
          </section>

          <section className="mb-8">
            <p className="font-mono text-[12px] text-signal mb-3 tracking-wide">rutina operativa</p>
            <ol className="space-y-2">
              {plan.operatingRoutine.map((step) => (
                <li key={step} className="font-body text-[14px] text-text-muted flex gap-3">
                  <span className="text-signal shrink-0">·</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <p className="font-mono text-[12px] text-signal mb-3 tracking-wide">tus señales de alerta</p>
            {plan.redFlags.length === 0 ? (
              <p className="font-body text-[14px] text-text-muted">
                Sin señales de alerta críticas en tu perfil. Aun así, empieza con prudencia.
              </p>
            ) : (
              <ul className="space-y-2">
                {plan.redFlags.map((flag) => (
                  <li key={flag} className="font-body text-[14px] text-text-muted border-l-2 border-signal/40 pl-3">
                    {flag}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <span className="font-mono text-[12px] text-text-faint">{label}</span>
      <span className="font-body text-[14px] text-text-primary text-right">{value}</span>
    </div>
  )
}
