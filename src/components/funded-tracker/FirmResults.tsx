import type { FundedChallenge } from '../../data/fundedTracker'
import { ProgressBar } from '../ui/progress-bar'

interface FirmResultsProps {
  challenges: FundedChallenge[]
}

function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function FirmResults({ challenges }: FirmResultsProps) {
  const firms = Object.values(challenges.reduce<Record<string, FundedChallenge[]>>((grouped, challenge) => {
    grouped[challenge.firm] ??= []
    grouped[challenge.firm].push(challenge)
    return grouped
  }, {}))

  return (
    <section aria-labelledby="firm-results-title">
      <div className="mb-3 flex items-center gap-2"><h2 id="firm-results-title" className="font-display text-[19px] text-text-primary">Resultados por firma</h2><span className="num rounded-full border border-hairline px-2 py-0.5 text-[10px] text-text-faint">{firms.length} firmas</span></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {firms.map((items) => <FirmCard key={items[0].firm} firm={items[0].firm} challenges={items} />)}
      </div>
    </section>
  )
}

function FirmCard({ firm, challenges }: { firm: string; challenges: FundedChallenge[] }) {
  const completed = challenges.filter((challenge) => challenge.status === 'funded' || challenge.status === 'burned')
  const passedPhaseOne = challenges.filter((challenge) => challenge.status !== 'phase_one' && challenge.status !== 'burned')
  const funded = challenges.filter((challenge) => challenge.status === 'funded')
  const spent = challenges.reduce((total, challenge) => total + challenge.cost, 0)
  const payouts = challenges.reduce((total, challenge) => total + challenge.payouts, 0)
  const passRate = completed.length ? Math.round((passedPhaseOne.length / completed.length) * 100) : 0
  const fundingRate = completed.length ? Math.round((funded.length / completed.length) * 100) : 0
  const initials = firm.split(' ').map((word) => word[0]).join('').slice(0, 2)

  return (
    <article className="rounded-xl border border-hairline bg-panel p-4 shadow-card">
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline bg-panel-2 font-mono text-[11px] font-bold text-steel">{initials}</span><div><h3 className="font-body text-[14px] font-bold text-text-primary">{firm}</h3><p className="num mt-0.5 text-[11px] text-text-faint">{challenges.length} retos</p></div></div><span className="num rounded-full bg-panel-2 px-2 py-0.5 text-[10px] text-text-faint">{funded.length} fondeada{funded.length === 1 ? '' : 's'}</span></div>
      <div className="mt-5 grid gap-3"><FirmRate label="Pass F1" value={passRate} /><FirmRate label="Llegó a fondeo" value={fundingRate} /></div>
      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-hairline pt-3"><FirmFact label="Gastado" value={money(spent)} tone="loss" /><FirmFact label="Retiros" value={money(payouts)} tone="gain" /><FirmFact label="Neto" value={money(payouts - spent)} tone={payouts - spent >= 0 ? 'gain' : 'loss'} /></dl>
    </article>
  )
}

function FirmRate({ label, value }: { label: string; value: number }) {
  return <div><div className="flex justify-between gap-2"><span className="label-mono text-[9px]">{label}</span><span className="num text-[11px] font-bold text-text-primary">{value}%</span></div><ProgressBar value={value} label={`${label}: ${value}%`} tone="gain" className="mt-1.5" /></div>
}

function FirmFact({ label, value, tone }: { label: string; value: string; tone: 'gain' | 'loss' }) {
  return <div className="min-w-0"><dt className="label-mono text-[8px]">{label}</dt><dd className={`num mt-1 truncate text-[12px] font-bold ${tone === 'gain' ? 'text-gain' : 'text-loss'}`}>{value}</dd></div>
}
