export type FundedProfile = 'custom' | 'two-phase-8-5' | 'two-phase-10-5' | 'one-step-eod-6-4' | 'one-step-eod-10-6' | 'futures-trailing-6-3'
export type DrawdownType = 'static' | 'end-of-day' | 'trailing'

export interface FundedRules {
  label: string
  phaseOneTarget: number
  phaseTwoTarget: number | null
  dailyLossPercent: number | null
  maxLossPercent: number
  drawdownType: DrawdownType
  consistencyPercent: number | null
  minimumDays: number | null
}

export const FUNDED_PROFILES: Record<FundedProfile, FundedRules | null> = {
  custom: null,
  'two-phase-8-5': {
    label: 'Evaluación 2 fases · 8% + 5%',
    phaseOneTarget: 8,
    phaseTwoTarget: 5,
    dailyLossPercent: 5,
    maxLossPercent: 10,
    drawdownType: 'static',
    consistencyPercent: null,
    minimumDays: null,
  },
  'two-phase-10-5': {
    label: 'Evaluación 2 fases · 10% + 5%',
    phaseOneTarget: 10,
    phaseTwoTarget: 5,
    dailyLossPercent: 5,
    maxLossPercent: 10,
    drawdownType: 'static',
    consistencyPercent: null,
    minimumDays: 4,
  },
  'one-step-eod-6-4': {
    label: 'Evaluación 1 fase · 6% / EOD 4%',
    phaseOneTarget: 6,
    phaseTwoTarget: null,
    dailyLossPercent: null,
    maxLossPercent: 4,
    drawdownType: 'end-of-day',
    consistencyPercent: null,
    minimumDays: null,
  },
  'one-step-eod-10-6': {
    label: 'Evaluación 1 fase · 10% / diario 3% / total 6%',
    phaseOneTarget: 10,
    phaseTwoTarget: null,
    dailyLossPercent: 3,
    maxLossPercent: 6,
    drawdownType: 'end-of-day',
    consistencyPercent: 50,
    minimumDays: null,
  },
  'futures-trailing-6-3': {
    label: 'Futuros · objetivo 6% / trailing 3%',
    phaseOneTarget: 6,
    phaseTwoTarget: null,
    dailyLossPercent: 2,
    maxLossPercent: 3,
    drawdownType: 'trailing',
    consistencyPercent: 55,
    minimumDays: null,
  },
}

export const FUNDED_ACCOUNT_SIZES = [10_000, 20_000, 25_000, 50_000, 100_000, 150_000, 200_000] as const

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function drawdownTypeLabel(type: DrawdownType): string {
  switch (type) {
    case 'static': return 'Estático'
    case 'end-of-day': return 'EOD · fin del día'
    case 'trailing': return 'Trailing · móvil'
  }
}
