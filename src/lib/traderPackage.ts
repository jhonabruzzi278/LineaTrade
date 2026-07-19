// "Convierte la IA en tu trader" — arma el paquete descargable (plan +
// prompt + CSV de precios si aplica) y lo empaqueta en un .zip. Todo corre en
// el cliente: el plan ya está en memoria (calculado por traderPlanEngine.ts,
// sin LLM) y el CSV sale de Binance directo desde el navegador (ver
// binancePriceHistory.ts) — no hace falta una Edge Function para esto.
import JSZip from 'jszip'
import {
  ARCHETYPE_LABELS,
  INSTRUMENT_CATEGORY_LABELS,
  STYLE_LABELS,
  type TraderPlan,
} from './traderPlanEngine'
import { fetchDailyPriceHistory, priceHistoryToCsv } from './binancePriceHistory'

function levelLabel(level: TraderPlan['level']): string {
  if (level === 'principiante') return 'Principiante'
  if (level === 'intermedio') return 'Intermedio'
  return 'Avanzado'
}

function buildPlanMarkdown(plan: TraderPlan): string {
  const redFlagLines =
    plan.redFlags.length > 0 ? plan.redFlags.map((f) => `- ${f}`) : ['Sin señales de alerta críticas en tu perfil.']

  return [
    '# Tu plan de trading',
    '',
    '_Generado de forma determinista por el test de perfil de LineaTrade. Define el CÓMO operar',
    '(estilo, instrumento, riesgo, expectativas) — no es la estrategia concreta, eso lo diseña tu IA',
    'en el siguiente paso con este mismo documento._',
    '',
    '## Cómo debes operar',
    '',
    `- **Nivel:** ${levelLabel(plan.level)}`,
    `- **Estilo:** ${STYLE_LABELS[plan.style]}`,
    `- **Arquetipo de estrategia:** ${ARCHETYPE_LABELS[plan.archetype]}`,
    `- **Instrumento recomendado:** ${plan.recommendedInstrument} (${INSTRUMENT_CATEGORY_LABELS[plan.instrumentCategory]})`,
    '',
    '## Gestión del riesgo',
    '',
    `- **Riesgo por operación:** ${plan.riskPerTradePercent}% del capital. Tamaño = riesgo% ÷ distancia al stop.`,
    `- **Ratio riesgo:beneficio:** 1:${plan.riskRewardRatio}.`,
    `- **Apalancamiento máximo:** 1:${plan.maxLeverage} (techo, no objetivo).`,
    `- **Pérdida semanal máxima:** ${plan.maxWeeklyLossMultiple}× tu riesgo por operación.`,
    '',
    '## Qué esperar',
    '',
    `- **Win rate mínimo viable:** ${plan.minViableWinRatePercent}%.`,
    `- **Expectativa en tu suelo:** ${plan.floorExpectancyR > 0 ? '+' : ''}${plan.floorExpectancyR}R.`,
    `- **Objetivo mensual realista:** ${plan.realisticMonthlyReturnRange[0]}–${plan.realisticMonthlyReturnRange[1]}%. No es un suelo garantizado, es el techo razonable para tu perfil.`,
    '',
    '## Rutina operativa',
    '',
    ...plan.operatingRoutine.map((step) => `- ${step}`),
    '',
    '## Tus señales de alerta',
    '',
    ...redFlagLines,
    '',
    '---',
    '',
    '_Herramienta educativa. No es asesoramiento financiero. El trading conlleva un riesgo elevado de pérdida y puedes perder tu capital._',
    '',
  ].join('\n')
}

function buildPromptMarkdown(plan: TraderPlan, csvFilename: string | null): string {
  const instrumentLine = csvFilename
    ? `Te adjunto mi plan de trading (\`plan-de-trading.md\`) y un CSV con precios históricos reales OHLCV de ${plan.recommendedInstrument} en temporalidad diaria (\`${csvFilename}\`). Usa el CSV como fuente de datos.`
    : `Te adjunto mi plan de trading (\`plan-de-trading.md\`). No incluyo un CSV de precios — LineaTrade todavía no tiene una fuente gratuita para ${INSTRUMENT_CATEGORY_LABELS[plan.instrumentCategory]}; exporta tú el histórico desde TradingView u otra fuente y añádelo a esta conversación antes de pedir el backtest.`

  const backtestStep = csvFilename
    ? [
        '2. Backtéstala en Python sobre el CSV adjunto: ordénalo por fecha ascendente primero, simula operación a operación sin mirar al futuro (usa solo información disponible hasta el cierre de cada vela), aplica costes realistas (spread + comisión — si no tienes el dato exacto, usa ~0,04% por lado y dilo) y position sizing por el riesgo indicado arriba.',
        '3. Divide los datos en un tramo de ajuste (~70% inicial) y un tramo de validación fuera de muestra (~30% final, datos que la estrategia no vio). Muéstrame las métricas reales de una ejecución real (nº de operaciones, win rate, expectativa en R, profit factor, drawdown máximo) de ambos tramos.',
        '4. Dime en una línea si la estrategia queda VALIDADA, NO VALIDADA o DUDOSA según el tramo fuera de muestra, antes de darme cualquier código. Si no está validada, dime qué falló en vez de forzar el resultado.',
        '5. Solo si está validada, dame el código en PineScript v6 (`strategy(...)`, no `indicator`) para TradingView, comentado y listo para pegar sin errores de compilación.',
      ]
    : [
        '2. Cuando te pase el histórico de precios, backtéstala en Python: ordénalo por fecha ascendente, simula operación a operación sin mirar al futuro, aplica costes realistas y position sizing por el riesgo indicado arriba, y divide los datos en ajuste (~70%) y validación fuera de muestra (~30%).',
        '3. Dime en una línea si la estrategia queda VALIDADA, NO VALIDADA o DUDOSA según el tramo fuera de muestra, antes de darme cualquier código.',
        '4. Solo si está validada, dame el código en PineScript v6 (`strategy(...)`, no `indicator`) para TradingView, comentado y listo para pegar.',
      ]

  return [
    '# Prompt para tu IA (ChatGPT, Claude...)',
    '',
    'Copia el bloque de abajo en tu IA junto con los archivos de este paquete.',
    '',
    '---',
    '',
    'Actúa como un trader cuantitativo senior con un entorno de ejecución de código (Python).',
    instrumentLine,
    '',
    'Mi plan (respétalo, es innegociable):',
    `- Estilo: ${STYLE_LABELS[plan.style]}.`,
    `- Instrumento: ${plan.recommendedInstrument} (${INSTRUMENT_CATEGORY_LABELS[plan.instrumentCategory]}).`,
    `- Arquetipo de estrategia: ${ARCHETYPE_LABELS[plan.archetype]} — la estrategia DEBE ser de este tipo.`,
    `- Riesgo por operación: ${plan.riskPerTradePercent}% del capital. Tamaño = riesgo% ÷ distancia al stop.`,
    `- Ratio riesgo:beneficio: 1:${plan.riskRewardRatio}. Apalancamiento máximo 1:${plan.maxLeverage}.`,
    `- Win rate mínimo viable: ${plan.minViableWinRatePercent}%. Si tu backtest no lo supera en el tramo fuera de muestra, dímelo claramente.`,
    '',
    'Con esto:',
    '1. Diseña UNA estrategia con reglas exactas de entrada, stop loss y take profit, del arquetipo indicado, atada a mi riesgo y mi R:R.',
    ...backtestStep,
    '',
    'Al final, recuérdame que el backtest es histórico y no garantiza el futuro, que haga forward testing en cuenta demo antes de arriesgar dinero real, y que el riesgo de sobreajuste crece cuantos más parámetros ajustes.',
    '',
    '---',
    '',
    '_Este archivo es un punto de partida honesto, no una instrucción oculta: tú decides qué IA usar y qué hacer con su respuesta._',
    '',
  ].join('\n')
}

export interface TraderPackageResult {
  blob: Blob
  filename: string
  includedCsv: boolean
}

export async function buildTraderPackage(plan: TraderPlan): Promise<TraderPackageResult> {
  const zip = new JSZip()
  zip.file('plan-de-trading.md', buildPlanMarkdown(plan))

  let csvFilename: string | null = null
  if (plan.instrumentCategory === 'cripto') {
    try {
      const candles = await fetchDailyPriceHistory(plan.recommendedInstrument)
      if (candles.length > 0) {
        csvFilename = `precios-${plan.recommendedInstrument.replace('/', '')}-D1.csv`
        zip.file(csvFilename, priceHistoryToCsv(candles))
      }
    } catch {
      // Si Binance falla, se entrega el paquete igual sin el CSV — mejor
      // plan + prompt que fallar toda la descarga por un proveedor externo caído.
      csvFilename = null
    }
  }

  zip.file('LEEME.md', buildPromptMarkdown(plan, csvFilename))

  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, filename: 'lineatrade-plan-ia-trader.zip', includedCsv: csvFilename !== null }
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
