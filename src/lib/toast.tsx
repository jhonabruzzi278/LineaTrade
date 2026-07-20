import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: string
  type: ToastType
  message: string
  action?: ToastAction
}

interface ShowToastOptions {
  action?: ToastAction
  persistent?: boolean
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, options?: ShowToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4000

const TOAST_BORDER_CLASS: Record<ToastType, string> = {
  success: 'border-l-signal',
  error: 'border-l-loss',
  info: 'border-l-steel',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options: ShowToastOptions = {}) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, type, message, action: options.action }])
      if (!options.persistent) {
        setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
      }
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            style={{ animation: 'reveal 0.2s ease-out' }}
            className={`pointer-events-auto w-full max-w-sm flex items-start justify-between gap-3 rounded-sm border border-hairline ${TOAST_BORDER_CLASS[toast.type]} border-l-2 bg-panel px-4 py-3`}
          >
            <p className="font-body text-[13px] text-text-primary">{toast.message}</p>
            <div className="flex items-center gap-3 shrink-0">
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick()
                    dismissToast(toast.id)
                  }}
                  className="font-body text-[13px] text-signal hover:text-signal-dim transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Cerrar notificación"
                className="font-mono text-[13px] leading-none text-text-faint hover:text-text-primary transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider')
  }
  return context
}
