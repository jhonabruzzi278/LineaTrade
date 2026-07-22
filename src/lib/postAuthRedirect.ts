import { supabase } from './supabase'
import { hasPendingQuizAnswers } from './traderQuizStorage'

// Punto único de "a dónde manda la app a un usuario ya autenticado" — lo usan
// Login.tsx (tras signInWithPassword) y Landing.tsx (cuando detecta una sesión
// ya activa, p. ej. al volver del enlace de confirmación de email en la APK).
// Mismo criterio en los dos lugares: encuesta de trader pendiente > onboarding
// sin terminar > dashboard.
export async function resolvePostAuthPath(userId: string): Promise<string> {
  if (hasPendingQuizAnswers()) {
    return '/ia-trader'
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', userId)
    .single()
  if (error) throw error
  return profile.onboarding_done ? '/dashboard' : '/onboarding'
}
