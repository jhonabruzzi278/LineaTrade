import type { ReactNode } from 'react'
import { ARCHETYPE_LABELS, INSTRUMENT_CATEGORY_LABELS, STYLE_LABELS, type TraderPlan } from '../../lib/traderPlanEngine'
import { Card } from '../ui/card'

interface PlanReportProps {
  plan: TraderPlan
  /** Teaser público: «Cómo debes operar» en claro y el resto difuminado. */
  blurred?: boolean
  /** Contenido superpuesto sobre la parte difuminada (invitación a registrarse). */
  overlay?: ReactNode
}

const LEVEL_LABELS: Record<TraderPlan['level'], string> = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' }

function formatDecimal(value: number): string {
  return String(value).replace('.', ',')
}

function PlanSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" className="px-4 py-4 sm:px-6 sm:py-5">
      <h2 className="font-display text-[16px] text-text-primary sm:text-[17px]">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-hairline bg-ink px-3.5 py-3">
      <p className="label-mono">{label}</p>
      <p className="num mt-1.5 text-[18px] text-text-primary sm:text-[20px]">{value}</p>
    </div>
  )
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-hairline py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="label-mono shrink-0">{label}</span>
      <span className="text-right font-body text-[15px] font-semibold text-text-primary">{value}</span>
    </div>
  )
}

// Todo sale de TraderPlan, que calcula traderPlanEngine.ts con reglas fijas (sin
// modelo de lenguaje). La pantalla solo presenta esas cifras; no agrega ninguna.
export function PlanReport({ plan, blurred = false, overlay }: PlanReportProps) {
  const sections = (
    <div className="space-y-4">
      <PlanSection title="Gestión del riesgo">
        <div className="grid grid-cols-2 gap-2.5">
          <KeyValue label="Riesgo por operación" value={`${formatDecimal(plan.riskPerTradePercent)}%`} />
          <KeyValue label="Relación riesgo:beneficio" value={`1:${formatDecimal(plan.riskRewardRatio)}`} />
          <KeyValue label="Apalancamiento máximo" value={`1:${formatDecimal(plan.maxLeverage)}`} />
          <KeyValue label="Pérdida semanal máxima" value={`${formatDecimal(plan.maxWeeklyLossMultiple)}× riesgo/op`} />
        </div>
      </PlanSection>

      <PlanSection title="Qué esperar">
        <div className="grid grid-cols-2 gap-2.5">
          <KeyValue label="Win rate mínimo viable" value={`${formatDecimal(plan.minViableWinRatePercent)}%`} />
          <KeyValue label="Expectativa en tu suelo" value={`${plan.floorExpectancyR > 0 ? '+' : ''}${formatDecimal(plan.floorExpectancyR)}R`} />
        </div>
        <p className="mt-3 font-body text-[13px] leading-relaxed text-text-faint">
          Con una relación 1:{formatDecimal(plan.riskRewardRatio)} necesitas acertar al menos {formatDecimal(plan.minViableWinRatePercent)}% de tus operaciones para no perder, antes de comisiones. No es una predicción de tus resultados.
        </p>
      </PlanSection>

      <PlanSection title="Rutina operativa">
        <ol className="list-none space-y-0.5 p-0">
          {plan.operatingRoutine.map((step, index) => (
            <li key={step} className="grid grid-cols-[26px_minmax(0,1fr)] gap-3 py-2 font-body text-[14px] leading-relaxed text-text-muted sm:text-[15px]">
              <span className="num mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-panel-2 text-[11px] text-steel">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </PlanSection>

      <PlanSection title="Tus señales de alerta">
        {plan.redFlags.length === 0 ? (
          <p className="font-body text-[14px] text-text-muted">Sin señales de alerta críticas en tu perfil. Aun así, empieza con prudencia.</p>
        ) : (
          <ul className="space-y-2">
            {plan.redFlags.map((flag) => (
              <li key={flag} className="border-l-[3px] border-l-loss/60 pl-3 font-body text-[14px] leading-relaxed text-text-muted">
                {flag}
              </li>
            ))}
          </ul>
        )}
      </PlanSection>
    </div>
  )

  return (
    <div className="space-y-4">
      <PlanSection title="Cómo debes operar">
        <PlanRow label="Nivel" value={LEVEL_LABELS[plan.level]} />
        <PlanRow label="Estilo" value={STYLE_LABELS[plan.style]} />
        <PlanRow label="Arquetipo" value={ARCHETYPE_LABELS[plan.archetype]} />
        <PlanRow label="Instrumento" value={`${plan.recommendedInstrument} (${INSTRUMENT_CATEGORY_LABELS[plan.instrumentCategory]})`} />
      </PlanSection>

      {blurred ? (
        <div className="relative">
          <div aria-hidden="true" className="pointer-events-none max-h-[420px] select-none overflow-hidden opacity-55 blur-[6px]">
            {sections}
          </div>
          {overlay && <div className="absolute inset-0 flex items-center justify-center p-2">{overlay}</div>}
        </div>
      ) : (
        sections
      )}
    </div>
  )
}
