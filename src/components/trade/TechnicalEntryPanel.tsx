import type { ReactNode } from 'react'
import { BuyIcon, SellIcon } from '../icons/TradeIcons'
import { OrderTicketFields, type OrderTicketData } from './OrderTicketFields'
import { parseTradesCsv, type ParsedTradeRow } from '../../lib/tradeImport'

export interface TechnicalEntryData {
  method: 'manual' | 'file'
  market: string
  symbol: string
  action: 'long' | 'short'
  date: string
  time: string
  quantity: string
  price: string
  stopLoss: string
  commission: string
  fileName: string
  optionType: 'call' | 'put'
  strikePrice: string
  expirationDate: string
  orderTicket: OrderTicketData
  importedRows: ParsedTradeRow[]
  importErrors: string[]
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
  const isOptions = data.market === 'options'

  function set<K extends keyof TechnicalEntryData>(key: K, value: TechnicalEntryData[K]) {
    onChange({ ...data, [key]: value })
  }

  function handleFileSelected(file: File | undefined) {
    if (!file) {
      onChange({ ...data, fileName: '', importedRows: [], importErrors: [] })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const { rows, errors } = parseTradesCsv(text)
      onChange({ ...data, fileName: file.name, importedRows: rows, importErrors: errors })
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ animation: 'reveal 0.25s ease-out' }}>
      <div className="flex gap-2 mb-6 border-b border-hairline">
        <TabButton active={data.method === 'file'} onClick={() => set('method', 'file')}>
          Subir archivo
        </TabButton>
        <TabButton active={data.method === 'manual'} onClick={() => set('method', 'manual')}>
          Agregar manualmente
        </TabButton>
      </div>

      {data.method === 'file' ? (
        <div className="space-y-4">
          <label
            htmlFor="trade-file"
            className="flex flex-col items-center justify-center gap-2 border border-dashed border-hairline rounded-sm py-10 px-4 text-center cursor-pointer hover:border-text-faint transition-colors"
          >
            <span className="font-body text-[14px] text-text-muted">
              {data.fileName || 'Arrastra un archivo o haz clic para subirlo desde tu computador'}
            </span>
            <span className="font-mono text-[11px] text-text-faint">
              CSV con el mismo formato que "Exportar CSV" en Historial
            </span>
            <input
              id="trade-file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
          </label>

          {data.fileName && data.importErrors.length === 0 && data.importedRows.length > 0 && (
            <p className="font-body text-[13px] text-signal">
              {data.importedRows.length} trade{data.importedRows.length === 1 ? '' : 's'} listo
              {data.importedRows.length === 1 ? '' : 's'} para importar.
            </p>
          )}
          {data.importErrors.length > 0 && (
            <div className="border border-hairline rounded-sm bg-panel px-4 py-3 space-y-1">
              {data.importErrors.map((error, i) => (
                <p key={i} className="font-body text-[13px] text-red-400">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-1 pb-3 -mb-px font-body text-[14px] border-b-2 transition-colors ${
        active ? 'border-signal text-text-primary' : 'border-transparent text-text-faint hover:text-text-muted'
      }`}
    >
      {children}
    </button>
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
