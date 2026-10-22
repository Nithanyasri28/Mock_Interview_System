import { useCallback, useMemo, useState } from 'react'
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi'
import { ToastContext } from './toastContext'

const ICONS = { success: FiCheckCircle, error: FiAlertCircle, info: FiInfo }

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((tone, message) => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    setToasts((list) => [...list, { id, tone, message }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500)
  }, [])

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div key={t.id} className={`toast toast-${t.tone}`}>
              <Icon aria-hidden="true" /> <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
