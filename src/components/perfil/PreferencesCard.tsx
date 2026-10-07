import { useEffect, useState } from 'react'
import { AccountRow, AccountSection } from '../account/AccountSection'
import { Segmented } from '../ui/segmented'
import { Switch } from '../Switch'
import { disableDailyReminder, enableDailyReminder, getDailyReminderState, type DailyReminderState } from '../../lib/pushNotifications'
import { useThemePreference, type ThemePreference } from '../../lib/theme'
import { getErrorMessage } from '../../lib/errors'
import { useToast } from '../../lib/toast'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
]

const REMINDER_HINTS: Partial<Record<DailyReminderState, string>> = {
  blocked: 'Las notificaciones están bloqueadas en este navegador. Actívalas en los ajustes del sitio para usar el recordatorio.',
  unsupported: 'Este navegador no admite notificaciones. En iPhone, instala la app en la pantalla de inicio (iOS 16.4 o superior).',
}

export function PreferencesCard({ userId }: { userId: string }) {
  const { showToast } = useToast()
  const [theme, setTheme] = useThemePreference()
  const [reminder, setReminder] = useState<DailyReminderState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDailyReminderState(userId)
      .then((state) => {
        if (!cancelled) setReminder(state)
      })
      .catch(() => {
        if (!cancelled) setReminder('unsupported')
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  async function handleReminderChange(next: boolean) {
    if (busy) return
    setBusy(true)
    try {
      if (next) {
        const state = await enableDailyReminder(userId)
        setReminder(state)
        if (state === 'on') showToast('Recordatorio diario activado.', 'success')
      } else {
        await disableDailyReminder(userId)
        setReminder('off')
        showToast('Recordatorio diario desactivado.', 'info')
      }
    } catch (error: unknown) {
      showToast(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const hint = reminder ? REMINDER_HINTS[reminder] : undefined

  return (
    <AccountSection title="Preferencias">
      <div className="flex flex-col gap-1.5">
        <span className="font-body text-[12px] font-semibold text-text-faint">Tema</span>
        <Segmented label="Tema" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </div>

      <div className="mt-3.5">
        <AccountRow
          title="Recordatorio diario"
          description={
            hint ?? 'Dos avisos al día si todavía no registraste un trade. Requiere permiso de notificaciones.'
          }
          control={
            <Switch
              hideLabel
              checked={reminder === 'on'}
              onChange={(next) => void handleReminderChange(next)}
              label="Recordatorio diario"
            />
          }
        />
      </div>
    </AccountSection>
  )
}
