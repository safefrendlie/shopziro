import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Icon from './Icon'
import { CopyButton, Modal, Spinner } from './ui'

export function withRef(url, ref) {
  try {
    const u = new URL(url)
    if (ref) u.searchParams.set('ref', ref)
    return u.toString()
  } catch {
    return url
  }
}

export function QRCard({ url, name = 'shop' }) {
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)
  const target = withRef(url, 'qr')

  useEffect(() => {
    let alive = true
    setSrc('')
    setFailed(false)
    QRCode.toDataURL(target, { width: 720, margin: 2, color: { dark: '#0b0b10', light: '#ffffff' } })
      .then((d) => alive && setSrc(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [target])

  return (
    <div className="qr-card">
      <div className="qr-box">
        {src ? <img src={src} alt={`QR code for ${name}`} /> : failed ? <span className="hint">Could not create QR code.</span> : <Spinner />}
      </div>
      <div className="stack-sm">
        <p className="hint">Print it on packaging, menus or your shop door. Scans are tracked as the "qr" source in Analytics.</p>
        {src && (
          <a className="btn btn-primary btn-sm" href={src} download={`${name}-qr.png`}>
            <Icon name="download" size={16} /> Download QR (PNG)
          </a>
        )}
      </div>
    </div>
  )
}

export function ShareModal({ open, onClose, url, title = 'Share', text = '' }) {
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const wa = withRef(url, 'whatsapp')
  const fb = withRef(url, 'facebook')
  const tw = withRef(url, 'x')

  const native = async () => {
    try {
      await navigator.share({ title, text, url: withRef(url, 'share') })
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="stack">
        <div className="share-url">
          <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Link" />
          <CopyButton text={url} label="Copy" className="btn btn-primary" />
        </div>
        <div className="share-grid">
          <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${wa}`.trim())}`}>
            <Icon name="whatsapp" /> WhatsApp
          </a>
          <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fb)}`}>
            <Icon name="facebook" /> Facebook
          </a>
          <a className="share-btn" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(tw)}`}>
            <Icon name="xlogo" /> X
          </a>
          {canNative && (
            <button type="button" className="share-btn" onClick={native}>
              <Icon name="share" /> More...
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
