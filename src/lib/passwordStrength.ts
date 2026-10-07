// Indicador orientativo de fortaleza de contraseña para las pantallas de
// acceso. NO reemplaza la regla real de Signup/ActualizarPassword (mínimo 8
// caracteres, validada al enviar): solo da retroalimentación mientras se
// escribe, sin enviar nada a ningún servidor.
export const PASSWORD_MIN_LENGTH = 8
const PASSWORD_LONG_LENGTH = 12

export type PasswordStrengthLevel = 0 | 1 | 2 | 3

export interface PasswordStrength {
  level: PasswordStrengthLevel
  label: string
  meetsMinimum: boolean
}

function countCharacterClasses(password: string): number {
  const checks = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/]
  return checks.filter((check) => check.test(password)).length
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { level: 0, label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`, meetsMinimum: false }
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { level: 0, label: `Muy corta · mínimo ${PASSWORD_MIN_LENGTH} caracteres`, meetsMinimum: false }
  }

  const isLong = password.length >= PASSWORD_LONG_LENGTH
  const isVaried = countCharacterClasses(password) >= 3

  if (isLong && isVaried) return { level: 3, label: 'Fuerte', meetsMinimum: true }
  if (isLong) return { level: 2, label: 'Bien · mezcla letras, números y símbolos para reforzarla', meetsMinimum: true }
  if (isVaried) return { level: 2, label: `Bien · usa ${PASSWORD_LONG_LENGTH}+ caracteres para una más segura`, meetsMinimum: true }
  return { level: 1, label: 'Aceptable · añade más caracteres o mezcla tipos', meetsMinimum: true }
}
