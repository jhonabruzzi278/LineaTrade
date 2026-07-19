import { supabase } from './supabase'

const MAX_FILE_BYTES = 5 * 1024 * 1024

// Bucket "avatars" es público — a diferencia de trade-images, la URL no se firma:
// se guarda directo en profiles.avatar_url. Path fijo {userId}/avatar (upsert),
// así una foto nueva siempre reemplaza la anterior en vez de acumular archivos.
// El querystring ?v=<timestamp> es cache-busting: el path no cambia entre subidas,
// así que sin esto el navegador seguiría mostrando la imagen vieja cacheada.
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('La imagen no puede superar 5MB.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se aceptan imágenes.')
  }

  const path = `${userId}/avatar`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
  if (updateError) throw updateError

  return avatarUrl
}
