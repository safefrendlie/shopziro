import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Badge, Empty, PageLoader, Tabs, useConfirm } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useToast } from '../../state/toast'
import { ORDER_STATUS, PAYMENT_METHODS, fmtDate, formatPrice, shortId, waLink } from '../../lib/utils'

const TABS = [
  { value: 'pending', label: 'New' },
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Cancelled / declined' },
  { value: 'all', label: 'All' },
]
const inTab = (o, tab) =>
  tab === 'all' ||
  (tab === 'pending' && o.status === 'pending') ||
  (tab === 'active' && ['accepted', 'in_progress'].includes(o.status)) ||
  (tab === 'completed' && o.status === 'completed') ||
  (tab === 'closed' && ['rejected', 'cancelled'].includes(o.status))

export default function Orders() {
  const { shop } = useOutletContext()
  const toast = useToast()
  const [confirm, confirmNode] = useConfirm()
  const [orders, setOrders] = useState(null)
  const [items, setItems] = useState({})
  const [tab, setTab] = useState('pending')
  const [busyId, setBusyId] = useState('')
  const currency = shop.config?.currency || 'INR'

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('orders').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(200)
    if (error) toast.error(errText(error))
    const list = data || []
    setOrders(list)
    if (list.length) {
      const { data: it } = await supabase.from('order_items').select('*').in('order_id', list.map((o) => o.id))
      const map = {}
      ;(it || []).forEach((i) => {
        ;(map[i.order_id] = map[i.order_id] || []).push(i)
      })
      setItems(map)
    }
  }, [shop.id, toast])

  useEffect(() => {
    load()
    const ch = supabase
      .channel(`orders-${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shop.id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [shop.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.value, (orders || []).filter((o) => inTab(o, t.value)).length])), [orders])
  const list = (orders || []).filter((o) => inTab(o, tab))

  const update = async (o, patch, okMsg) => {
    setBusyId(o.id)
    const { error } = await supabase.from('orders').update(patch).eq('id', o.id)
    setBusyId('')
    if (error) return toast.error(errText(error))
    setOrders((l) => l.map((x) => (x.id === o.id ? { ...x, ...patch } : x)))
    toast.success(okMsg)
  }

  const reject = async (o) => {
    if (await confirm('Decline this order? The customer will be notified.', { confirmText: 'Decline order', danger: true })) update(o, { status: 'rejected' }, 'Order declined.')
  }
  const cancel = async (o) => {
    if (await confirm('Cancel this order? The customer will be notified.', { confirmText: 'Cancel order', danger: true })) update(o, { status: 'cancelled' }, 'Order cancelled.')
  }

  if (orders === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Orders</h1>
        <p className="muted">New orders appear here instantly, with a soft chime.</p>
      </div>

      <div className="tabs-scroll">
        <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))} />
      </div>

      {list.length === 0 ? (
        <Empty icon="cart" title="No orders here" text={tab === 'pending' ? 'When a customer orders, it will show up here.' : 'Nothing in this list.'} />
      ) : (
        <div className="stack">
          {list.map((o) => {
            const st = ORDER_STATUS[o.status]
            const its = items[o.id] || []
            const wa = waLink(o.customer_phone, `Hi ${o.customer_name}, this is ${shop.name} about your order #${shortId(o.id)}.`)
            const busy = busyId === o.id
            return (
              <article key={o.id} className="card order-card">
                <header className="row wrap between">
                  <div>
                    <strong>
                      #{shortId(o.id)} · {o.customer_name}
                    </strong>
                    <div className="muted small">{fmtDate(o.created_at, true)}</div>
                  </div>
                  <div className="row wrap tight">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <Badge tone={o.payment_status === 'paid' ? 'good' : o.payment_status === 'refunded' ? 'muted' : 'warn'}>{o.payment_status === 'paid' ? 'Paid' : o.payment_status === 'refunded' ? 'Refunded' : 'Unpaid'}</Badge>
                  </div>
                </header>

                <ul className="order-items">
                  {its.map((i) => (
                    <li key={i.id}>
                      <span>
                        {i.qty} x {i.name}
                        {i.variation ? ` (${i.variation})` : ''}
                      </span>
                      <strong>{formatPrice(i.price * i.qty, currency)}</strong>
                    </li>
                  ))}
                  <li className="order-total">
                    <span>Total</span>
                    <strong>{formatPrice(o.total, currency)}</strong>
                  </li>
                </ul>

                <dl className="kv">
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>
                    </dd>
                  </div>
                  {o.address && (
                    <div>
                      <dt>Address</dt>
                      <dd>{o.address}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Payment</dt>
                    <dd>{PAYMENT_METHODS[o.payment_method]}</dd>
                  </div>
                  {o.notes && (
                    <div>
                      <dt>Notes</dt>
                      <dd>{o.notes}</dd>
                    </div>
                  )}
                </dl>

                <div className="row wrap">
                  {o.status === 'pending' && (
                    <>
                      <button type="button" className="btn btn-accent btn-sm" disabled={busy} onClick={() => update(o, { status: 'accepted' }, 'Order accepted.')}>
                        <Icon name="check" size={16} /> Accept
                      </button>
                      <button type="button" className="btn btn-danger-ghost btn-sm" disabled={busy} onClick={() => reject(o)}>
                        Decline
                      </button>
                    </>
                  )}
                  {o.status === 'accepted' && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => update(o, { status: 'in_progress' }, 'Marked in progress.')}>
                      Start preparing
                    </button>
                  )}
                  {['accepted', 'in_progress'].includes(o.status) && (
                    <>
                      <button type="button" className="btn btn-accent btn-sm" disabled={busy} onClick={() => update(o, { status: 'completed' }, 'Order completed.')}>
                        <Icon name="check" size={16} /> Mark completed
                      </button>
                      <button type="button" className="btn btn-danger-ghost btn-sm" disabled={busy} onClick={() => cancel(o)}>
                        Cancel order
                      </button>
                    </>
                  )}
                  {!['rejected', 'cancelled'].includes(o.status) && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => update(o, { payment_status: o.payment_status === 'paid' ? 'unpaid' : 'paid' }, o.payment_status === 'paid' ? 'Marked unpaid.' : 'Marked as paid.')}
                    >
                      {o.payment_status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                    </button>
                  )}
                  {wa && (
                    <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
                      <Icon name="whatsapp" size={16} /> WhatsApp
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
      {confirmNode}
    </div>
  )
}
