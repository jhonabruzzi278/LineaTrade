import { AuthApiError } from '@supabase/supabase-js'

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
