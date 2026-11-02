import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { Empty, Field } from '../components/ui'
import { supabase, errText } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { useCart } from '../state/cart'
import { useToast } from '../state/toast'
import { PAYMENT_METHODS, formatPrice, shortId, waLink } from '../lib/utils'

export default function Checkout() {
  const { user, profile, loading } = useAuth()
  const cart = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const currency = cart.shop?.currency || 'INR'

  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', payment: 'cod' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [shopCfg, setShopCfg] = useState(null)

  useEffect(() => {
    if (profile) setForm((f) => ({ ...f, name: f.name || profile.full_name || '', phone: f.phone || profile.phone || '' }))
  }, [profile])

  useEffect(() => {
    if (!cart.shop?.id) return
    supabase
      .from('shops')
      .select('config')
      .eq('id', cart.shop.id)
      .maybeSingle()
      .then(({ data }) => setShopCfg(data?.config || null))
  }, [cart.shop?.id])

  useEffect(() => {
    if (!loading && !user && !done) navigate('/auth?mode=login&role=buyer&next=/checkout', { replace: true })
  }, [loading, user, done, navigate])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  if (done) {
    const wa = waLink(
      done.whatsapp,
      `Hi ${done.shopName}, I just placed order #${shortId(done.id)} on Shopziro for ${formatPrice(done.total, done.currency)}. Name: ${done.name}.`
    )
    return (
      <div className="container page narrow">
        <div className="card stack center-card">
          <div className="success-ring">
            <Icon name="check" size={34} />
          </div>
          <h1>Order placed!</h1>
          <p className="muted">
            Order <strong>#{shortId(done.id)}</strong> was sent to {done.shopName}. You will get a notification when they accept it.
          </p>
          <div className="row wrap center-row">
            <Link to="/buyer/orders" className="btn btn-primary">
              Track my order
            </Link>
            {wa && (
              <a href={wa} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" size={18} /> Message seller on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <Empty
          icon="cart"
          title="Nothing to check out"
          action={
            <Link to="/explore" className="btn btn-primary">
              Explore shops
            </Link>
          }
        />
      </div>
    )
  }

  if (profile && profile.role !== 'buyer') {
    return (
      <div className="container page">
        <Empty icon="shield" title="Buyer account needed" text="Seller accounts cannot place orders. Please log in with a buyer account." />
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (form.name.trim().length < 2) errs.name = 'Please enter your name.'
    if (form.phone.replace(/[^\d]/g, '').length < 7) errs.phone = 'Enter a phone number the seller can reach.'
    if (form.address.trim().length < 5) errs.address = 'Enter your delivery address or pickup note.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const { data, error } = await supabase.rpc('place_order', {
      p_shop: cart.shop.id,
      p_name: form.name,
      p_phone: form.phone,
      p_address: form.address,
      p_notes: form.notes,
      p_payment: form.payment,
      p_items: cart.items.map((i) => ({ product_id: i.product_id, qty: i.qty, variation: i.variation || '' })),
    })
    setBusy(false)
    if (error) {
      toast.error(errText(error, 'Could not place the order.'))
      return
    }
    setDone({
      id: data,
      shopName: cart.shop.name,
      total: cart.total,
      currency,
      name: form.name,
      whatsapp: shopCfg?.socials?.whatsapp || '',
    })
    cart.clear()
  }

  return (
    <div className="container page">
      <h1 className="page-title">Checkout</h1>
      <div className="checkout-grid">
        <form className="card stack" onSubmit={submit} noValidate>
          <h3>Delivery details</h3>
          <Field label="Full name" error={errors.name}>
            <input className="input" autoComplete="name" value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Phone / WhatsApp" error={errors.phone}>
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Delivery address or pickup note" error={errors.address}>
            <textarea className="textarea" rows={3} autoComplete="street-address" value={form.address} onChange={set('address')} />
          </Field>
          <Field label="Notes for the seller (optional)">
            <textarea className="textarea" rows={2} value={form.notes} onChange={set('notes')} maxLength={500} />
          </Field>
          <h3>Payment</h3>
          <div className="radio-list">
            {Object.entries(PAYMENT_METHODS).map(([k, label]) => (
              <label key={k} className={`radio-card ${form.payment === k ? 'is-active' : ''}`}>
                <input type="radio" name="pay" value={k} checked={form.payment === k} onChange={set('payment')} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {shopCfg?.payment_note && <div className="notice notice-info">{shopCfg.payment_note}</div>}
          <button className="btn btn-accent btn-lg" disabled={busy}>
            {busy ? 'Placing order...' : `Place order - ${formatPrice(cart.total, currency)}`}
          </button>
          <p className="hint">The seller confirms your order and the final payment. Prices are checked again on the server when you order.</p>
        </form>

        <aside className="card stack">
          <h3>Order summary</h3>
          <p className="muted small">{cart.shop.name}</p>
          {cart.items.map((i) => (
            <div key={i.key} className="sum-row">
              <span>
                {i.qty} x {i.name}
                {i.variation ? ` (${i.variation})` : ''}
              </span>
              <strong>{formatPrice(i.qty * i.price, currency)}</strong>
            </div>
          ))}
          <div className="cart-total">
            <span>Total</span>
            <strong>{formatPrice(cart.total, currency)}</strong>
          </div>
          <Link to="/cart" className="btn btn-ghost btn-sm">
            Edit cart
          </Link>
        </aside>
      </div>
    </div>
  )
}
