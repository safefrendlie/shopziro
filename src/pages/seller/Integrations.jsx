import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Badge, Field, Modal } from '../../components/ui'
import { NotificationSettings } from '../../components/NotificationUI'
import { errText } from '../../lib/supabase'
import { useToast } from '../../state/toast'
import { SOCIALS, normalizeSocial, socialUrl } from '../../lib/utils'

export default function Integrations() {
  const { shop, updateShop } = useOutletContext()
  const toast = useToast()
  const socials = shop.config?.socials || {}
  const [editing, setEditing] = useState(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setError('')
  }, [editing])

  const open = (def) => {
    setEditing(def)
    setValue(socials[def.key] || '')
  }

  const save = async (e) => {
    e.preventDefault()
    const r = normalizeSocial(editing.key, value)
    if (r.error) return setError(r.error)
    if (!r.value) return setError('Enter a value or use Disconnect.')
    setBusy(true)
    const { error: err } = await updateShop({ config: { socials: { ...socials, [editing.key]: r.value } } })
    setBusy(false)
    if (err) return toast.error(errText(err))
    toast.success(`${editing.label} connected.`)
    setEditing(null)
  }

  const disconnect = async (def) => {
    const next = { ...socials }
    delete next[def.key]
    const { error: err } = await updateShop({ config: { socials: next } })
    if (err) return toast.error(errText(err))
    toast.info(`${def.label} disconnected.`)
    setEditing(null)
  }

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Connections</h1>
        <p className="muted">
          Optional. Connect your social pages so customers can reach you in one tap. Nothing is posted for you and no passwords are needed. We simply
          show buttons that open your profiles.
        </p>
      </div>

      <div className="connect-grid">
        {SOCIALS.map((def) => {
          const v = socials[def.key]
          return (
            <div key={def.key} className="connect-card">
              <div className="connect-head">
                <span className={`connect-icon ci-${def.key}`}>
                  <Icon name={def.icon} size={22} />
                </span>
                <div>
                  <strong>{def.label}</strong>
                  {v ? <small className="muted block clip">{def.kind === 'handle' ? `@${v}` : v}</small> : <small className="muted block">Not connected</small>}
                </div>
                {v && <Badge tone="good">Connected</Badge>}
              </div>
              <div className="row wrap tight">
                <button type="button" className={v ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'} onClick={() => open(def)}>
                  {v ? 'Edit' : 'Connect'}
                </button>
                {v && (
                  <>
                    <a className="btn btn-ghost btn-sm" href={socialUrl(def.key, v)} target="_blank" rel="noopener noreferrer">
                      Test link
                    </a>
                    <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => disconnect(def)}>
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card row wrap between">
        <div>
          <h3>Links and QR codes</h3>
          <p className="muted small">Your shop link, per-platform links and QR codes now live in their own section.</p>
        </div>
        <Link to="/seller/share" className="btn btn-accent btn-sm">
          <Icon name="qr" size={16} /> Open Share and QR
        </Link>
      </div>

      <div className="card stack">
        <h3>Notifications and sound</h3>
        <NotificationSettings />
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Connect ${editing.label}` : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="social-form" className="btn btn-accent" disabled={busy}>
              {busy ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        {editing && (
          <form id="social-form" onSubmit={save} className="stack" noValidate>
            <Field
              label={editing.kind === 'phone' ? 'WhatsApp number' : editing.kind === 'url' ? 'Website address' : `${editing.label} handle or profile link`}
              error={error}
              hint={editing.placeholder}
            >
              <input className="input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={editing.placeholder} />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  )
}
