import { useEffect, useState } from 'react'
import { NotificationSettings } from '../components/NotificationUI'
import InstallButton from '../components/InstallButton'
import { Field } from '../components/ui'
import { supabase, errText } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { useToast } from '../state/toast'
import { usePwaInstall } from '../state/pwa'

export default function AccountSettings() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const { installed } = usePwaInstall()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const save = async (e) => {
    e.preventDefault()
    if (name.trim().length < 2) return toast.error('Please enter your name.')
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: phone.trim() || null }).eq('id', user.id)
    setBusy(false)
    if (error) return toast.error(errText(error))
    await refreshProfile()
    toast.success('Profile saved.')
  }

  const changePw = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return toast.error('Use at least 8 characters for the new password.')
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) return toast.error(errText(error))
    setPw('')
    toast.success('Password changed.')
  }

  return (
    <div className="stack-lg">
      {typeof window !== 'undefined' && window.location.pathname.startsWith('/seller') && <h1 className="page-title">Settings</h1>}
      <form className="card stack" onSubmit={save}>
        <h3>Your profile</h3>
        <Field label="Email">
          <input className="input" value={user?.email || ''} readOnly disabled />
        </Field>
        <Field label="Full name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Phone / WhatsApp">
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </Field>
        <div>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>

      <div className="card stack">
        <h3>Notifications and sound</h3>
        <NotificationSettings />
      </div>

      <div className="card stack">
        <h3>Install the app</h3>
        <p className="muted">Install Shopziro on your phone or computer for a full-screen, app-like experience.</p>
        {installed ? <span className="badge badge-good">Already installed</span> : <InstallButton className="btn btn-primary" label="Install Shopziro" />}
      </div>

      <form className="card stack" onSubmit={changePw}>
        <h3>Change password</h3>
        <Field label="New password" hint="At least 8 characters.">
          <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <div>
          <button className="btn btn-primary" disabled={pwBusy}>
            {pwBusy ? 'Saving...' : 'Change password'}
          </button>
        </div>
      </form>

      <div>
        <button type="button" className="btn btn-danger-ghost" onClick={signOut}>
          Log out
        </button>
      </div>
    </div>
  )
}
