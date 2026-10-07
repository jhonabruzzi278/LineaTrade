import type { ReactNode } from 'react'
import { ChevronDown, ImagePlus, TrendingDown, TrendingUp } from 'lucide-react'
import { OrderTicketFields } from './OrderTicketFields'
import { Callout } from '../ui/callout'
import { Field, FIELD_CLASS } from '../ui/field'
import type { TechnicalEntryData } from '../../lib/tradeDraft'
import { cn } from '@/lib/utils'

export type { TechnicalEntryData } from '../../lib/tradeDraft'

interface TechnicalEntryPanelProps {
  data: TechnicalEntryData
  onChange: (next: TechnicalEntryData) => void
  /** URL de la miniatura de la foto adjunta. */
  photoPreview: string
  brokerName?: string
  /** Si la IA no pudo leer la foto, el motivo; null cuando la lectura funcionó. */
  readError: string | null
  onPhotoSelected: (file: File) => void
}

const marketOptions = [
  { value: 'stock', label: 'Acciones' },
  { value: 'options', label: 'Opciones' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Cripto' },
  { value: 'futures', label: 'Futuros' },
  { value: 'index', label: 'Índices' },
  { value: 'cfd', label: 'CFD' },
]

const timeframeOptions = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']

const SELECT_CLASS = cn(FIELD_CLASS, 'min-h-12 appearance-none pr-10')
const INPUT_CLASS = 'min-h-12'

// Formulario de revisión del ticket: se muestra tras leer la foto (o a mano si la
// IA no pudo). La foto sigue adjunta en ambos casos; lo que falla es solo la lectura.
export function TechnicalEntryPanel({ data, onChange, photoPreview, brokerName, readError, onPhotoSelected }: TechnicalEntryPanelProps) {
  const isOptions = data.market === 'options'

  function set<K extends keyof TechnicalEntryData>(key: K, value: TechnicalEntryData[K]) {
    onChange({ ...data, [key]: value })
  }

  const changePhoto = (
    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-input px-4 font-body text-[13px] font-bold text-text-primary transition-colors hover:border-text-faint focus-within:outline focus-within:outline-2 focus-within:outline-signal">
      {readError ? 'Probar con otra foto' : 'Cambiar foto'}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onPhotoSelected(file)
        }}
      />
    </label>
  )

  return (
    <div className="reveal-up">
      {readError ? (
        <div className="mb-4">
          <Callout tone="warning">
            <p role="alert">
              <strong className="font-bold">No pudimos leer la imagen automáticamente.</strong> Tu foto sigue adjunta; completa los
              campos y podrás continuar.
            </p>
            <p className="num mt-1.5 break-words text-[11px] opacity-80">{readError}</p>
          </Callout>
          <div className="mt-2">{changePhoto}</div>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-hairline bg-panel px-3 py-2.5 lg:mb-6 lg:px-3.5">
          {photoPreview ? (
            <img src={photoPreview} alt="Miniatura de la foto adjunta" className="h-11 w-11 shrink-0 rounded-lg border border-input object-cover lg:h-14 lg:w-14" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-input bg-panel-2 text-text-faint lg:h-14 lg:w-14">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-[13px] font-bold text-text-primary lg:text-[14px]">
              Foto adjunta{brokerName ? <span className="hidden lg:inline"> · {brokerName}</span> : null}
            </p>
            <p className="num mt-0.5 text-[11px] text-steel lg:text-[12px]">datos extraídos</p>
          </div>
          {changePhoto}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:gap-x-[18px] lg:gap-y-4">
        <SelectField id="tp-market" label="Mercado" value={data.market} onChange={(v) => set('market', v)} placeholder="Elige…">
          {marketOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <Field
          id="tp-symbol"
          label="Símbolo"
          value={data.symbol}
          onChange={(e) => set('symbol', e.target.value.toUpperCase())}
          placeholder="Ej. EURUSD"
          autoCapitalize="characters"
          className={INPUT_CLASS}
        />

        <div className="col-span-2 flex flex-col gap-1.5">
          <span id="tp-action-label" className="font-body text-[12px] font-semibold text-text-faint">
            Acción
          </span>
          <div role="radiogroup" aria-labelledby="tp-action-label" className="grid min-h-12 grid-cols-2 overflow-hidden rounded-[10px] border border-input">
            <ActionOption active={data.action === 'long'} tone="gain" onClick={() => set('action', 'long')} icon={<TrendingUp className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />}>
              Long · Compra
            </ActionOption>
            <ActionOption active={data.action === 'short'} tone="loss" onClick={() => set('action', 'short')} icon={<TrendingDown className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />}>
              Short · Venta
            </ActionOption>
          </div>
        </div>

        {isOptions && (
          <>
            <div className="flex flex-col gap-1.5">
              <span id="tp-option-label" className="font-body text-[12px] font-semibold text-text-faint">
                Tipo
              </span>
              <div role="radiogroup" aria-labelledby="tp-option-label" className="grid min-h-12 grid-cols-2 overflow-hidden rounded-[10px] border border-input">
                {(['call', 'put'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={data.optionType === kind}
                    onClick={() => set('optionType', kind)}
                    className={cn('font-body text-[14px] font-bold transition-colors', data.optionType === kind ? 'bg-signal/20 text-text-primary shadow-[inset_0_0_0_2px_var(--color-signal)]' : 'text-text-muted hover:text-text-primary')}
                  >
                    {kind === 'call' ? 'Call' : 'Put'}
                  </button>
                ))}
              </div>
            </div>
            <Field id="tp-strike" label="Strike" type="number" step="0.01" inputMode="decimal" mono value={data.strikePrice} onChange={(e) => set('strikePrice', e.target.value)} placeholder="0.00" className={INPUT_CLASS} />
            <Field id="tp-expiry" label="Vencimiento" type="date" value={data.expirationDate} onChange={(e) => set('expirationDate', e.target.value)} className={INPUT_CLASS} />
          </>
        )}

        <Field id="tp-date" label="Fecha" type="date" value={data.date} onChange={(e) => set('date', e.target.value)} className={INPUT_CLASS} />
        <Field id="tp-time" label="Hora" type="time" value={data.time} onChange={(e) => set('time', e.target.value)} className={INPUT_CLASS} />

        <Field
          id="tp-qty"
          label={isOptions ? 'Contratos' : 'Cantidad'}
          type="number"
          step="0.01"
          inputMode="decimal"
          mono
          value={data.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          placeholder="0.00"
          className={INPUT_CLASS}
        />
        <Field
          id="tp-price"
          label={isOptions ? 'Prima por acción' : 'Precio de entrada'}
          type="number"
          step="0.001"
          inputMode="decimal"
          mono
          value={data.price}
          onChange={(e) => set('price', e.target.value)}
          placeholder="0.000"
          hint={isOptions ? 'Por acción, no por contrato: se multiplica ×100 automáticamente.' : undefined}
          className={INPUT_CLASS}
        />
        <Field id="tp-fee" label="Comisiones y fees" type="number" step="0.01" inputMode="decimal" mono value={data.commission} onChange={(e) => set('commission', e.target.value)} placeholder="0.00" className={INPUT_CLASS} />

        <SelectField id="tp-timeframe" label="Temporalidad (opcional)" value={data.timeframe} onChange={(v) => set('timeframe', v)}>
          <option value="">Sin especificar</option>
          {timeframeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>

        <Field
          id="tp-sl"
          label="Stop loss (opcional)"
          type="number"
          step="0.001"
          inputMode="decimal"
          mono
          value={data.stopLoss}
          onChange={(e) => set('stopLoss', e.target.value)}
          placeholder="0.000"
          hint="Necesario para calcular el R del trade."
          className={INPUT_CLASS}
        />
        <Field id="tp-tp" label="Take profit (opcional)" type="number" step="0.001" inputMode="decimal" mono value={data.takeProfit} onChange={(e) => set('takeProfit', e.target.value)} placeholder="0.000" className={INPUT_CLASS} />
        <Field id="tp-risk" label="Riesgo % (opcional)" type="number" step="0.01" inputMode="decimal" mono value={data.riskPercent} onChange={(e) => set('riskPercent', e.target.value)} placeholder="1.00" className={INPUT_CLASS} />
      </div>

      <div className="mt-4 lg:mt-5">
        <OrderTicketFields data={data.orderTicket} onChange={(orderTicket) => set('orderTicket', orderTicket)} />
      </div>
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  placeholder,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="font-body text-[12px] font-semibold text-text-faint">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(SELECT_CLASS, !value && placeholder && 'text-text-faint')}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-faint" aria-hidden="true" />
      </div>
    </div>
  )
}

// Long/short es dirección del trade (no resultado): por eso aquí sí va verde/rojo.
function ActionOption({
  active,
  tone,
  onClick,
  icon,
  children,
}: {
  active: boolean
  tone: 'gain' | 'loss'
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  const activeClass = tone === 'gain' ? 'bg-gain/15 text-gain shadow-[inset_0_0_0_2px_var(--color-gain)]' : 'bg-loss/15 text-loss shadow-[inset_0_0_0_2px_var(--color-loss)]'
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn('flex items-center justify-center gap-1.5 font-body text-[14px] font-bold transition-colors lg:gap-2', active ? activeClass : 'text-text-muted hover:text-text-primary')}
    >
      {icon}
      {children}
    </button>
  )
}
