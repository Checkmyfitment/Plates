import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

const icons = { success: '✓', error: '!', info: 'ⓘ' }
const colors = {
  success: { bg: 'var(--forest-dark)', fg: 'white' },
  error: { bg: 'var(--plum)', fg: 'white' },
  info: { bg: 'var(--ink)', fg: 'white' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, type = 'info') => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  const api = useRef({
    success: (message) => show(message, 'success'),
    error: (message) => show(message, 'error'),
    info: (message) => show(message, 'info'),
  }).current

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-enter w-full max-w-md flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium shadow-lg pointer-events-auto"
            style={{ background: colors[t.type].bg, color: colors[t.type].fg }}
            role="status"
          >
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>
              {icons[t.type]}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
