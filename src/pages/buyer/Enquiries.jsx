import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Badge, Empty, PageLoader } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useAuth } from '../../state/auth'
import { useToast } from '../../state/toast'
import { ENQUIRY_STATUS, fmtDate, formatPrice, waLink } from '../../lib/utils'

const KIND = { custom: 'Custom order', quote: 'Quote request', question: 'Question' }

export default function BuyerEnquiries() {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [shops, setShops] = useState({})

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('enquiries').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(100)
    if (error) toast.error(errText(error))
    const list = data || []
    setRows(list)
    const ids = Array.from(new Set(list.map((r) => r.shop_id)))
    if (ids.length) {
      const { data: sh } = await supabase.from('shops').select('id,name,slug,config').in('id', ids)
      setShops(Object.fromEntries((sh || []).map((s) => [s.id, s])))
    }
  }, [user.id, toast])

  useEffect(() => {
    load()
    const ch = supabase
      .channel(`buyer-enq-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'enquiries', filter: `buyer_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const respond = async (r, accept) => {
    const { error } = await supabase.rpc('respond_quote', { p_enquiry: r.id, p_accept: accept })
    if (error) return toast.error(errText(error))
    toast.success(accept ? 'Quotation accepted. The seller has been told.' : 'Quotation declined.')
    load()
  }

  if (rows === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">My requests</h1>
        <p className="muted">Custom orders and quote requests you sent to sellers.</p>
      </div>
      {rows.length === 0 ? (
        <Empty
          icon="chat"
          title="No requests yet"
          text="Open a custom or quote product in any shop to send your first request."
          action={
            <Link to="/explore" className="btn btn-primary">
              Explore shops
            </Link>
          }
        />
      ) : (
        <div className="stack">
          {rows.map((r) => {
            const shop = shops[r.shop_id]
            const st = ENQUIRY_STATUS[r.status]
            const currency = shop?.config?.currency || 'INR'
            const wa = waLink(shop?.config?.socials?.whatsapp, `Hi ${shop?.name || ''}, about my request for "${r.product_name || ''}" on Shopziro.`)
            return (
              <article key={r.id} className="card stack">
                <header className="row wrap between">
                  <div>
                    <strong>{r.product_name || 'Request'}</strong>
                    <div className="muted small">
                      {shop ? <Link to={`/shop/${shop.slug}`}>{shop.name}</Link> : 'Shop'} · {fmtDate(r.created_at, true)}
                    </div>
                  </div>
                  <div className="row wrap tight">
                    <Badge tone="accent">{KIND[r.kind]}</Badge>
                    <Badge tone={st.tone}>{r.status === 'new' ? 'Waiting for seller' : r.status === 'quoted' ? 'Quotation received' : st.label}</Badge>
                  </div>
                </header>
                <dl className="kv">
                  {Object.entries(r.details || {}).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                  {r.delivery_date && (
                    <div>
                      <dt>Date needed</dt>
                      <dd>{fmtDate(r.delivery_date)}</dd>
                    </div>
                  )}
                  {r.message && (
                    <div>
                      <dt>Your message</dt>
                      <dd className="pre-wrap">{r.message}</dd>
                    </div>
                  )}
                </dl>
                {r.quote_amount != null && (
                  <div className="notice notice-info">
                    <Icon name="tag" />
                    <div>
                      <strong>Quotation: {formatPrice(r.quote_amount, currency)}</strong>
                      {r.quote_note && <p>{r.quote_note}</p>}
                    </div>
                  </div>
                )}
                <div className="row wrap">
                  {r.status === 'quoted' && (
                    <>
                      <button type="button" className="btn btn-accent btn-sm" onClick={() => respond(r, true)}>
                        <Icon name="check" size={16} /> Accept quotation
                      </button>
                      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => respond(r, false)}>
                        Decline
                      </button>
                    </>
                  )}
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
    </div>
  )
}
