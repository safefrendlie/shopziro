import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import ImageUploader from './ImageUploader'
import { ShareModal } from './Share'
import { Badge, Field, Modal } from './ui'
import { supabase, errText } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { useCart } from '../state/cart'
import { useToast } from '../state/toast'
import { useBuyerGuard } from '../lib/hooks'
import { OFFER_LABEL, STOCK_LABEL, formatPrice, priceLabel, productLink, waLink } from '../lib/utils'

function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function EnquiryForm({ shop, product }) {
  const { user, profile } = useAuth()
  const guard = useBuyerGuard()
  const toast = useToast()
  const isCustom = product.offer_type === 'custom'
  const labels = product.custom_fields || []
  const [fields, setFields] = useState({})
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [date, setDate] = useState('')
  const [qty, setQty] = useState(1)
  const [image, setImage] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (profile?.phone && !phone) setPhone(profile.phone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const submit = async (e) => {
    e.preventDefault()
    if (!guard()) return
    const errs = {}
    if (phone.replace(/[^\d]/g, '').length < 7) errs.phone = 'Enter a phone number the seller can reach you on.'
    if (!isCustom && message.trim().length < 10) errs.message = 'Please describe what you need (at least 10 characters).'
    if (date && date < todayISO()) errs.date = 'Choose a date from today onward.'
    if (!(Number(qty) >= 1)) errs.qty = 'Quantity must be at least 1.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const details = {}
    labels.forEach((l) => {
      if ((fields[l] || '').trim()) details[l] = fields[l].trim()
    })
    setBusy(true)
    const { error } = await supabase.from('enquiries').insert({
      shop_id: shop.id,
      product_id: product.id,
      product_name: product.name,
      buyer_id: user.id,
      buyer_name: profile?.full_name || user.email,
      buyer_phone: phone.trim(),
      kind: product.offer_type,
      details,
      message: message.trim() || null,
      reference_image: image || null,
      delivery_date: date || null,
      quantity: Math.floor(Number(qty)) || 1,
    })
    setBusy(false)
    if (error) {
      toast.error(errText(error, 'Could not send your request.'))
      return
    }
    setSent(true)
    toast.success('Request sent to the seller.')
  }

  if (sent) {
    return (
      <div className="notice notice-good">
        <Icon name="check" />
        <div>
          <strong>Request sent!</strong>
          <p>
            {shop.name} has been notified.{' '}
            {isCustom ? 'They will confirm your order details.' : 'You will get their quotation here and in your notifications.'}
          </p>
          <Link to="/buyer/enquiries" className="btn btn-primary btn-sm">
            Track my requests
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <h4>{isCustom ? 'Customise your order' : 'Request a quote'}</h4>
      {labels.map((l) => (
        <Field key={l} label={l}>
          <input className="input" value={fields[l] || ''} onChange={(e) => setFields((f) => ({ ...f, [l]: e.target.value }))} maxLength={200} />
        </Field>
      ))}
      <Field label={isCustom ? 'Additional instructions' : 'What do you need?'} error={errors.message}>
        <textarea
          className="textarea"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1500}
          placeholder={isCustom ? 'Anything else the seller should know' : 'Describe your requirement, size, timeline, etc.'}
        />
      </Field>
      <div className="grid-2">
        <Field label={isCustom ? 'Delivery date' : 'Needed by (optional)'} error={errors.date}>
          <input className="input" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Quantity" error={errors.qty}>
          <input className="input" type="number" min="1" max="9999" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
      </div>
      <Field label="Your phone / WhatsApp number" error={errors.phone}>
        <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
      </Field>
      <div className="field">
        <span className="label">Reference image (optional)</span>
        <ImageUploader value={image} onChange={setImage} label="Add reference" compact />
      </div>
      <button className="btn btn-accent btn-lg" disabled={busy}>
        {busy ? 'Sending...' : isCustom ? 'Send custom order request' : 'Request quotation'}
      </button>
    </form>
  )
}

export default function ProductModal({ shop, product, onClose }) {
  const c = shop.config || {}
  const currency = c.currency || 'INR'
  const { user, profile } = useAuth()
  const cart = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const guard = useBuyerGuard()
  const [img, setImg] = useState(0)
  const [variation, setVariation] = useState(product.variations?.[0] || '')
  const [qty, setQty] = useState(1)
  const [saved, setSaved] = useState(false)
  const [share, setShare] = useState(false)

  useEffect(() => {
    setImg(0)
    setVariation(product.variations?.[0] || '')
    setQty(1)
  }, [product.id, product.variations])

  useEffect(() => {
    let alive = true
    if (!user || profile?.role !== 'buyer') {
      setSaved(false)
      return undefined
    }
    supabase
      .from('saved_products')
      .select('product_id')
      .eq('buyer_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle()
      .then(({ data }) => alive && setSaved(Boolean(data)))
    return () => {
      alive = false
    }
  }, [user, profile, product.id])

  const out = product.stock_status === 'out_of_stock'
  const images = product.images || []
  const url = productLink(shop.slug, product.id)
  const wa = waLink(c.socials?.whatsapp, `Hi ${shop.name}, I'm interested in "${product.name}". ${url}`)

  const addToCart = async (goCheckout) => {
    if (profile?.role === 'seller') {
      toast.error('Seller accounts cannot place orders. Use a buyer account.')
      return
    }
    if (product.variations?.length && !variation) {
      toast.error('Please choose an option first.')
      return
    }
    const ok = await cart.add(
      { id: shop.id, slug: shop.slug, name: shop.name, currency },
      { product_id: product.id, name: product.name, price: Number(product.price), image: images[0] || '', variation, qty }
    )
    if (ok) {
      toast.success('Added to your cart')
      if (goCheckout) navigate('/checkout')
    }
  }

  const toggleSave = () => {
    guard(async () => {
      if (saved) {
        const { error } = await supabase.from('saved_products').delete().eq('buyer_id', user.id).eq('product_id', product.id)
        if (error) return toast.error(errText(error))
        setSaved(false)
        toast.info('Removed from saved products')
      } else {
        const { error } = await supabase.from('saved_products').insert({ buyer_id: user.id, product_id: product.id })
        if (error) return toast.error(errText(error))
        setSaved(true)
        toast.success('Saved to your account')
      }
    })
  }

  return (
    <>
      <Modal open onClose={onClose} title={product.name} wide>
        <div className="pm">
          <div className="pm-gallery">
            <div className="pm-main">
              {images[img] ? <img src={images[img]} alt={product.name} /> : <div className="product-noimg"><Icon name="image" size={40} /></div>}
            </div>
            {images.length > 1 && (
              <div className="pm-thumbs">
                {images.map((u, i) => (
                  <button type="button" key={u} className={i === img ? 'is-active' : ''} onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}>
                    <img src={u} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pm-info stack">
            <div className="row wrap tight">
              {product.kind === 'service' && <Badge tone="info">Service</Badge>}
              <Badge tone="accent">{OFFER_LABEL[product.offer_type]}</Badge>
              <Badge tone={out ? 'bad' : product.stock_status === 'limited' ? 'warn' : 'good'}>{STOCK_LABEL[product.stock_status]}</Badge>
              <span className="muted small">{product.category}</span>
            </div>
            <div className="pm-price">{priceLabel(product, currency)}</div>
            {product.description && <p className="pre-wrap">{product.description}</p>}

            {product.offer_type === 'fixed' && (
              <>
                {product.variations?.length > 0 && (
                  <Field label="Choose an option">
                    <select className="select" value={variation} onChange={(e) => setVariation(e.target.value)}>
                      {product.variations.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <div className="row">
                  <div className="qty">
                    <button type="button" className="btn btn-icon btn-ghost" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                      <Icon name="minus" size={16} />
                    </button>
                    <span>{qty}</span>
                    <button type="button" className="btn btn-icon btn-ghost" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Increase">
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                  <strong className="muted">{formatPrice(Number(product.price) * qty, currency)}</strong>
                </div>
                <div className="row wrap">
                  <button type="button" className="btn btn-primary" disabled={out} onClick={() => addToCart(false)}>
                    <Icon name="cart" size={18} /> Add to cart
                  </button>
                  <button type="button" className="btn btn-accent" disabled={out} onClick={() => addToCart(true)}>
                    Buy now
                  </button>
                </div>
                {out && <p className="hint">This item is out of stock right now. You can still message the seller.</p>}
              </>
            )}

            {product.offer_type !== 'fixed' && <EnquiryForm shop={shop} product={product} />}

            <div className="row wrap tight pm-links">
              {wa && (
                <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" size={16} /> Ask on WhatsApp
                </a>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={toggleSave}>
                <Icon name="heart" size={16} filled={saved} /> {saved ? 'Saved' : 'Save'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShare(true)}>
                <Icon name="share" size={16} /> Share
              </button>
            </div>
          </div>
        </div>
      </Modal>
      <ShareModal open={share} onClose={() => setShare(false)} url={url} title="Share this product" text={`${product.name} at ${shop.name}`} />
    </>
  )
}
