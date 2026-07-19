// "Convierte la IA en tu trader" — handoff del teaser público al login. Un
// visitante sin sesión completa el quiz, ve el teaser tapado y se registra;
// guardamos sus respuestas (no el plan, se recalcula tras loguear) en
// sessionStorage para que Login.tsx pueda mandarlo de vuelta a /ia-trader y
// terminar el flujo sin repetir las 19 preguntas.
const STORAGE_KEY = 'lineatrade_trader_quiz_answers'

export function saveQuizAnswers(answers: Record<string, string>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
  } catch {
    // sessionStorage puede fallar (modo privado, cuota) — no es crítico, el
    // usuario simplemente repetirá el test tras registrarse.
  }
}

export function hasPendingQuizAnswers(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function loadAndClearQuizAnswers(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return null
  }
}
