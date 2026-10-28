export type FundedChallengeStatus = 'phase_one' | 'phase_two' | 'funded' | 'burned'

export interface FundedChallenge {
  id: string
  firm: string
  accountLabel: string
  accountSize: number
  evaluationType: '2 fases' | '1 fase' | 'instantánea'
  cost: number
  startedAt: string
  startedOn?: string
  status: FundedChallengeStatus
  phaseProgress: number
  phaseTarget: number
  realizedPnl: number
  tradeCount: number
  winRate: number | null
  payouts: number
  /** Fase activa en `funding_challenge_phases` para vincular un nuevo trade. */
  activePhaseId?: string | null
  phaseOnePassedAt?: string
  fundedAt?: string
  rules?: {
    phaseOneTarget: number
    phaseTwoTarget: number | null
    dailyDrawdown: number | null
    maxDrawdown: number
    minimumDays: number
    consistency: number | null
    newAccountForPhaseTwo: boolean
    notes: string | null
  }
}

export const FUNDED_STATUS_COPY: Record<FundedChallengeStatus, { label: string; className: string }> = {
  phase_one: { label: 'Fase 1', className: 'border-signal/40 bg-signal/10 text-steel' },
  phase_two: { label: 'Fase 2', className: 'border-spark/45 bg-spark/10 text-spark' },
  funded: { label: 'Fondeada', className: 'border-gain/40 bg-gain/10 text-gain' },
  burned: { label: 'Quemada', className: 'border-loss/40 bg-loss/10 text-loss' },
}

