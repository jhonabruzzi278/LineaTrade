import { supabase } from './supabase'
import type { Database } from '../types/database'

export type ImageStage = Database['public']['Tables']['trade_images']['Row']['stage']

const SIGNED_URL_TTL_SECONDS = 3600
const MAX_FILE_BYTES = 5 * 1024 * 1024

// Convención de path documentada en docs/trade-journal-os-schema.md §6:
// {user_id}/{trade_id}/{stage}_{filename} — coincide con la policy de Storage
// (storage.foldername(name))[1] = auth.uid()::text.
export async function uploadTradeImage(
  file: File,
  userId: string,
  tradeId: string,
  stage: ImageStage,
) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('La imagen no puede superar 5MB.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se aceptan imágenes.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${tradeId}/${stage}_${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage.from('trade-images').upload(path, file)
  if (uploadError) throw uploadError

  const { data, error: insertError } = await supabase
    .from('trade_images')
    .insert({ trade_id: tradeId, stage, storage_path: path })
    .select('*')
    .single()
  if (insertError) throw insertError

  return data
}

// El bucket es privado — no hay URL pública, cada imagen necesita una URL firmada
// (expira, así que no se guarda, se regenera al cargar la página).
export async function getSignedImageUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('trade-images')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error) return null
  return data.signedUrl
}
