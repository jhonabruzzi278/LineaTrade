import { supabase } from './supabase'
import { getFunctionErrorMessage } from './errors'

// Espejo de supabase/functions/_shared/extractionValidator.ts — se duplica
// porque no hay forma de compartir el tipo entre el bundle de Vite y el
// runtime Deno del Edge Function (mismo patrón que aiAnalysis.ts).
export interface ExtractedTradeData {
  market: 'stock' | 'options' | 'forex' | 'crypto' | 'futures' | 'index' | 'cfd' | null
  symbol: string | null
  action: 'long' | 'short' | null
  option_type: 'call' | 'put' | null
  strike_price: number | null
  expiration_date: string | null
  date: string | null
  time: string | null
  quantity: number | null
  price: number | null
  commission: number | null
  order_number: string | null
  order_placed_time: string | null
  price_type: 'market' | 'limit' | null
  limit_price: number | null
  bid_price: number | null
  ask_price: number | null
  term: string | null
  all_or_none: boolean | null
}

export type ExtractTradeImageResult =
  | { ok: true; data: ExtractedTradeData }
  | { ok: false; message: string }

const MAX_FILE_BYTES = 5 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      // readAsDataURL devuelve "data:<mime>;base64,<datos>" — solo mandamos
      // la parte de datos, el mime va aparte y ya lo tenemos de file.type.
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

// Sube nada — la imagen se manda directo en el body del Edge Function como
// base64, no pasa por Storage. Es un input transitorio para la extracción,
// no una evidencia que el producto necesite conservar (a diferencia de
// trade_images, que sí son permanentes a propósito).
export async function extractTradeFromImage(file: File): Promise<ExtractTradeImageResult> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: 'La imagen no puede superar 5MB.' }
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, message: 'Solo se aceptan imágenes.' }
  }

  const base64 = await fileToBase64(file)
  const { data, error } = await supabase.functions.invoke<ExtractedTradeData>('extract-trade-image', {
    body: { image_base64: base64, image_mime_type: file.type },
  })

  if (error) {
    const message = await getFunctionErrorMessage(error)
    return { ok: false, message }
  }
  if (!data) {
    return { ok: false, message: 'El Edge Function no devolvió datos.' }
  }
  return { ok: true, data }
}
