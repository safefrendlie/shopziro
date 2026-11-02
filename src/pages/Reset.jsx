import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { Field, PageLoader } from '../components/ui'
import { supabase, errText } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { useToast } from '../state/toast'

export default function Reset() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <PageLoader />

  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return setError('Use at least 8 characters.')
    if (pw !== pw2) return setError('The two passwords do not match.')
    setError('')
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (err) return setError(errText(err))
    toast.success('Password updated.')
    navigate('/', { replace: true })
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Logo size={40} />
        <h1>Choose a new password</h1>
        {!user ? (
          <div className="stack">
            <p className="muted">This reset link is invalid or has expired. Please request a new one.</p>
            <Link to="/auth?mode=forgot" className="btn btn-primary">
              Request a new link
            </Link>
          </div>
        ) : (
          <form className="stack" onSubmit={submit} noValidate>
            <Field label="New password">
              <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </Field>
            <Field label="Repeat new password" error={error}>
              <input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </Field>
            <button className="btn btn-accent btn-lg" disabled={busy}>
              {busy ? 'Saving...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
