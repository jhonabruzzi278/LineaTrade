import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Landmark, Plus, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BankrollCurve } from '../components/funded-tracker/BankrollCurve'
import { ChallengeTable } from '../components/funded-tracker/ChallengeTable'
import { FirmResults } from '../components/funded-tracker/FirmResults'
import { NewChallengeDialog } from '../components/funded-tracker/NewChallengeDialog'
import { MetricCard } from '../components/MetricCard'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { type FundedChallenge, type FundedChallengeStatus } from '../data/fundedTracker'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Database } from '../types/database'

// Sin un campo de "capital aportado" en el schema, el bankroll parte de 0 y
// se mueve solo con lo que las pruebas realmente gastaron y retiraron — nunca
// un número de partida inventado.
const STARTING_BANKROLL = 0

type PhaseTimingRow = Pick<
  Database['public']['Tables']['funding_challenge_phases']['Row'],
  'challenge_id' | 'phase_number' | 'phase_kind' | 'status' | 'started_on' | 'completed_on'
>

function usd(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits }).format(value)
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

// Promedios reales de tiempos por fase, a partir de started_on/completed_on —
// sin datos todavía, cada métrica muestra "—" en vez de un número fabricado.
function computeTiming(phases: PhaseTimingRow[]) {
  const phaseOneDurations = phases
    .filter((phase) => phase.phase_number === 1 && phase.completed_on)
    .map((phase) => daysBetween(phase.started_on, phase.completed_on!))
  const phaseTwoDurations = phases
    .filter((phase) => phase.phase_number === 2 && phase.completed_on)
    .map((phase) => daysBetween(phase.started_on, phase.completed_on!))

  const firstPhaseStartByChallenge = new Map<string, string>()
  for (const phase of phases) {
    const current = firstPhaseStartByChallenge.get(phase.challenge_id)
    if (!current || phase.started_on < current) firstPhaseStartByChallenge.set(phase.challenge_id, phase.started_on)
  }

  const toFundedDurations: number[] = []
  const toBurnDurations: number[] = []
  for (const phase of phases) {
    const firstStart = firstPhaseStartByChallenge.get(phase.challenge_id)
    if (!firstStart) continue
    if (phase.phase_kind === 'funded') toFundedDurations.push(daysBetween(firstStart, phase.started_on))
    if (phase.status === 'failed' && phase.completed_on) toBurnDurations.push(daysBetween(firstStart, phase.completed_on))
  }

  return {
    phaseOne: { avgDays: average(phaseOneDurations), count: phaseOneDurations.length },
    phaseTwo: { avgDays: average(phaseTwoDurations), count: phaseTwoDurations.length },
    toFunded: { avgDays: average(toFundedDurations), count: toFundedDurations.length },
    toBurn: { avgDays: average(toBurnDurations), count: toBurnDurations.length },
  }
}

export default function FondeoTracker() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<FundedChallenge[]>([])
  const [filter, setFilter] = useState<'all' | FundedChallengeStatus>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [extraExpenses, setExtraExpenses] = useState(0)
  const [journalPnl, setJournalPnl] = useState(0)
  const [journalTradeCount, setJournalTradeCount] = useState(0)
  const [paidPayoutCount, setPaidPayoutCount] = useState(0)
  const [timing, setTiming] = useState(() => computeTiming([]))

  useEffect(() => { if (user) void loadChallenges() }, [user])

  async function loadChallenges() {
    setLoading(true)
    setLoadError(null)
    const [challengeResult, payoutResult, progressResult, expenseResult, phaseResult] = await Promise.all([
      supabase.from('funding_challenges').select('*').is('deleted_at', null).order('started_on', { ascending: false }),
      supabase.from('funding_payouts').select('challenge_id, net_amount, status').eq('status', 'paid'),
      supabase.from('v_funding_phase_progress').select('*'),
      supabase.from('funding_expenses').select('amount'),
      supabase.from('funding_challenge_phases').select('challenge_id, phase_number, phase_kind, status, started_on, completed_on'),
    ])
    const error = challengeResult.error ?? payoutResult.error ?? progressResult.error ?? expenseResult.error ?? phaseResult.error
    if (error) { setLoadError(error.message); setLoading(false); return }
    const payouts = new Map<string, number>()
    for (const payout of payoutResult.data ?? []) payouts.set(payout.challenge_id, (payouts.get(payout.challenge_id) ?? 0) + payout.net_amount)
    const latest = new Map<string, Database['public']['Views']['v_funding_phase_progress']['Row']>()
    for (const progress of progressResult.data ?? []) {
      if (!progress.challenge_id) continue
      const current = latest.get(progress.challenge_id)
      if (!current || (progress.phase_number ?? 0) > (current.phase_number ?? 0)) latest.set(progress.challenge_id, progress)
    }
    setChallenges((challengeResult.data ?? []).map((challenge) => toChallengeCard(challenge, latest.get(challenge.id), payouts.get(challenge.id) ?? 0)))
    setExtraExpenses((expenseResult.data ?? []).reduce((sum, expense) => sum + expense.amount, 0))
    setJournalPnl((progressResult.data ?? []).reduce((sum, progress) => sum + (progress.net_pnl ?? 0), 0))
    setJournalTradeCount((progressResult.data ?? []).reduce((sum, progress) => sum + (progress.closed_trade_count ?? 0), 0))
    setPaidPayoutCount((payoutResult.data ?? []).length)
    setTiming(computeTiming(phaseResult.data ?? []))
    setLoading(false)
  }
  const summary = useMemo(() => {
    const totalSpent = challenges.reduce((sum, challenge) => sum + challenge.cost, 0)
    const payouts = challenges.reduce((sum, challenge) => sum + challenge.payouts, 0)
    const completed = challenges.filter((challenge) => challenge.status === 'funded' || challenge.status === 'burned')
    const funded = challenges.filter((challenge) => challenge.status === 'funded')
    const net = payouts - totalSpent - extraExpenses
    const spentWithExtras = totalSpent + extraExpenses
    return {
      totalSpent, payouts, net, bankroll: STARTING_BANKROLL + net,
      roi: spentWithExtras > 0 ? (net / spentWithExtras) * 100 : 0,
      fundingRate: completed.length ? (funded.length / completed.length) * 100 : 0,
      fundedCount: funded.length,
      completedCount: completed.length,
    }
  }, [challenges, extraExpenses])

  async function addChallenge(challenge: FundedChallenge) {
    if (!user) throw new Error('Tu sesión expiró. Vuelve a ingresar para guardar la prueba.')
    const accountType = challenge.evaluationType === '2 fases' ? 'evaluation_two_phase' : challenge.evaluationType === '1 fase' ? 'evaluation_one_phase' : 'instant_funded'
    const { data: created, error: challengeError } = await supabase.from('funding_challenges').insert({
      user_id: user.id, firm_name: challenge.firm, account_identifier: challenge.accountLabel === 'Sin vincular' ? null : challenge.accountLabel,
      account_size: challenge.accountSize, purchase_cost: challenge.cost, account_type: accountType, started_on: challenge.startedOn ?? new Date().toISOString().slice(0, 10), notes: challenge.rules?.notes ?? null,
    }).select('*').single()
    if (challengeError) throw challengeError
    const rules = challenge.rules
    const { error: rulesError } = await supabase.from('funding_challenge_rules').insert({
      user_id: user.id, challenge_id: created.id, phase_one_profit_target_percent: rules?.phaseOneTarget ?? challenge.phaseTarget,
      phase_two_profit_target_percent: rules?.phaseTwoTarget ?? null, daily_drawdown_percent: rules?.dailyDrawdown ?? null,
      max_drawdown_percent: rules?.maxDrawdown ?? 10, min_trading_days_per_phase: rules?.minimumDays ?? 0,
      max_daily_consistency_percent: rules?.consistency ?? null, phase_two_requires_new_account: rules?.newAccountForPhaseTwo ?? false,
    })
    if (rulesError) {
      await supabase.from('funding_challenges').delete().eq('id', created.id)
      throw rulesError
    }
    await loadChallenges()
    setFilter('all')
  }

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
      <PageHeader
        kicker="Análisis · cartera de retos"
        title="Fondeo Tracker"
        lead="Sigue el capital que arriesgas, el avance de cada evaluación y los retiros de tus cuentas fondeadas."
        actions={<><Link to="/simulador" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline px-4 font-body text-[13px] font-semibold text-text-muted hover:bg-panel hover:text-text-primary">Simular reglas <ArrowRight className="h-4 w-4" /></Link><Button type="button" variant="cta" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" />Nueva prueba</Button></>}
      />

      {loading && <p className="mb-4 font-body text-[13px] text-text-faint">Cargando tus pruebas de fondeo...</p>}
      {loadError && <p role="alert" className="mb-4 font-body text-[13px] text-loss">No se pudieron cargar tus pruebas: {loadError}</p>}

      <section aria-label="Resumen del bankroll" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bankroll actual" value={usd(summary.bankroll)} tone={summary.bankroll >= 0 ? 'gain' : 'loss'} icon={<WalletCards className="h-4 w-4" />} hint="Gastado en pruebas menos lo retirado, sin capital de partida" />
        <MetricCard label="ROI neto" value={`${summary.net >= 0 ? '+' : ''}${usd(summary.net)}`} tone={summary.net >= 0 ? 'gain' : 'loss'} hint={`${summary.roi >= 0 ? '+' : ''}${summary.roi.toFixed(1)}% sobre lo gastado · incluye ${usd(extraExpenses)} en gastos extra`} />
        <MetricCard label="Tasa de fondeo" value={`${summary.fundingRate.toFixed(1)}%`} icon={<Landmark className="h-4 w-4" />} hint={`${summary.fundedCount} fondeadas de ${summary.completedCount} completadas`} />
        <MetricCard label="P&L trades · journal" value={`${journalPnl >= 0 ? '+' : ''}${usd(journalPnl)}`} tone={journalPnl >= 0 ? 'gain' : 'loss'} hint={`${journalTradeCount} trade${journalTradeCount === 1 ? '' : 's'} vinculado${journalTradeCount === 1 ? '' : 's'} a estas cuentas`} />
      </section>

      <section aria-label="Rentabilidad consolidada" className="mt-4 overflow-hidden rounded-xl border border-hairline bg-panel-2/50">
        <div className="grid gap-px bg-hairline sm:grid-cols-4"><SummaryStrip label="Resultado neto" value={`${summary.net >= 0 ? 'En positivo ' : ''}${usd(summary.net, 2)}`} tone={summary.net >= 0 ? 'gain' : 'loss'} /><SummaryStrip label="Gastado" value={`${usd(summary.totalSpent)} + ${usd(extraExpenses)} extras`} /><SummaryStrip label="Recibido" value={usd(summary.payouts)} /><SummaryStrip label="ROI real" value={`${summary.roi >= 0 ? '+' : ''}${summary.roi.toFixed(1)}%`} /></div>
      </section>

      <section aria-labelledby="timing-title" className="mt-7 rounded-xl border border-hairline bg-panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4"><div><p className="label-mono">Ritmo operativo</p><h2 id="timing-title" className="mt-1 font-display text-[19px] text-text-primary">Tiempos promedio</h2></div><span className="font-body text-[12px] text-text-faint">Días con operativa</span></div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TimingFact label="Días en Fase 1" value={timing.phaseOne.avgDays != null ? `${timing.phaseOne.avgDays.toFixed(0)}d` : '—'} hint={`${timing.phaseOne.count} prueba${timing.phaseOne.count === 1 ? '' : 's'}`} />
          <TimingFact label="Días en Fase 2" value={timing.phaseTwo.avgDays != null ? `${timing.phaseTwo.avgDays.toFixed(0)}d` : '—'} hint={`${timing.phaseTwo.count} prueba${timing.phaseTwo.count === 1 ? '' : 's'}`} />
          <TimingFact label="Días a fondeo" value={timing.toFunded.avgDays != null ? `${timing.toFunded.avgDays.toFixed(0)}d` : '—'} hint={`${timing.toFunded.count} fondeo${timing.toFunded.count === 1 ? '' : 's'}`} />
          <TimingFact label="Días hasta quema" value={timing.toBurn.avgDays != null ? `${timing.toBurn.avgDays.toFixed(0)}d` : '—'} hint={`${timing.toBurn.count} cuenta${timing.toBurn.count === 1 ? '' : 's'}`} />
        </dl>
      </section>

      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <BankrollCurve points={challenges.length ? curveFromChallenges(challenges) : [{ label: 'Hoy', value: STARTING_BANKROLL }]} openingBalance={STARTING_BANKROLL} />
        <Card as="aside" className="p-5"><p className="label-mono">Lectura del periodo</p><h2 className="mt-1 font-display text-[20px] text-text-primary">Qué separa este tracker</h2><p className="mt-3 font-body text-[13px] leading-relaxed text-text-muted">El bankroll mide el dinero real que pones en retos y recibes en retiros. El journal conserva el P&L de trading de cada cuenta. Ver ambos evita tratar una cuenta nominal como capital propio.</p><dl className="mt-5 grid gap-4 border-t border-hairline pt-4"><InsightFact label="Total gastado" value={usd(summary.totalSpent)} detail={`${challenges.length} prueba${challenges.length === 1 ? '' : 's'} registrada${challenges.length === 1 ? '' : 's'}`} tone="loss" /><InsightFact label="Total recibido" value={usd(summary.payouts)} detail={`${paidPayoutCount} retiro${paidPayoutCount === 1 ? '' : 's'}`} tone="gain" /><InsightFact label="Gastos extra" value={usd(extraExpenses)} detail="Herramientas y formación" tone="loss" /></dl></Card>
      </div>

      <div className="mt-8"><FirmResults challenges={challenges} /></div>
      <div className="mt-8"><ChallengeTable challenges={challenges} filter={filter} onFilterChange={setFilter} onAdd={() => setDialogOpen(true)} /></div>

      <NewChallengeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={addChallenge} />
    </main>
  )
}

type ChallengeRow = Database['public']['Tables']['funding_challenges']['Row']
type ProgressRow = Database['public']['Views']['v_funding_phase_progress']['Row']

function toChallengeCard(challenge: ChallengeRow, progress: ProgressRow | undefined, payouts: number): FundedChallenge {
  const phaseTarget = progress?.profit_target_percent ?? 0
  const pnl = progress?.net_pnl ?? 0
  const percent = progress?.profit_target_amount && progress.profit_target_amount > 0 ? Math.max(0, Math.min(100, pnl / progress.profit_target_amount * 100)) : 0
  const status: FundedChallengeStatus = challenge.status === 'phase_two' ? 'phase_two' : challenge.status === 'funded' ? 'funded' : challenge.status === 'burned' ? 'burned' : 'phase_one'
  return { id: challenge.id, firm: challenge.firm_name, accountLabel: challenge.account_identifier ?? 'Sin vincular', accountSize: challenge.account_size,
    evaluationType: challenge.account_type === 'evaluation_two_phase' ? '2 fases' : challenge.account_type === 'evaluation_one_phase' ? '1 fase' : 'instantánea',
    cost: challenge.purchase_cost, startedAt: dateLabel(challenge.started_on), startedOn: challenge.started_on, status, phaseProgress: percent, phaseTarget, realizedPnl: pnl,
    tradeCount: progress?.closed_trade_count ?? 0, winRate: null, payouts, activePhaseId: progress?.phase_id ?? null,
  }
}

function dateLabel(value: string): string { return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) }
function curveFromChallenges(items: FundedChallenge[]) {
  let balance = STARTING_BANKROLL
  return [...items].sort((a, b) => (a.startedOn ?? '').localeCompare(b.startedOn ?? '')).map((item) => ({ label: item.startedAt, value: balance += item.payouts - item.cost }))
}

function SummaryStrip({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'gain' | 'loss' }) {
  const color = tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : 'text-text-primary'
  return <div className="bg-panel px-4 py-3.5"><p className="label-mono text-[9px]">{label}</p><p className={`num mt-1 text-[13px] font-bold ${color}`}>{value}</p></div>
}

function TimingFact({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-lg border border-hairline bg-ink/30 px-4 py-3.5"><dt className="label-mono text-[9px]">{label}</dt><dd className="num mt-2 text-[24px] font-bold leading-none text-text-primary">{value}</dd><p className="mt-2 font-body text-[11px] text-text-faint">{hint}</p></div>
}

function InsightFact({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'gain' | 'loss' }) {
  return <div className="flex items-baseline justify-between gap-4"><div><dt className="label-mono text-[9px]">{label}</dt><dd className={`num mt-1 text-[18px] font-bold ${tone === 'gain' ? 'text-gain' : 'text-loss'}`}>{value}</dd></div><p className="max-w-32 text-right font-body text-[11px] text-text-faint">{detail}</p></div>
}
