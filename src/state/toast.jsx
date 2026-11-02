import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const remove = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = Math.random().toString(36).slice(2)
      setItems((l) => [...l.slice(-3), { id, type, message, title: opts.title, onClick: opts.onClick }])
      setTimeout(() => remove(id), opts.duration || 4500)
    },
    [remove]
  )

  const api = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      info: (m, o) => push('info', m, o),
    }),
    [push]
  )

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => {
              remove(t.id)
              if (t.onClick) t.onClick()
            }}
          >
            {t.title && <strong>{t.title}</strong>}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
