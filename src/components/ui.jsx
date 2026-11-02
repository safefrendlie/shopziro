import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { cx } from '../lib/utils'
import { useToast } from '../state/toast'

export function Spinner({ size = 22 }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label="Loading" />
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="page-loader">
      <Spinner size={30} />
      <span>{label}</span>
    </div>
  )
}

export function Empty({ icon = 'box', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div className={cx('modal', wide && 'modal-wide')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

/** const [confirm, node] = useConfirm();  if (await confirm('Sure?')) { ... }   (render {node} once) */
export function useConfirm() {
  const [state, setState] = useState(null)
  const confirm = useCallback(
    (message, opts = {}) =>
      new Promise((resolve) => {
        setState({ message, confirmText: opts.confirmText || 'Confirm', danger: Boolean(opts.danger), resolve })
      }),
    []
  )
  const close = (value) => {
    if (state) state.resolve(value)
    setState(null)
  }
  const node = (
    <Modal
      open={Boolean(state)}
      onClose={() => close(false)}
      title="Please confirm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
            Cancel
          </button>
          <button type="button" className={cx('btn', state?.danger ? 'btn-danger' : 'btn-primary')} onClick={() => close(true)}>
            {state?.confirmText}
          </button>
        </>
      }
    >
      <p className="confirm-text">{state?.message}</p>
    </Modal>
  )
  return [confirm, node]
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cx('field', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text">{error}</span>}
    </label>
  )
}

export function Stars({ value = 0, size = 16 }) {
  const v = Number(value) || 0
  return (
    <span className="stars" aria-label={`${v.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} filled={v >= i - 0.25} className={v >= i - 0.25 ? 'star-on' : 'star-off'} />
      ))}
    </span>
  )
}

export function StarInput({ value, onChange }) {
  return (
    <div className="stars star-input" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onClick={() => onChange(i)}
          className="star-btn"
        >
          <Icon name="star" size={30} filled={value >= i} className={value >= i ? 'star-on' : 'star-off'} />
        </button>
      ))}
    </div>
  )
}

export function Badge({ tone = 'muted', children, className }) {
  return <span className={cx('badge', `badge-${tone}`, className)}>{children}</span>
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={cx('toggle-row', disabled && 'is-disabled')}>
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-track" />
      </span>
    </label>
  )
}

export function CopyButton({ text, label = 'Copy link', className = 'btn btn-ghost btn-sm' }) {
  const toast = useToast()
  const [done, setDone] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setDone(true)
      toast.success('Copied to clipboard')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setDone(false), 1800)
    } catch {
      toast.error('Could not copy. Please copy it manually.')
    }
  }
  return (
    <button type="button" className={className} onClick={copy}>
      <Icon name={done ? 'check' : 'copy'} size={16} />
      {done ? 'Copied' : label}
    </button>
  )
}

export function StatTile({ label, value, hint, icon, tone }) {
  return (
    <div className={cx('stat', tone && `stat-${tone}`)}>
      <div className="stat-top">
        <span>{label}</span>
        {icon && <Icon name={icon} size={18} />}
      </div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          className={cx('seg-btn', value === t.value && 'is-active')}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count != null && <span className="seg-count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
