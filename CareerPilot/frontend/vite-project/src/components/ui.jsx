import { useEffect, useRef } from 'react'
import { FiAlertCircle, FiInbox, FiX } from 'react-icons/fi'

export function Button({ variant = 'primary', size, block, loading, icon, children, className = '', type = 'button', disabled, ...rest }) {
  const classes = ['btn', `btn-${variant}`, size ? `btn-${size}` : '', block ? 'btn-block' : '', className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

export function Card({ title, action, children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {(title || action) && (
        <div className="card-title">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Badge({ tone, children }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ''}`}>{children}</span>
}

export function Spinner({ large }) {
  return <span className={`spinner ${large ? 'spinner-lg' : ''}`} role="status" aria-label="Loading" />
}

export function FullPageSpinner() {
  return (
    <div className="fullpage">
      <Spinner large />
    </div>
  )
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />
}

export function SkeletonCards({ count = 3, height = 110 }) {
  return (
    <div className="grid grid-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} style={{ borderRadius: 14 }} />
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon = FiInbox, title, text, action }) {
  return (
    <div className="empty">
      <Icon aria-hidden="true" />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="alert alert-error" role="alert">
      <FiAlertCircle aria-hidden="true" />
      <div className="alert-body">
        <strong>Something went wrong</strong>
        <div>{message}</div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} className="mt">
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

export function Alert({ tone = 'info', icon: Icon, children, onClose }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {Icon && <Icon aria-hidden="true" />}
      <div className="alert-body">{children}</div>
      {onClose && (
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Dismiss">
          <FiX />
        </button>
      )}
    </div>
  )
}

export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && (
        <span className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="flex">{actions}</div>}
    </div>
  )
}

export function ProgressBar({ value, tone = '', label }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={`progress ${tone}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function ScorePill({ score, tone }) {
  return <span className={`score-pill score-${tone}`}>{score === null || score === undefined ? '-' : `${score}%`}</span>
}

/** Accessible modal: closes on Escape, focuses the first button, labelled by its title. */
export function Modal({ open, title, children, actions, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', onKey)
    const firstButton = ref.current && ref.current.querySelector('button')
    if (firstButton) firstButton.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref}>
        <h2 id="modal-title">{title}</h2>
        <div>{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  )
}
