import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import ImageUploader from '../../components/ImageUploader'
import { Field, Toggle } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useAuth } from '../../state/auth'
import { useToast } from '../../state/toast'
import { CATEGORIES, CURRENCIES, SLUG_RE, defaultConfig, shopLink, slugify } from '../../lib/utils'

export default function MyShop() {
  const { shop, reload, updateShop } = useOutletContext()
  const { user, profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const creating = !shop

  const [f, setF] = useState({
    name: '',
    slug: '',
    category: CATEGORIES[0],
    city: '',
    description: '',
    phone: '',
    address: '',
    currency: defaultConfig().currency,
    payment_note: '',
    logo_url: '',
  })
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugState, setSlugState] = useState({ checking: false, ok: null })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (shop) {
      const c = shop.config || {}
      setF({
        name: shop.name,
        slug: shop.slug,
        category: shop.category,
        city: shop.city || '',
        description: c.description || '',
        phone: c.phone || '',
        address: c.address || '',
        currency: c.currency || 'INR',
        payment_note: c.payment_note || '',
        logo_url: c.logo_url || '',
      })
    } else if (profile?.phone) {
      setF((x) => ({ ...x, phone: x.phone || profile.phone }))
    }
  }, [shop, profile])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const onName = (e) => {
    const v = e.target.value
    setF((x) => ({ ...x, name: v, slug: creating && !slugEdited ? slugify(v) : x.slug }))
  }

  // Check the shop link is free (only while creating).
  useEffect(() => {
    if (!creating) return undefined
    const s = f.slug.trim().toLowerCase()
    if (!s || !SLUG_RE.test(s) || s.length < 3) {
      setSlugState({ checking: false, ok: null })
      return undefined
    }
    setSlugState({ checking: true, ok: null })
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('slug_available', { p_slug: s })
      setSlugState({ checking: false, ok: error ? null : Boolean(data) })
    }, 400)
    return () => clearTimeout(t)
  }, [f.slug, creating])

  const validate = () => {
    const e = {}
    if (f.name.trim().length < 2) e.name = 'Enter your business name (at least 2 characters).'
    if (creating) {
      const s = f.slug.trim().toLowerCase()
      if (!SLUG_RE.test(s) || s.length < 3 || s.length > 40) e.slug = 'Use 3 to 40 letters, numbers and single dashes.'
      else if (slugState.ok === false) e.slug = 'That link is already taken. Try another.'
    }
    if (f.phone && f.phone.replace(/[^\d+]/g, '').length < 7) e.phone = 'Enter a valid phone number.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setBusy(true)
    const cfg = {
      description: f.description.trim(),
      phone: f.phone.trim(),
      address: f.address.trim(),
      currency: f.currency,
      payment_note: f.payment_note.trim(),
      logo_url: f.logo_url,
    }
    if (creating) {
      const socials = {}
      const digits = f.phone.replace(/[^\d]/g, '')
      if (digits.length >= 8 && digits.length <= 15) socials.whatsapp = digits
      const { error } = await supabase.from('shops').insert({
        owner_id: user.id,
        slug: f.slug.trim().toLowerCase(),
        name: f.name.trim(),
        category: f.category,
        city: f.city.trim() || null,
        published: false,
        config: defaultConfig({ ...cfg, socials }),
      })
      setBusy(false)
      if (error) return toast.error(errText(error, 'Could not create your shop.'))
      await reload()
      toast.success('Shop created! Now add products and customise the look.')
      navigate('/seller/products')
      return
    }
    const { error } = await updateShop({
      name: f.name.trim(),
      category: f.category,
      city: f.city.trim() || null,
      config: cfg,
    })
    setBusy(false)
    if (error) return toast.error(errText(error))
    toast.success('Business details saved.')
  }

  const togglePublished = async (on) => {
    if (on && !window.confirm('Make your shop public now? Anyone with the link will be able to see it.')) return
    const { error } = await updateShop({ published: on })
    if (error) return toast.error(errText(error))
    toast.success(on ? 'Your shop is live!' : 'Your shop is hidden from the public.')
  }

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">{creating ? 'Create your shop' : 'My shop'}</h1>
        <p className="muted">{creating ? 'Tell us about your business. You can change most of this later.' : 'Your business details. These save instantly.'}</p>
      </div>

      <form className="card stack" onSubmit={save} noValidate>
        <div className="field">
          <span className="label">Business logo</span>
          <ImageUploader value={f.logo_url} onChange={(u) => setF((x) => ({ ...x, logo_url: u }))} label="Upload logo" compact />
        </div>
        <div className="grid-2">
          <Field label="Business name" error={errors.name}>
            <input className="input" value={f.name} onChange={onName} maxLength={80} />
          </Field>
          <Field label="Business category">
            <select className="select" value={f.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Your shop link"
          error={errors.slug}
          hint={
            creating
              ? slugState.checking
                ? 'Checking...'
                : slugState.ok === true
                  ? 'Available!'
                  : `${shopLink(f.slug || 'your-name')}`
              : `${shopLink(f.slug)} (cannot be changed)`
          }
        >
          <div className="input-affix">
            <span className="affix-text">/shop/</span>
            <input
              className="input"
              value={f.slug}
              disabled={!creating}
              onChange={(e) => {
                setSlugEdited(true)
                setF((x) => ({ ...x, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
              }}
              maxLength={40}
            />
          </div>
        </Field>
        <Field label="Description">
          <textarea className="textarea" rows={4} value={f.description} onChange={set('description')} maxLength={800} placeholder="What do you sell? What makes your business special?" />
        </Field>
        <div className="grid-2">
          <Field label="City / location">
            <input className="input" value={f.city} onChange={set('city')} maxLength={60} placeholder="e.g. Pune" />
          </Field>
          <Field label="Phone / WhatsApp" error={errors.phone} hint="Include the country code, e.g. +91 98765 43210">
            <input className="input" type="tel" value={f.phone} onChange={set('phone')} />
          </Field>
        </div>
        <Field label="Address (optional)">
          <input className="input" value={f.address} onChange={set('address')} maxLength={200} />
        </Field>
        <div className="grid-2">
          <Field label="Currency">
            <select className="select" value={f.currency} onChange={set('currency')}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment instructions (optional)" hint="Shown at checkout, e.g. your UPI ID or bank details.">
            <input className="input" value={f.payment_note} onChange={set('payment_note')} maxLength={200} />
          </Field>
        </div>
        <div>
          <button className="btn btn-accent" disabled={busy || (creating && slugState.checking)}>
            {busy ? 'Saving...' : creating ? 'Create my shop' : 'Save details'}
          </button>
        </div>
      </form>

      {!creating && (
        <div className="card stack">
          <h3>Visibility</h3>
          <Toggle
            checked={shop.published}
            onChange={togglePublished}
            label={shop.published ? 'Your shop is public' : 'Your shop is hidden (draft)'}
            hint="Hidden shops can only be seen by you. Design changes made in Customise stay private until you press Publish there."
          />
          <div className="row wrap">
            <Link to={`/shop/${shop.slug}`} className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer">
              Open my shop
            </Link>
            <Link to="/seller/customise" className="btn btn-primary btn-sm">
              Customise the design
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
