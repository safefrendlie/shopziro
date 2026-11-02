import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Empty, PageLoader, StatTile, Tabs } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

const dayKey = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function Bars({ data, format = (v) => v, label }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bars" role="img" aria-label={label}>
      {data.map((d) => (
        <div key={d.key} className="bar-col" title={`${d.label}: ${format(d.value)}`}>
          <span className="bar-val">{d.value ? format(d.value) : ''}</span>
          <i style={{ height: `${Math.max(d.value ? 6 : 2, (d.value / max) * 100)}%` }} className={d.value ? '' : 'is-zero'} />
          <small>{d.label}</small>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { shop } = useOutletContext()
  const [range, setRange] = useState(14)
  const [raw, setRaw] = useState(null)
  const currency = shop.config?.currency || 'INR'

  useEffect(() => {
    let alive = true
    setRaw(null)
    ;(async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString()
      const [v, o, enq] = await Promise.all([
        supabase.from('shop_visits').select('source,created_at').eq('shop_id', shop.id).gte('created_at', since).limit(10000),
        supabase.from('orders').select('id,total,status,created_at').eq('shop_id', shop.id).gte('created_at', since).limit(2000),
        supabase.from('enquiries').select('id,created_at').eq('shop_id', shop.id).gte('created_at', since).limit(2000),
      ])
      const ids = (o.data || []).filter((x) => !['rejected', 'cancelled'].includes(x.status)).map((x) => x.id)
      const items = ids.length ? await supabase.from('order_items').select('name,qty,price').in('order_id', ids) : { data: [] }
      if (alive) setRaw({ visits: v.data || [], orders: o.data || [], enquiries: enq.data || [], items: items.data || [] })
    })()
    return () => {
      alive = false
    }
  }, [shop.id])

  const calc = useMemo(() => {
    if (!raw) return null
    const days = []
    for (let i = range - 1; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({ key: dayKey(d), label: range <= 14 ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : String(d.getDate()) })
    }
    const inRange = new Set(days.map((d) => d.key))
    const count = (rows) => {
      const m = {}
      rows.forEach((r) => {
        const k = dayKey(r.created_at)
        if (inRange.has(k)) m[k] = (m[k] || 0) + 1
      })
      return m
    }
    const visitsBy = count(raw.visits)
    const ordersBy = count(raw.orders)
    const salesBy = {}
    raw.orders.forEach((o) => {
      const k = dayKey(o.created_at)
      if (inRange.has(k) && o.status === 'completed') salesBy[k] = (salesBy[k] || 0) + Number(o.total)
    })
    const sources = {}
    raw.visits.forEach((v) => {
      if (inRange.has(dayKey(v.created_at))) sources[v.source] = (sources[v.source] || 0) + 1
    })
    const products = {}
    raw.items.forEach((i) => {
      const p = products[i.name] || { qty: 0, revenue: 0 }
      p.qty += i.qty
      p.revenue += i.qty * Number(i.price)
      products[i.name] = p
    })
    const sum = (m) => Object.values(m).reduce((a, b) => a + b, 0)
    const totalVisits = sum(visitsBy)
    const totalOrders = sum(ordersBy)
    return {
      visits: days.map((d) => ({ ...d, value: visitsBy[d.key] || 0 })),
      orders: days.map((d) => ({ ...d, value: ordersBy[d.key] || 0 })),
      sales: days.map((d) => ({ ...d, value: salesBy[d.key] || 0 })),
      totalVisits,
      totalOrders,
      totalSales: sum(salesBy),
      enquiries: raw.enquiries.filter((e) => inRange.has(dayKey(e.created_at))).length,
      conversion: totalVisits ? (totalOrders / totalVisits) * 100 : 0,
      sources: Object.entries(sources).sort((a, b) => b[1] - a[1]),
      top: Object.entries(products).sort((a, b) => b[1].qty - a[1].qty).slice(0, 6),
    }
  }, [raw, range])

  if (!calc) return <PageLoader />
  const srcMax = Math.max(1, ...calc.sources.map((s) => s[1]))

  return (
    <div className="stack-lg">
      <div className="row wrap between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="muted">Everything here is counted from real visits, orders and requests. Your own visits are not counted.</p>
        </div>
        <Tabs
          value={range}
          onChange={setRange}
          tabs={[
            { value: 7, label: '7 days' },
            { value: 14, label: '14 days' },
            { value: 30, label: '30 days' },
          ]}
        />
      </div>

      <div className="stats">
        <StatTile label="Visitors" value={calc.totalVisits} icon="eye" />
        <StatTile label="Orders" value={calc.totalOrders} icon="cart" />
        <StatTile label="Enquiries" value={calc.enquiries} icon="chat" />
        <StatTile label="Sales (completed)" value={formatPrice(calc.totalSales, currency)} icon="rupee" tone="accent" />
        <StatTile label="Visit to order" value={`${calc.conversion.toFixed(1)}%`} hint="Orders per visit" icon="chart" />
      </div>

      {calc.totalVisits === 0 && calc.totalOrders === 0 ? (
        <Empty icon="chart" title="No activity in this period yet" text="Share your shop link and QR code. Charts will fill in as people visit and order." />
      ) : (
        <>
          <div className="card stack">
            <h3>Visitors per day</h3>
            <Bars data={calc.visits} label="Visitors per day" />
          </div>
          <div className="grid-2 align-start">
            <div className="card stack">
              <h3>Orders per day</h3>
              <Bars data={calc.orders} label="Orders per day" />
            </div>
            <div className="card stack">
              <h3>Sales per day</h3>
              <Bars data={calc.sales} format={(v) => formatPrice(v, currency)} label="Sales per day" />
            </div>
          </div>
        </>
      )}

      <div className="grid-2 align-start">
        <div className="card stack">
          <h3>Where visitors come from</h3>
          {calc.sources.length === 0 ? (
            <p className="muted">No visits yet.</p>
          ) : (
            calc.sources.map(([name, n]) => (
              <div key={name} className="meter-row">
                <span className="cap">{name}</span>
                <div className="meter">
                  <i style={{ width: `${(n / srcMax) * 100}%` }} />
                </div>
                <strong>{n}</strong>
              </div>
            ))
          )}
          <p className="hint">Tip: use links ending in ?ref=instagram or ?ref=whatsapp (the Connections page makes them for you).</p>
        </div>
        <div className="card stack">
          <h3>Top products and services</h3>
          {calc.top.length === 0 ? (
            <p className="muted">Sales will show here after your first orders.</p>
          ) : (
            calc.top.map(([name, p]) => (
              <div key={name} className="sum-row">
                <span>
                  {name}
                  <small className="muted block">{p.qty} sold</small>
                </span>
                <strong>{formatPrice(p.revenue, currency)}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
