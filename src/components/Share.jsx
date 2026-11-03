import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Icon from './Icon'
import { CopyButton, Modal, Spinner } from './ui'
import { useToast } from '../state/toast'

export function withRef(url, ref) {
  try {
    const u = new URL(url)
    if (ref) u.searchParams.set('ref', ref)
    return u.toString()
  } catch {
    return url
  }
}

/** Opens the phone's own share sheet when there is one; returns false so the caller can show ShareModal instead. */
export async function nativeShare({ title, text, url }) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  try {
    await navigator.share({ title, text, url })
  } catch {
    /* the person closed the share sheet */
  }
  return true
}

/** QR code with PNG/SVG download and share. The code opens `url?ref=qr`, which needs no login. */
export function QRCard({ url, name = 'shop', title, size = 720 }) {
  const [png, setPng] = useState('')
  const [svg, setSvg] = useState('')
  const [failed, setFailed] = useState(false)
  const [share, setShare] = useState(false)
  const target = withRef(url, 'qr')

  useEffect(() => {
    let alive = true
    setPng('')
    setSvg('')
    setFailed(false)
    const opts = { margin: 2, color: { dark: '#1e1b4a', light: '#ffffff' }, errorCorrectionLevel: 'M' }
    Promise.all([QRCode.toDataURL(target, { ...opts, width: size }), QRCode.toString(target, { ...opts, type: 'svg' })])
      .then(([p, s]) => {
        if (!alive) return
        setPng(p)
        setSvg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [target, size])

  const shareImage = async () => {
    try {
      if (png && navigator.canShare && typeof File !== 'undefined') {
        const blob = await (await fetch(png)).blob()
        const file = new File([blob], `${name}-qr.png`, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: title || 'My shop QR code', text: target })
          return
        }
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return
    }
    setShare(true)
  }

  return (
    <div className="qr-card">
      <div className="qr-box">
        {png ? <img src={png} alt={`QR code for ${title || name}`} /> : failed ? <span className="hint">Could not create the QR code.</span> : <Spinner />}
      </div>
      <div className="stack-sm qr-side">
        {title && <strong>{title}</strong>}
        <p className="hint">Opens directly, no login needed. Scans are counted as "qr" in Analytics.</p>
        <div className="row wrap tight">
          {png && (
            <a className="btn btn-primary btn-sm" href={png} download={`${name}-qr.png`}>
              <Icon name="download" size={16} /> PNG
            </a>
          )}
          {svg && (
            <a className="btn btn-ghost btn-sm" href={svg} download={`${name}-qr.svg`}>
              <Icon name="download" size={16} /> SVG
            </a>
          )}
          {png && (
            <button type="button" className="btn btn-accent btn-sm" onClick={shareImage}>
              <Icon name="share" size={16} /> Share QR
            </button>
          )}
        </div>
        <div>
          <CopyButton text={target} label="Copy link behind QR" />
        </div>
      </div>
      <ShareModal open={share} onClose={() => setShare(false)} url={url} title="Share this QR link" text={title || 'Scan or tap to open my shop'} />
    </div>
  )
}

export function ShareModal({ open, onClose, url, title = 'Share', text = '' }) {
  const toast = useToast()
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const wa = withRef(url, 'whatsapp')
  const fb = withRef(url, 'facebook')
  const tw = withRef(url, 'x')

  const native = async () => {
    const done = await nativeShare({ title, text, url: withRef(url, 'share') })
    if (!done) toast.error('Sharing is not supported on this device. Copy the link instead.')
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
          <a className="share-btn" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text} ${url}`.trim())}`}>
            <Icon name="mail" /> Email
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
