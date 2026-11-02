import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { Field } from '../components/ui'
import { supabase, errText } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { useToast } from '../state/toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function Auth() {
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, profile } = useAuth()
  const mode = sp.get('mode') === 'register' ? 'register' : sp.get('mode') === 'forgot' ? 'forgot' : 'login'
  const role = sp.get('role') === 'seller' ? 'seller' : 'buyer'
  const next = sp.get('next') || ''

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [showPw, setShowPw] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const go = (m, r = role) => {
    const n = new URLSearchParams(sp)
    n.set('mode', m)
    n.set('role', r)
    setSp(n, { replace: true })
    setErrors({})
    setNote('')
  }

  // Already signed in: go to the right place.
  useEffect(() => {
    if (user && profile) {
      const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : ''
      navigate(safe || (profile.role === 'seller' ? '/seller' : '/buyer'), { replace: true })
    }
  }, [user, profile, next, navigate])

  const validate = () => {
    const e = {}
    if (mode === 'register' && form.name.trim().length < 2) e.name = 'Please enter your name.'
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.'
    if (mode !== 'forgot') {
      if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setBusy(true)
    setNote('')
    try {
      const email = form.email.trim().toLowerCase()
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })
        if (error) throw error
        setNote('If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.')
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            data: { role, full_name: form.name.trim(), phone: form.phone.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        if (!data.session) {
          setNote('Account created. Please confirm your email using the link we sent, then log in.')
        } else {
          toast.success(role === 'seller' ? 'Welcome! Let us set up your shop.' : 'Welcome to Shopziro!')
          navigate(role === 'seller' ? '/seller/shop' : next || '/explore', { replace: true })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: form.password })
        if (error) throw error
        toast.success('Welcome back!')
      }
    } catch (err) {
      const m = errText(err)
      if (/Invalid login credentials/i.test(m)) setErrors({ password: 'Wrong email or password.' })
      else if (/already registered/i.test(m)) setErrors({ email: 'This email already has an account. Try logging in.' })
      else if (/Email not confirmed/i.test(m)) setNote('Please confirm your email first. Check your inbox for the link.')
      else toast.error(m)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Logo size={40} showTag />
        <h1>{mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h1>

        {mode === 'register' && (
          <div className="role-pick" role="radiogroup" aria-label="Account type">
            <button type="button" role="radio" aria-checked={role === 'seller'} className={role === 'seller' ? 'is-active' : ''} onClick={() => go('register', 'seller')}>
              <Icon name="store" size={22} />
              <strong>Seller</strong>
              <small>Create and run your shop</small>
            </button>
            <button type="button" role="radio" aria-checked={role === 'buyer'} className={role === 'buyer' ? 'is-active' : ''} onClick={() => go('register', 'buyer')}>
              <Icon name="cart" size={22} />
              <strong>Buyer</strong>
              <small>Discover and shop</small>
            </button>
          </div>
        )}

        <form className="stack" onSubmit={submit} noValidate>
          {mode === 'register' && (
            <>
              <Field label={role === 'seller' ? 'Your name or business owner name' : 'Your name'} error={errors.name}>
                <input className="input" autoComplete="name" value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Phone or WhatsApp (optional)">
                <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
              </Field>
            </>
          )}
          <Field label="Email" error={errors.email}>
            <input className="input" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} />
          </Field>
          {mode !== 'forgot' && (
            <Field label="Password" error={errors.password} hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
              <div className="input-affix">
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={form.password}
                  onChange={set('password')}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPw((s) => !s)}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          )}

          {note && <div className="notice notice-info">{note}</div>}

          <button className="btn btn-accent btn-lg" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Log in'}
          </button>
        </form>

        <div className="auth-links-row">
          {mode === 'login' && (
            <>
              <button type="button" className="link-btn" onClick={() => go('forgot')}>
                Forgot password?
              </button>
              <span>
                New here?{' '}
                <button type="button" className="link-btn" onClick={() => go('register')}>
                  Create an account
                </button>
              </span>
            </>
          )}
          {mode === 'register' && (
            <span>
              Already registered?{' '}
              <button type="button" className="link-btn" onClick={() => go('login')}>
                Log in
              </button>
            </span>
          )}
          {mode === 'forgot' && (
            <button type="button" className="link-btn" onClick={() => go('login')}>
              Back to log in
            </button>
          )}
        </div>
        <Link to="/" className="hint center">
          Back to home
        </Link>
      </div>
    </div>
  )
}
