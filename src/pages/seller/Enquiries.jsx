import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Badge, Empty, Field, Modal, PageLoader, Tabs } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useToast } from '../../state/toast'
import { ENQUIRY_STATUS, fmtDate, formatPrice, waLink } from '../../lib/utils'

const KIND = { custom: 'Custom order', quote: 'Quote request', question: 'Question' }
const TABS = [
  { value: 'new', label: 'New' },
  { value: 'quoted', label: 'Waiting for customer' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'done', label: 'Declined / closed' },
  { value: 'all', label: 'All' },
]
const inTab = (e, t) => t === 'all' || (t === 'done' ? ['declined', 'closed'].includes(e.status) : e.status === t)

export default function Enquiries() {
  const { shop } = useOutletContext()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('new')
  const [quoting, setQuoting] = useState(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const currency = shop.config?.currency || 'INR'

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('enquiries').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(200)
    if (error) toast.error(errText(error))
    setRows(data || [])
  }, [shop.id, toast])

  useEffect(() => {
    load()
    const ch = supabase
      .channel(`enq-${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries', filter: `shop_id=eq.${shop.id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [shop.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.value, (rows || []).filter((r) => inTab(r, t.value)).length])), [rows])
  const list = (rows || []).filter((r) => inTab(r, tab))

  const setStatus = async (r, status, msg) => {
    const { error } = await supabase.from('enquiries').update({ status }).eq('id', r.id)
    if (error) return toast.error(errText(error))
    toast.success(msg)
    load()
  }

  const openQuote = (r) => {
    setQuoting(r)
    setAmount(r.quote_amount ?? '')
    setNote(r.quote_note || '')
  }

  const sendQuote = async (e) => {
    e.preventDefault()
    const n = Number(amount)
    if (!(n >= 0) || amount === '') return toast.error('Enter the quotation amount.')
    setBusy(true)
    const { error } = await supabase.from('enquiries').update({ status: 'quoted', quote_amount: n, quote_note: note.trim() || null }).eq('id', quoting.id)
    setBusy(false)
    if (error) return toast.error(errText(error))
    toast.success('Quotation sent to the customer.')
    setQuoting(null)
    load()
  }

  if (rows === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Enquiries</h1>
        <p className="muted">Custom orders and quote requests from customers.</p>
      </div>
      <div className="tabs-scroll">
        <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))} />
      </div>

      {list.length === 0 ? (
        <Empty icon="chat" title="Nothing here" text="Requests will appear here when customers use your custom order or quote forms." />
      ) : (
        <div className="stack">
          {list.map((r) => {
            const st = ENQUIRY_STATUS[r.status]
            const wa = waLink(r.buyer_phone, `Hi ${r.buyer_name || ''}, this is ${shop.name} about your request for "${r.product_name || 'our shop'}".`)
            return (
              <article key={r.id} className="card stack">
                <header className="row wrap between">
                  <div>
                    <strong>{r.product_name || 'General question'}</strong>
                    <div className="muted small">
                      {r.buyer_name} · {fmtDate(r.created_at, true)}
                    </div>
                  </div>
                  <div className="row wrap tight">
                    <Badge tone="accent">{KIND[r.kind]}</Badge>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </header>
                <dl className="kv">
                  {Object.entries(r.details || {}).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                  {r.quantity ? (
                    <div>
                      <dt>Quantity</dt>
                      <dd>{r.quantity}</dd>
                    </div>
                  ) : null}
                  {r.delivery_date && (
                    <div>
                      <dt>Date needed</dt>
                      <dd>{fmtDate(r.delivery_date)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${r.buyer_phone}`}>{r.buyer_phone}</a>
                    </dd>
                  </div>
                  {r.message && (
                    <div>
                      <dt>Message</dt>
                      <dd className="pre-wrap">{r.message}</dd>
                    </div>
                  )}
                  {r.quote_amount != null && (
                    <div>
                      <dt>Your quote</dt>
                      <dd>
                        {formatPrice(r.quote_amount, currency)}
                        {r.quote_note ? ` · ${r.quote_note}` : ''}
                      </dd>
                    </div>
                  )}
                </dl>
                {r.reference_image && (
                  <a href={r.reference_image} target="_blank" rel="noopener noreferrer" className="ref-img">
                    <img src={r.reference_image} alt="Customer reference" loading="lazy" />
                  </a>
                )}
                <div className="row wrap">
                  {['new', 'quoted'].includes(r.status) && (
                    <button type="button" className="btn btn-accent btn-sm" onClick={() => openQuote(r)}>
                      {r.status === 'quoted' ? 'Update quotation' : 'Send quotation'}
                    </button>
                  )}
                  {r.status === 'new' && r.kind === 'custom' && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setStatus(r, 'accepted', 'Custom order confirmed.')}>
                      <Icon name="check" size={16} /> Confirm order
                    </button>
                  )}
                  {['new', 'quoted'].includes(r.status) && (
                    <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => setStatus(r, 'declined', 'Request declined.')}>
                      Decline
                    </button>
                  )}
                  {['accepted', 'declined'].includes(r.status) && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus(r, 'closed', 'Request closed.')}>
                      Close
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

      <Modal
        open={Boolean(quoting)}
        onClose={() => setQuoting(null)}
        title="Send quotation"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setQuoting(null)}>
              Cancel
            </button>
            <button type="submit" form="quote-form" className="btn btn-accent" disabled={busy}>
              {busy ? 'Sending...' : 'Send quotation'}
            </button>
          </>
        }
      >
        <form id="quote-form" className="stack" onSubmit={sendQuote}>
          <Field label={`Total price (${currency})`}>
            <input className="input" type="number" min="0" step="0.01" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Note to the customer (optional)">
            <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="What is included, how long it takes, etc." />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
