import { useState, type ReactNode } from 'react'
import { BuyIcon, SellIcon } from '../icons/TradeIcons'
import { CameraIcon } from '../icons/NavIcons'
import { OrderTicketFields, type OrderTicketData } from './OrderTicketFields'
import { extractTradeFromImage } from '../../lib/tradeImageExtraction'
import { useToast } from '../../lib/toast'

export interface TechnicalEntryData {
  photoAttached: boolean
  market: string
  symbol: string
  action: 'long' | 'short'
  date: string
  time: string
  quantity: string
  price: string
  stopLoss: string
  commission: string
  optionType: 'call' | 'put'
  strikePrice: string
  expirationDate: string
  orderTicket: OrderTicketData
}

interface TechnicalEntryPanelProps {
  data: TechnicalEntryData
  onChange: (next: TechnicalEntryData) => void
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

const inputClasses =
  'w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors'

export function TechnicalEntryPanel({ data, onChange }: TechnicalEntryPanelProps) {
  const { showToast } = useToast()
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const isOptions = data.market === 'options'

  function set<K extends keyof TechnicalEntryData>(key: K, value: TechnicalEntryData[K]) {
    onChange({ ...data, [key]: value })
  }

  async function handlePhotoSelected(file: File | undefined) {
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoLoading(true)
    setPhotoError('')
    const result = await extractTradeFromImage(file)
    setPhotoLoading(false)
    if (!result.ok) {
      // Aun si la IA no pudo leer la imagen, la foto ya cuenta como adjunta —
      // el usuario completa los campos a mano, pero no vuelve al dropzone.
      setPhotoError(result.message)
      onChange({ ...data, photoAttached: true })
      return
    }
    const extracted = result.data
    onChange({
      ...data,
      photoAttached: true,
      market: extracted.market ?? data.market,
      symbol: extracted.symbol ?? data.symbol,
      action: extracted.action ?? data.action,
      optionType: extracted.option_type ?? data.optionType,
      strikePrice: extracted.strike_price != null ? String(extracted.strike_price) : data.strikePrice,
      expirationDate: extracted.expiration_date ?? data.expirationDate,
      date: extracted.date ?? data.date,
      time: extracted.time ?? data.time,
      quantity: extracted.quantity != null ? String(extracted.quantity) : data.quantity,
      price: extracted.price != null ? String(extracted.price) : data.price,
      commission: extracted.commission != null ? String(extracted.commission) : data.commission,
      orderTicket: {
        orderNumber: extracted.order_number ?? data.orderTicket.orderNumber,
        orderPlacedTime: extracted.order_placed_time ?? data.orderTicket.orderPlacedTime,
        priceType: extracted.price_type ?? data.orderTicket.priceType,
        limitPrice: extracted.limit_price != null ? String(extracted.limit_price) : data.orderTicket.limitPrice,
        bidPrice: extracted.bid_price != null ? String(extracted.bid_price) : data.orderTicket.bidPrice,
        askPrice: extracted.ask_price != null ? String(extracted.ask_price) : data.orderTicket.askPrice,
        term: extracted.term ?? data.orderTicket.term,
        allOrNone: extracted.all_or_none ?? data.orderTicket.allOrNone,
      },
    })
    showToast('Datos extraídos de la foto — revisalos antes de guardar.', 'success')
  }

  return (
    <div style={{ animation: 'reveal 0.25s ease-out' }}>
      {!data.photoAttached ? (
        <div className="space-y-4">
          <label
            htmlFor="trade-photo"
            className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed border-hairline rounded-sm py-14 px-4 text-center overflow-hidden transition-colors ${
              photoLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-signal/50 hover:bg-panel-2/30'
            }`}
          >
            <div className="hero-aura left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[220px] h-[160px]" aria-hidden="true" />
            <span className="relative w-12 h-12 rounded-full bg-signal/10 border border-signal/30 flex items-center justify-center text-signal">
              <CameraIcon className="w-5 h-5" />
            </span>
            <span className="relative font-body text-[14px] text-text-primary">
              {photoLoading ? 'Leyendo la imagen con IA...' : 'Sacá una foto o subí la captura de tu bróker'}
            </span>
            <span className="relative font-mono text-[11px] text-text-faint">
              La IA pre-llena el formulario — vos lo revisás antes de guardar
            </span>
            <input
              id="trade-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={photoLoading}
              onChange={(e) => void handlePhotoSelected(e.target.files?.[0])}
            />
          </label>
          {photoError && <p className="font-body text-[13px] text-red-400">{photoError}</p>}
        </div>
      ) : (
        <div className="space-y-5 reveal-up">
          <div className="flex items-center gap-3 border border-hairline rounded-sm bg-panel-2/60 px-3 py-2.5">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-10 h-10 rounded-sm object-cover border border-hairline shrink-0" />
            ) : (
              <span className="w-10 h-10 rounded-sm bg-signal/10 border border-signal/30 flex items-center justify-center text-signal shrink-0">
                <CameraIcon className="w-4 h-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-body text-[13px] text-text-primary">Foto adjunta</p>
              <p className="font-mono text-[11px] text-text-faint">revisá y completá los datos</p>
            </div>
          </div>

          {photoError && (
            <p className="font-body text-[13px] text-red-400">
              No pudimos leer la imagen automáticamente — completá los campos a mano.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Mercado">
              <select value={data.market} onChange={(e) => set('market', e.target.value)} className={inputClasses}>
                <option value="" disabled>
                  Selecciona
                </option>
                {marketOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Símbolo">
              <input
                type="text"
                value={data.symbol}
                onChange={(e) => set('symbol', e.target.value.toUpperCase())}
                placeholder="Ej. EURUSD"
                className={inputClasses}
              />
            </Field>
          </div>

          <Field label="Acción">
            <div className="flex gap-3">
              <SegmentButton active={data.action === 'long'} onClick={() => set('action', 'long')}>
                <BuyIcon className="w-4 h-4" />
                Compra (long)
              </SegmentButton>
              <SegmentButton active={data.action === 'short'} onClick={() => set('action', 'short')}>
                <SellIcon className="w-4 h-4" />
                Venta (short)
              </SegmentButton>
            </div>
          </Field>

          {isOptions && (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Tipo">
                <div className="flex gap-2">
                  <SegmentButton active={data.optionType === 'call'} onClick={() => set('optionType', 'call')}>
                    Call
                  </SegmentButton>
                  <SegmentButton active={data.optionType === 'put'} onClick={() => set('optionType', 'put')}>
                    Put
                  </SegmentButton>
                </div>
              </Field>
              <Field label="Strike">
                <input
                  type="number"
                  step="0.01"
                  value={data.strikePrice}
                  onChange={(e) => set('strikePrice', e.target.value)}
                  placeholder="0.00"
                  className={inputClasses}
                />
              </Field>
              <Field label="Vencimiento">
                <input
                  type="date"
                  value={data.expirationDate}
                  onChange={(e) => set('expirationDate', e.target.value)}
                  className={inputClasses}
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha">
              <input
                type="date"
                value={data.date}
                onChange={(e) => set('date', e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Hora">
              <input
                type="time"
                value={data.time}
                onChange={(e) => set('time', e.target.value)}
                className={inputClasses}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label={isOptions ? 'Contratos' : 'Cantidad'}>
              <input
                type="number"
                step="0.01"
                value={data.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="0.00"
                className={inputClasses}
              />
            </Field>
            <Field label={isOptions ? 'Prima por acción' : 'Precio'}>
              <input
                type="number"
                step="0.001"
                value={data.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0.000"
                className={inputClasses}
              />
              {isOptions && (
                <p className="font-mono text-[11px] text-text-faint mt-1.5">
                  Por acción, no por contrato — se multiplica ×100 automáticamente.
                </p>
              )}
            </Field>
            <Field label="Comisiones y fees">
              <input
                type="number"
                step="0.01"
                value={data.commission}
                onChange={(e) => set('commission', e.target.value)}
                placeholder="0.00"
                className={inputClasses}
              />
            </Field>
          </div>

          <Field label="Stop loss (opcional)">
            <input
              type="number"
              step="0.001"
              value={data.stopLoss}
              onChange={(e) => set('stopLoss', e.target.value)}
              placeholder="0.000"
              className={inputClasses}
            />
            <p className="font-mono text-[11px] text-text-faint mt-1.5">
              Define tu R — sin esto no podemos calcular el rendimiento en R al cerrar el trade.
            </p>
          </Field>

          <OrderTicketFields data={data.orderTicket} onChange={(orderTicket) => set('orderTicket', orderTicket)} />
        </div>
      )}
    </div>
  )
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-sm border font-body text-[14px] transition-colors ${
        active
          ? 'border-signal bg-signal/10 text-text-primary'
          : 'border-hairline bg-panel text-text-muted hover:border-text-faint'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="font-body text-[13px] text-text-muted block mb-2">{label}</label>
      {children}
    </div>
  )
}
