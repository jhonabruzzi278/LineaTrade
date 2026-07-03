import { AuthApiError, FunctionsHttpError } from '@supabase/supabase-js'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu correo antes de ingresar — revisa tu bandeja de entrada.',
  'User already registered': 'Ya existe una cuenta con este correo.',
  'Password should be at least 6 characters': 'La contraseña necesita al menos 6 caracteres.',
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) {
    return AUTH_ERROR_MESSAGES[error.message] ?? error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

// Separada de getErrorMessage (que es síncrona) a propósito: el cuerpo JSON de
// un error de Edge Function vive en error.context, que es un Response — leerlo
// requiere await. Forzar getErrorMessage a ser async rompería todos sus call
// sites existentes, así que esta es una función nueva, no una migración de la
// anterior. Usar solo para errores de supabase.functions.invoke().
export async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      // el body no era JSON — cae al mensaje genérico de abajo
    }
  }
  return getErrorMessage(error)
}
