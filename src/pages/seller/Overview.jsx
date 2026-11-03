import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'
import { ShareModal } from '../../components/Share'
import { Badge, CopyButton, PageLoader, StatTile } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { ORDER_STATUS, fmtDate, formatPrice, shopLink, shortId } from '../../lib/utils'

export default function Overview() {
  const { shop } = useOutletContext()
  const [d, setD] = useState(null)
  const [share, setShare] = useState(false)
  const dismissKey = `sz_checklist_off_${shop.id}`
  const [hideList, setHideList] = useState(() => {
    try {
      return localStorage.getItem(dismissKey) === '1'
    } catch {
      return false
    }
  })
  const dismissList = () => {
    setHideList(true)
    try {
      localStorage.setItem(dismissKey, '1')
    } catch {
      /* ignore */
    }
  }
  const currency = shop.config?.currency || 'INR'

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [orders, enq, prods, items, newEnq] = await Promise.all([
        supabase.from('orders').select('id,status,total,customer_name,created_at').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(1000),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('shop_id', shop.id),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('shop_id', shop.id),
        supabase.from('order_items').select('name,qty,order_id').limit(2000),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('shop_id', shop.id).eq('status', 'new'),
      ])
      if (!alive) return
      const o = orders.data || []
      const doneIds = new Set(o.filter((x) => x.status !== 'rejected' && x.status !== 'cancelled').map((x) => x.id))
      const pop = {}
      ;(items.data || []).forEach((i) => {
        if (doneIds.has(i.order_id)) pop[i.name] = (pop[i.name] || 0) + i.qty
      })
      setD({
        orders: o,
        enquiries: enq.count || 0,
        newEnquiries: newEnq.count || 0,
        products: prods.count || 0,
        popular: Object.entries(pop).sort((a, b) => b[1] - a[1]).slice(0, 5),
      })
    })()
    return () => {
      alive = false
    }
  }, [shop.id])

  if (!d) return <PageLoader />

  const c = shop.config || {}
  const completed = d.orders.filter((o) => o.status === 'completed')
  const pending = d.orders.filter((o) => o.status === 'pending')
  const sales = completed.reduce((n, o) => n + Number(o.total), 0)
  const url = shopLink(shop.slug)

  const checklist = [
    { done: Boolean(c.logo_url), label: 'Upload your logo', to: '/seller/shop' },
    { done: d.products > 0, label: 'Add your first product or service', to: '/seller/products' },
    { done: Boolean(c.socials?.whatsapp), label: 'Add your WhatsApp number', to: '/seller/integrations' },
    { done: shop.published, label: 'Publish your shop', to: '/seller/customise' },
    { done: shop.visit_count > 0, label: 'Share your link and get your first visitor', to: '/seller/share' },
  ]
  const doneCount = checklist.filter((x) => x.done).length

  return (
    <div className="stack-lg">
      <div className="row wrap between">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="muted">Real numbers from your shop, updated as they happen.</p>
        </div>
        <div className="row wrap">
          <Link to={`/shop/${shop.slug}`} className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={16} /> View shop
          </Link>
          <button type="button" className="btn btn-accent btn-sm" onClick={() => setShare(true)}>
            <Icon name="share" size={16} /> Share
          </button>
        </div>
      </div>

      <div className="stats">
        <StatTile label="Total visitors" value={shop.visit_count.toLocaleString()} icon="eye" />
        <StatTile label="Enquiries" value={d.enquiries} hint={d.newEnquiries ? `${d.newEnquiries} new` : 'None waiting'} icon="chat" />
        <StatTile label="Total orders" value={d.orders.length} icon="cart" />
        <StatTile label="Completed" value={completed.length} icon="check" tone="good" />
        <StatTile label="Pending" value={pending.length} icon="clock" tone={pending.length ? 'warn' : undefined} />
        <StatTile label="Total sales" value={formatPrice(sales, currency)} hint="Completed orders" icon="rupee" tone="accent" />
        <StatTile label="Rating" value={shop.rating_count ? Number(shop.rating_avg).toFixed(1) : 'New'} hint={`${shop.rating_count} review${shop.rating_count === 1 ? '' : 's'}`} icon="star" />
      </div>

      {doneCount < checklist.length && !hideList && (
        <div className="card stack">
          <div className="row between">
            <h3>Get your shop ready</h3>
            <div className="row tight">
              <Badge tone="accent">
                {doneCount} of {checklist.length}
              </Badge>
              <button type="button" className="btn btn-icon btn-ghost btn-sm" onClick={dismissList} aria-label="Hide this checklist">
                <Icon name="x" size={16} />
              </button>
            </div>
          </div>
          <div className="progress">
            <i style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className="checklist">
            {checklist.map((i) => (
              <li key={i.label} className={i.done ? 'is-done' : ''}>
                <Icon name={i.done ? 'check' : 'chevron-right'} size={16} />
                {i.done ? <span>{i.label}</span> : <Link to={i.to}>{i.label}</Link>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid-2 align-start">
        <div className="card stack">
          <div className="row between">
            <h3>Recent orders</h3>
            <Link to="/seller/orders" className="link-btn small">
              View all
            </Link>
          </div>
          {d.orders.length === 0 ? (
            <p className="muted">No orders yet. Share your shop link to get started.</p>
          ) : (
            d.orders.slice(0, 5).map((o) => (
              <div key={o.id} className="sum-row">
                <span>
                  #{shortId(o.id)} · {o.customer_name}
                  <small className="muted block">{fmtDate(o.created_at)}</small>
                </span>
                <span className="row tight">
                  <strong>{formatPrice(o.total, currency)}</strong>
                  <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                </span>
              </div>
            ))
          )}
        </div>

        <div className="card stack">
          <h3>Popular products</h3>
          {d.popular.length === 0 ? (
            <p className="muted">Your best sellers will show up here after your first orders.</p>
          ) : (
            d.popular.map(([name, qty]) => (
              <div key={name} className="sum-row">
                <span>{name}</span>
                <strong>{qty} sold</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card stack">
        <div className="row wrap between">
          <h3>Your shop link</h3>
          <Link to="/seller/share" className="btn btn-ghost btn-sm">
            <Icon name="qr" size={16} /> Links and QR codes
          </Link>
        </div>
        <div className="share-url">
          <input className="input" readOnly value={url} aria-label="Shop link" onFocus={(e) => e.target.select()} />
          <CopyButton text={url} label="Copy" className="btn btn-primary" />
        </div>
      </div>

      <ShareModal open={share} onClose={() => setShare(false)} url={url} title="Share your shop" text={`Visit ${shop.name} on Shopziro`} />
    </div>
  )
}
