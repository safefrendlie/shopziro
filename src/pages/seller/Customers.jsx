import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Empty, PageLoader } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { fmtDate, formatPrice, initials, waLink } from '../../lib/utils'

export default function Customers() {
  const { shop } = useOutletContext()
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const currency = shop.config?.currency || 'INR'

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [o, e] = await Promise.all([
        supabase.from('orders').select('buyer_id,customer_name,customer_phone,total,status,created_at').eq('shop_id', shop.id).limit(1000),
        supabase.from('enquiries').select('buyer_id,buyer_name,buyer_phone,created_at').eq('shop_id', shop.id).limit(1000),
      ])
      if (alive) setData({ orders: o.data || [], enquiries: e.data || [] })
    })()
    return () => {
      alive = false
    }
  }, [shop.id])

  const customers = useMemo(() => {
    if (!data) return []
    const map = new Map()
    const touch = (id, name, phone, at) => {
      const c = map.get(id) || { id, name: '', phone: '', orders: 0, enquiries: 0, spent: 0, last: at }
      if (name && !c.name) c.name = name
      if (phone && !c.phone) c.phone = phone
      if (at > c.last) c.last = at
      map.set(id, c)
      return c
    }
    data.orders.forEach((o) => {
      const c = touch(o.buyer_id, o.customer_name, o.customer_phone, o.created_at)
      c.orders += 1
      if (o.status === 'completed') c.spent += Number(o.total)
    })
    data.enquiries.forEach((x) => {
      const c = touch(x.buyer_id, x.buyer_name, x.buyer_phone, x.created_at)
      c.enquiries += 1
    })
    return Array.from(map.values()).sort((a, b) => (a.last < b.last ? 1 : -1))
  }, [data])

  const list = customers.filter((c) => !q.trim() || `${c.name} ${c.phone}`.toLowerCase().includes(q.trim().toLowerCase()))

  if (!data) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Customers</h1>
        <p className="muted">People who ordered or sent you a request. {customers.length} so far.</p>
      </div>
      {customers.length > 0 && (
        <label className="search-box">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" aria-label="Search customers" />
        </label>
      )}
      {list.length === 0 ? (
        <Empty icon="users" title={customers.length ? 'No match' : 'No customers yet'} text={customers.length ? undefined : 'Share your shop link to get your first customer.'} />
      ) : (
        <div className="table-list">
          {list.map((c) => {
            const wa = waLink(c.phone, `Hi ${c.name}, this is ${shop.name}.`)
            return (
              <div className="row-card" key={c.id}>
                <div className="avatar">{initials(c.name)}</div>
                <div className="row-main">
                  <strong>{c.name || 'Customer'}</strong>
                  <small className="muted">
                    {c.phone} · last activity {fmtDate(c.last)}
                  </small>
                  <small className="muted">
                    {c.orders} order{c.orders === 1 ? '' : 's'} · {c.enquiries} request{c.enquiries === 1 ? '' : 's'} · {formatPrice(c.spent, currency)} completed
                  </small>
                </div>
                {wa && (
                  <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
                    <Icon name="whatsapp" size={16} /> Chat
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
