import { ArrowUpRight, CircleDollarSign, Flame, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FUNDED_STATUS_COPY, type FundedChallenge, type FundedChallengeStatus } from '../../data/fundedTracker'
import { ProgressBar } from '../ui/progress-bar'
import { Button } from '../ui/button'

interface ChallengeTableProps {
  challenges: FundedChallenge[]
  filter: 'all' | FundedChallengeStatus
  onFilterChange: (filter: 'all' | FundedChallengeStatus) => void
  onAdd: () => void
}

const FILTERS: Array<{ key: 'all' | FundedChallengeStatus; label: string }> = [
  { key: 'all', label: 'Todas' }, { key: 'phase_one', label: 'En curso' }, { key: 'funded', label: 'Fondeadas' }, { key: 'burned', label: 'Quemadas' },
]

function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function tradeCountLabel(count: number): string {
  return `${count} trade${count === 1 ? '' : 's'}`
}

export function ChallengeTable({ challenges, filter, onFilterChange, onAdd }: ChallengeTableProps) {
  const shown = filter === 'all' ? challenges : filter === 'phase_one' ? challenges.filter((challenge) => challenge.status === 'phase_one' || challenge.status === 'phase_two') : challenges.filter((challenge) => challenge.status === filter)
  const live = challenges.filter((challenge) => challenge.status === 'phase_one' || challenge.status === 'phase_two').length
  return (
    <section aria-labelledby="challenge-list-title">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><h2 id="challenge-list-title" className="font-display text-[19px] text-text-primary">Cuentas de fondeo</h2><span className="num rounded-full border border-hairline px-2 py-0.5 text-[10px] text-text-faint">{live} en curso</span></div><p className="mt-1 font-body text-[12px] text-text-faint">Progreso y resultado de cada reto, sin mezclarlo con el rendimiento de tu estrategia.</p></div><Button type="button" variant="cta" size="sm" onClick={onAdd}><Plus className="h-4 w-4" aria-hidden="true" />Nueva prueba</Button></div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar cuentas de fondeo">
        {FILTERS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} onClick={() => onFilterChange(item.key)} className={`min-h-9 shrink-0 rounded-full border px-3 font-body text-[12px] font-semibold transition-colors ${filter === item.key ? 'border-signal bg-signal/15 text-steel' : 'border-hairline text-text-faint hover:border-text-faint hover:text-text-primary'}`}>{item.label}</button>)}
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-hairline bg-panel">
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[840px] border-collapse text-left"><thead className="border-b border-hairline bg-panel-2/55"><tr>{['Inicio', 'Firma', 'Cuenta', 'Tipo', 'Estado', 'Progreso', 'Retiros', 'Actividad'].map((heading) => <th key={heading} scope="col" className="label-mono px-4 py-3 text-[9px]">{heading}</th>)}</tr></thead><tbody>{shown.map((challenge) => <ChallengeRow key={challenge.id} challenge={challenge} />)}</tbody></table></div>
        <div className="divide-y divide-hairline lg:hidden">{shown.map((challenge) => <ChallengeCompactRow key={challenge.id} challenge={challenge} />)}</div>
      </div>
    </section>
  )
}

function addTradeHref(challenge: FundedChallenge): string {
  return challenge.activePhaseId ? `/nuevo-trade?funding_phase_id=${challenge.activePhaseId}` : '/nuevo-trade'
}

function ChallengeRow({ challenge }: { challenge: FundedChallenge }) {
  const status = FUNDED_STATUS_COPY[challenge.status]
  return <tr className="border-b border-hairline/80 last:border-b-0"><td className="num px-4 py-4 text-[12px] text-text-faint">{challenge.startedAt}</td><td className="px-4 py-4"><p className="font-body text-[13px] font-bold text-text-primary">{challenge.firm}</p></td><td className="px-4 py-4"><p className="num text-[13px] font-semibold text-text-primary">{money(challenge.accountSize)}</p><p className="num mt-0.5 text-[10px] text-text-faint">{challenge.accountLabel}</p></td><td className="px-4 py-4"><span className="num rounded border border-hairline bg-panel-2 px-2 py-1 text-[10px] uppercase text-text-muted">{challenge.evaluationType}</span></td><td className="px-4 py-4"><span className={`inline-flex rounded border px-2 py-1 font-mono text-[10px] font-semibold ${status.className}`}>{status.label}</span></td><td className="w-48 px-4 py-4"><ProgressSummary challenge={challenge} /></td><td className="px-4 py-4"><p className={`num text-[13px] font-bold ${challenge.payouts > 0 ? 'text-gain' : 'text-text-faint'}`}>{challenge.payouts ? money(challenge.payouts) : '—'}</p><p className="num mt-0.5 text-[10px] text-text-faint">Costo {money(challenge.cost)}</p></td><td className="px-4 py-4"><Link to={addTradeHref(challenge)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline px-2.5 font-body text-[11px] font-semibold text-text-muted hover:border-text-faint hover:bg-panel-2 hover:text-text-primary">Añadir trade <ArrowUpRight className="h-3.5 w-3.5" /></Link></td></tr>
}

function ChallengeCompactRow({ challenge }: { challenge: FundedChallenge }) {
  const status = FUNDED_STATUS_COPY[challenge.status]
  return <article className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-body text-[14px] font-bold text-text-primary">{challenge.firm}</p><p className="num mt-1 text-[11px] text-text-faint">{money(challenge.accountSize)} · {challenge.evaluationType}</p></div><span className={`shrink-0 rounded border px-2 py-1 font-mono text-[10px] font-semibold ${status.className}`}>{status.label}</span></div><ProgressSummary challenge={challenge} compact /><div className="mt-3 flex items-center justify-between gap-3"><p className="num text-[11px] text-text-faint">Costo {money(challenge.cost)} · {tradeCountLabel(challenge.tradeCount)}</p><Link to={addTradeHref(challenge)} className="inline-flex min-h-9 items-center gap-1 font-body text-[12px] font-semibold text-steel">Añadir trade <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></article>
}

function ProgressSummary({ challenge, compact = false }: { challenge: FundedChallenge; compact?: boolean }) {
  if (challenge.status === 'funded') return <div className={compact ? 'mt-4' : ''}><p className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-gain"><CircleDollarSign className="h-3.5 w-3.5" /> Cuenta activa</p>{challenge.fundedAt && <p className="num mt-1 text-[10px] text-text-faint">Fondeada {challenge.fundedAt}</p>}</div>
  if (challenge.status === 'burned') return <div className={compact ? 'mt-4' : ''}><p className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-loss"><Flame className="h-3.5 w-3.5" /> Reto cerrado</p><p className="num mt-1 text-[10px] text-text-faint">P&L {money(challenge.realizedPnl)}</p></div>
  return <div className={compact ? 'mt-4' : ''}><div className="flex items-center justify-between gap-3"><p className="num text-[11px] font-semibold text-text-primary">+{challenge.realizedPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</p><span className="num text-[10px] text-text-faint">{challenge.phaseProgress}% del objetivo</span></div><ProgressBar value={challenge.phaseProgress} label={`Progreso de ${challenge.firm}: ${challenge.phaseProgress}%`} tone="gain" className="mt-1.5" /><p className="num mt-1 text-[10px] text-text-faint">Target {challenge.phaseTarget}% · {tradeCountLabel(challenge.tradeCount)}</p></div>
}
