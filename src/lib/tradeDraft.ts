import { emptyOrderTicket, type OrderTicketData } from '../components/trade/OrderTicketFields'
import type { ExtractedTradeData } from './tradeImageExtraction'
import { isValidDateString, isValidTimeString } from './tradeDisplay'

// Datos técnicos del trade mientras se captura en «Nuevo trade». Todo en string
// (valor de los inputs); la conversión a número se hace recién al guardar.
export interface TechnicalEntryData {
  photoAttached: boolean
  market: string
  symbol: string
  timeframe: string
  action: 'long' | 'short'
  date: string
  time: string
  quantity: string
  price: string
  stopLoss: string
  takeProfit: string
  riskPercent: string
  commission: string
  optionType: 'call' | 'put'
  strikePrice: string
  expirationDate: string
  orderTicket: OrderTicketData
}

// Usa componentes de fecha locales, no toISOString() (que convierte a UTC y
// puede adelantar un día cerca de medianoche en husos horarios negativos).
export function localDateString(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function localTimeString(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function emptyTechnicalEntry(now: Date = new Date()): TechnicalEntryData {
  return {
    photoAttached: false,
    market: '',
    symbol: '',
    timeframe: '',
    action: 'long',
    date: localDateString(now),
    time: localTimeString(now),
    quantity: '',
    price: '',
    stopLoss: '',
    takeProfit: '',
    riskPercent: '',
    commission: '',
    optionType: 'call',
    strikePrice: '',
    expirationDate: '',
    orderTicket: emptyOrderTicket,
  }
}

function toText(value: number | null | undefined, fallback: string): string {
  return value != null ? String(value) : fallback
}

// Vuelca lo que extrajo la IA sobre el borrador. Un valor nulo conserva lo que ya
// había; fechas y horas se validan por forma antes de pisar el default (el prompt
// pide YYYY-MM-DD / HH:MM pero no está forzado por schema: un formato distinto
// renderizaría vacío en el input nativo y recién fallaría al guardar).
export function mergeExtraction(data: TechnicalEntryData, extracted: ExtractedTradeData): TechnicalEntryData {
  return {
    ...data,
    photoAttached: true,
    market: extracted.market ?? data.market,
    symbol: extracted.symbol ?? data.symbol,
    action: extracted.action ?? data.action,
    optionType: extracted.option_type ?? data.optionType,
    strikePrice: toText(extracted.strike_price, data.strikePrice),
    expirationDate:
      extracted.expiration_date && isValidDateString(extracted.expiration_date) ? extracted.expiration_date : data.expirationDate,
    date: extracted.date && isValidDateString(extracted.date) ? extracted.date : data.date,
    time: extracted.time && isValidTimeString(extracted.time) ? extracted.time : data.time,
    quantity: toText(extracted.quantity, data.quantity),
    price: toText(extracted.price, data.price),
    commission: toText(extracted.commission, data.commission),
    orderTicket: {
      orderNumber: extracted.order_number ?? data.orderTicket.orderNumber,
      orderPlacedTime: extracted.order_placed_time ?? data.orderTicket.orderPlacedTime,
      priceType: extracted.price_type ?? data.orderTicket.priceType,
      limitPrice: toText(extracted.limit_price, data.orderTicket.limitPrice),
      bidPrice: toText(extracted.bid_price, data.orderTicket.bidPrice),
      askPrice: toText(extracted.ask_price, data.orderTicket.askPrice),
      term: extracted.term ?? data.orderTicket.term,
      allOrNone: extracted.all_or_none ?? data.orderTicket.allOrNone,
    },
  }
}

/** ¿Están los datos mínimos para guardar? (opciones exige además strike y vencimiento). */
export function hasRequiredTechnicalFields(data: TechnicalEntryData): boolean {
  const hasCore = Boolean(data.market && data.symbol && data.quantity && data.price)
  if (data.market === 'options') return hasCore && Boolean(data.strikePrice && data.expirationDate)
  return hasCore
}
