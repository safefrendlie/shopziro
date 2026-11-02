import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Empty, Field, Modal, PageLoader, Stars } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useToast } from '../../state/toast'
import { fmtDate } from '../../lib/utils'

export default function Reviews() {
  const { shop, reload } = useOutletContext()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [replying, setReplying] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('reviews').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => {
    load()
    reload()
  }, [shop.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e) => {
    e.preventDefault()
    if (text.trim().length < 2) return toast.error('Write a short reply first.')
    setBusy(true)
    const { error } = await supabase.rpc('reply_review', { p_review: replying.id, p_reply: text })
    setBusy(false)
    if (error) return toast.error(errText(error))
    toast.success('Reply posted.')
    setReplying(null)
    load()
  }

  if (rows === null) return <PageLoader />
  const avg = Number(shop.rating_avg) || 0

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Reviews</h1>
        <div className="row tight">
          <Stars value={avg} size={20} />
          <strong>{avg.toFixed(1)}</strong>
          <span className="muted">from {shop.rating_count} review{shop.rating_count === 1 ? '' : 's'}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty icon="star" title="No reviews yet" text="Customers can review you after you mark their order as completed." />
      ) : (
        <div className="stack">
          {rows.map((r) => (
            <article key={r.id} className="card stack-sm">
              <div className="row wrap between">
                <div className="row wrap tight">
                  <strong>{r.buyer_name || 'Customer'}</strong>
                  <Stars value={r.rating} size={16} />
                </div>
                <small className="muted">{fmtDate(r.created_at)}</small>
              </div>
              {r.comment && <p className="pre-wrap">{r.comment}</p>}
              {r.image_url && (
                <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="ref-img">
                  <img src={r.image_url} alt="Review" loading="lazy" />
                </a>
              )}
              {r.seller_reply ? (
                <div className="reply-box">
                  <strong>Your reply</strong>
                  <p className="pre-wrap">{r.seller_reply}</p>
                </div>
              ) : null}
              <div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setReplying(r)
                    setText(r.seller_reply || '')
                  }}
                >
                  {r.seller_reply ? 'Edit reply' : 'Reply'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(replying)}
        onClose={() => setReplying(null)}
        title="Reply to review"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setReplying(null)}>
              Cancel
            </button>
            <button type="submit" form="reply-form" className="btn btn-accent" disabled={busy}>
              {busy ? 'Posting...' : 'Post reply'}
            </button>
          </>
        }
      >
        <form id="reply-form" onSubmit={send}>
          <Field label="Your public reply">
            <textarea className="textarea" rows={4} autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={600} />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
