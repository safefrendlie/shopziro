import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import ImageUploader from '../../components/ImageUploader'
import { Badge, Empty, Field, Modal, PageLoader, StarInput, useConfirm } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useAuth } from '../../state/auth'
import { useToast } from '../../state/toast'
import { ORDER_STATUS, PAYMENT_METHODS, fmtDate, formatPrice, shortId, waLink } from '../../lib/utils'

const STEPS = [
  ['pending', 'Placed'],
  ['accepted', 'Accepted'],
  ['in_progress', 'Preparing'],
  ['completed', 'Completed'],
]

function Tracker({ status }) {
  if (['rejected', 'cancelled'].includes(status)) {
    return <div className="notice notice-bad">This order was {status === 'rejected' ? 'declined by the seller' : 'cancelled'}.</div>
  }
  const idx = STEPS.findIndex(([k]) => k === status)
  return (
    <ol className="tracker" aria-label="Order progress">
      {STEPS.map(([k, label], i) => (
        <li key={k} className={i <= idx ? 'is-done' : ''}>
          <span className="tracker-dot">{i <= idx ? <Icon name="check" size={12} /> : i + 1}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  )
}

export default function BuyerOrders() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [confirm, confirmNode] = useConfirm()
  const [orders, setOrders] = useState(null)
  const [items, setItems] = useState({})
  const [shops, setShops] = useState({})
  const [reviewed, setReviewed] = useState(new Set())
  const [review, setReview] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [image, setImage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('orders').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(100)
    if (error) toast.error(errText(error))
    const list = data || []
    setOrders(list)
    if (!list.length) return
    const shopIds = Array.from(new Set(list.map((o) => o.shop_id)))
    const [it, sh, rv] = await Promise.all([
      supabase.from('order_items').select('*').in('order_id', list.map((o) => o.id)),
      supabase.from('shops').select('id,name,slug,config').in('id', shopIds),
      supabase.from('reviews').select('shop_id').eq('buyer_id', user.id),
    ])
    const m = {}
    ;(it.data || []).forEach((i) => {
      ;(m[i.order_id] = m[i.order_id] || []).push(i)
    })
    setItems(m)
    setShops(Object.fromEntries((sh.data || []).map((s) => [s.id, s])))
    setReviewed(new Set((rv.data || []).map((r) => r.shop_id)))
  }, [user.id, toast])

  useEffect(() => {
    load()
    const ch = supabase
      .channel(`buyer-orders-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `buyer_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = async (o) => {
    if (!(await confirm('Cancel this order?', { confirmText: 'Cancel order', danger: true }))) return
    const { error } = await supabase.rpc('cancel_order', { p_order: o.id })
    if (error) return toast.error(errText(error))
    toast.success('Order cancelled.')
    load()
  }

  const openReview = (o) => {
    setReview(o)
    setRating(0)
    setComment('')
    setImage('')
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (!rating) return toast.error('Please choose a star rating.')
    setBusy(true)
    const { error } = await supabase.from('reviews').insert({
      shop_id: review.shop_id,
      buyer_id: user.id,
      buyer_name: profile?.full_name || 'Customer',
      rating,
      comment: comment.trim() || null,
      image_url: image || null,
    })
    setBusy(false)
    if (error) return toast.error(errText(error, 'Could not post your review.'))
    toast.success('Thank you for your review!')
    setReview(null)
    load()
  }

  if (orders === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">My orders</h1>
        <p className="muted">Track your orders. You will be notified when the seller updates them.</p>
      </div>

      {orders.length === 0 ? (
        <Empty
          icon="cart"
          title="No orders yet"
          text="When you place an order it will show up here."
          action={
            <Link to="/explore" className="btn btn-primary">
              Explore shops
            </Link>
          }
        />
      ) : (
        <div className="stack">
          {orders.map((o) => {
            const shop = shops[o.shop_id]
            const currency = shop?.config?.currency || 'INR'
            const wa = waLink(shop?.config?.socials?.whatsapp, `Hi ${shop?.name || ''}, about my order #${shortId(o.id)} on Shopziro.`)
            return (
              <article key={o.id} className="card stack">
                <header className="row wrap between">
                  <div>
                    <strong>{shop ? <Link to={`/shop/${shop.slug}`}>{shop.name}</Link> : 'Shop'}</strong>
                    <div className="muted small">
                      Order #{shortId(o.id)} · {fmtDate(o.created_at, true)}
                    </div>
                  </div>
                  <div className="row wrap tight">
                    <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                    <Badge tone={o.payment_status === 'paid' ? 'good' : 'warn'}>{o.payment_status === 'paid' ? 'Paid' : 'Payment due'}</Badge>
                  </div>
                </header>
                <Tracker status={o.status} />
                <ul className="order-items">
                  {(items[o.id] || []).map((i) => (
                    <li key={i.id}>
                      <span>
                        {i.qty} x {i.name}
                        {i.variation ? ` (${i.variation})` : ''}
                      </span>
                      <strong>{formatPrice(i.price * i.qty, currency)}</strong>
                    </li>
                  ))}
                  <li className="order-total">
                    <span>Total · {PAYMENT_METHODS[o.payment_method]}</span>
                    <strong>{formatPrice(o.total, currency)}</strong>
                  </li>
                </ul>
                <div className="row wrap">
                  {o.status === 'pending' && (
                    <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => cancel(o)}>
                      Cancel order
                    </button>
                  )}
                  {o.status === 'completed' && !reviewed.has(o.shop_id) && (
                    <button type="button" className="btn btn-accent btn-sm" onClick={() => openReview(o)}>
                      <Icon name="star" size={16} /> Write a review
                    </button>
                  )}
                  {o.status === 'completed' && reviewed.has(o.shop_id) && <Badge tone="good">Reviewed</Badge>}
                  {wa && (
                    <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
                      <Icon name="whatsapp" size={16} /> Message seller
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={Boolean(review)}
        onClose={() => setReview(null)}
        title={`Review ${shops[review?.shop_id]?.name || 'this shop'}`}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setReview(null)}>
              Cancel
            </button>
            <button type="submit" form="review-form" className="btn btn-accent" disabled={busy}>
              {busy ? 'Posting...' : 'Post review'}
            </button>
          </>
        }
      >
        <form id="review-form" className="stack" onSubmit={submitReview}>
          <StarInput value={rating} onChange={setRating} />
          <Field label="Your experience">
            <textarea className="textarea" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
          </Field>
          <div className="field">
            <span className="label">Add a photo (optional)</span>
            <ImageUploader value={image} onChange={setImage} label="Add photo" compact />
          </div>
        </form>
      </Modal>
      {confirmNode}
    </div>
  )
}
