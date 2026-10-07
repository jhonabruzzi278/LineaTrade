import { computeDrawdownFloors, DRAWDOWN_EXAMPLE, type DrawdownScenario } from '../../lib/drawdownFloors'

// Gráfico de la lección «Trailing, EOD y estático». Los tipos de cuenta se
// distinguen por trazo (sólido azul, rayado amarillo, punteado gris) y por
// rótulo, nunca con rojo/verde: aquí no hay ganancia ni pérdida, hay reglas.

interface ChartGeometry {
  width: number
  height: number
  firstX: number
  stepX: number
  topY: number
  bottomY: number
  gridLeft: number
  gridRight: number
  labelX: number
  dayLabelY: number
  fontSize: number
  compact: boolean
}

const DESKTOP: ChartGeometry = { width: 600, height: 260, firstX: 40, stepX: 120, topY: 20, bottomY: 240, gridLeft: 40, gridRight: 590, labelX: 2, dayLabelY: 256, fontSize: 10, compact: false }
const MOBILE: ChartGeometry = { width: 340, height: 222, firstX: 40, stepX: 72, topY: 14, bottomY: 204, gridLeft: 30, gridRight: 336, labelX: 0, dayLabelY: 219, fontSize: 9, compact: true }

const TICK_COUNT = 5

function formatBalance(value: number, compact: boolean): string {
  if (compact) return `${(value / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}k`
  return value.toLocaleString('es-MX')
}

function pathFrom(values: readonly number[], x: (index: number) => number, y: (value: number) => number): string {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(' ')
}

function FloorsSvg({ scenario, geometry, label }: { scenario: DrawdownScenario; geometry: ChartGeometry; label: string }) {
  const floors = computeDrawdownFloors(scenario)
  const { initialBalance, drawdown } = scenario
  const g = geometry

  // Eje: arranca medio drawdown por debajo del piso estático y sube en 4 pasos de 0.75 × drawdown
  // (47,000 a 53,000 en el ejemplo).
  const step = drawdown * 0.75
  const axisMin = initialBalance - drawdown * 1.5
  const axisMax = axisMin + step * (TICK_COUNT - 1)
  const x = (index: number) => g.firstX + g.stepX * index
  const y = (value: number) => g.topY + ((axisMax - value) / (axisMax - axisMin)) * (g.bottomY - g.topY)
  const ticks = Array.from({ length: TICK_COUNT }, (_, index) => axisMax - step * index)

  return (
    <svg viewBox={`0 0 ${g.width} ${g.height}`} width="100%" role="img" aria-label={label} className="block" style={{ aspectRatio: `${g.width} / ${g.height}` }}>
      {ticks.map((tick) => (
        <g key={tick}>
          <path d={`M${g.gridLeft} ${y(tick)}H${g.gridRight}`} className="stroke-hairline" />
          <text x={g.labelX} y={y(tick) + 4} fontSize={g.fontSize} className="num fill-text-faint">{formatBalance(tick, g.compact)}</text>
        </g>
      ))}
      <path d={pathFrom(floors.static, x, y)} fill="none" className="stroke-text-muted" strokeWidth={3} strokeDasharray="1 6" strokeLinecap="round" />
      <path d={pathFrom(floors.trailingEod, x, y)} fill="none" className="stroke-spark" strokeWidth={2.4} strokeDasharray="9 5" />
      <path d={pathFrom(floors.trailingIntraday, x, y)} fill="none" className="stroke-steel" strokeWidth={2.4} />
      <path d={pathFrom(floors.balance, x, y)} fill="none" className="stroke-text-primary" strokeWidth={2.8} strokeLinejoin="round" />
      {floors.balance.map((value, index) => (
        <circle key={index} cx={x(index)} cy={y(value)} r={g.compact ? 3.5 : 4} className="fill-text-primary" />
      ))}
      {floors.balance.map((_, index) => (
        <text key={index} x={x(index) - 8} y={g.dayLabelY} fontSize={g.fontSize} className="num fill-text-faint">{`día ${index}`}</text>
      ))}
    </svg>
  )
}

function Legend() {
  const items = [
    { name: 'Saldo al cierre', line: 'border-t-[3px] border-solid border-text-primary w-[14px]' },
    { name: 'Trailing intradía', line: 'border-t-[3px] border-solid border-steel w-[18px]' },
    { name: 'Trailing EOD', line: 'border-t-[3px] border-dashed border-spark w-[18px]' },
    { name: 'Estático', line: 'border-t-[3px] border-dotted border-text-muted w-[18px]' },
  ]
  return (
    <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5 font-body text-[11px] text-text-faint sm:text-[12px]">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-1.5">
          <i aria-hidden="true" className={`inline-block h-0 ${item.line}`} />
          {item.name}
        </li>
      ))}
    </ul>
  )
}

const money = (value: number) => value.toLocaleString('es-MX')

export function DrawdownFloorsChart({ scenario = DRAWDOWN_EXAMPLE }: { scenario?: DrawdownScenario }) {
  const floors = computeDrawdownFloors(scenario)
  const summary = `Gráfico: saldo al cierre y piso de drawdown trailing intradía, trailing EOD y estático durante ${scenario.days.length} días`
  const heading = `Cuenta de ${money(scenario.initialBalance)} · drawdown ${money(scenario.drawdown)} · ${scenario.days.length} días`

  return (
    <div className="rounded-xl border border-hairline bg-panel p-3.5 sm:px-5 sm:py-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="label-mono">{heading}</p>
        <div className="hidden sm:block"><Legend /></div>
      </div>
      <div className="mt-3 sm:hidden"><FloorsSvg scenario={scenario} geometry={MOBILE} label={summary} /></div>
      <div className="mt-3 hidden sm:block"><FloorsSvg scenario={scenario} geometry={DESKTOP} label={summary} /></div>
      <div className="mt-2.5 sm:hidden"><Legend /></div>
      <table className="sr-only">
        <caption>{heading}</caption>
        <thead>
          <tr><th scope="col">Día</th><th scope="col">Saldo al cierre</th><th scope="col">Piso trailing intradía</th><th scope="col">Piso trailing EOD</th><th scope="col">Piso estático</th></tr>
        </thead>
        <tbody>
          {floors.balance.map((balance, index) => (
            <tr key={index}>
              <th scope="row">{index}</th>
              <td>{money(balance)}</td>
              <td>{money(floors.trailingIntraday[index])}</td>
              <td>{money(floors.trailingEod[index])}</td>
              <td>{money(floors.static[index])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
