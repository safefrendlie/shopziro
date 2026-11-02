import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, Field, Modal, PageLoader, StarInput, Stars, useConfirm } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useAuth } from '../../state/auth'
import { useToast } from '../../state/toast'
import { fmtDate } from '../../lib/utils'

export default function BuyerReviews() {
  const { user } = useAuth()
  const toast = useToast()
  const [confirm, confirmNode] = useConfirm()
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data, error } = await supabase.from('reviews').select('*, shops(name,slug)').eq('buyer_id', user.id).order('created_at', { ascending: false })
    if (error) toast.error(errText(error))
    setRows(data || [])
  }
  useEffect(() => {
    load()
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault()
    if (!rating) return toast.error('Please choose a star rating.')
    setBusy(true)
    const { error } = await supabase.from('reviews').update({ rating, comment: comment.trim() || null }).eq('id', edit.id)
    setBusy(false)
    if (error) return toast.error(errText(error))
    toast.success('Review updated.')
    setEdit(null)
    load()
  }

  const remove = async (r) => {
    if (!(await confirm('Delete your review?', { confirmText: 'Delete', danger: true }))) return
    const { error } = await supabase.from('reviews').delete().eq('id', r.id)
    if (error) return toast.error(errText(error))
    toast.success('Review deleted.')
    load()
  }

  if (rows === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">My reviews</h1>
        <p className="muted">You can review a shop after the seller marks your order as completed. Go to My Orders to write one.</p>
      </div>
      {rows.length === 0 ? (
        <Empty icon="star" title="No reviews yet" text="Your verified reviews will appear here." />
      ) : (
        <div className="stack">
          {rows.map((r) => (
            <article key={r.id} className="card stack-sm">
              <div className="row wrap between">
                <strong>{r.shops ? <Link to={`/shop/${r.shops.slug}`}>{r.shops.name}</Link> : 'Shop'}</strong>
                <small className="muted">{fmtDate(r.created_at)}</small>
              </div>
              <Stars value={r.rating} />
              {r.comment && <p className="pre-wrap">{r.comment}</p>}
              {r.seller_reply && (
                <div className="reply-box">
                  <strong>Seller reply</strong>
                  <p className="pre-wrap">{r.seller_reply}</p>
                </div>
              )}
              <div className="row wrap">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEdit(r)
                    setRating(r.rating)
                    setComment(r.comment || '')
                  }}
                >
                  Edit
                </button>
                <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(r)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title="Edit review"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button type="submit" form="edit-review" className="btn btn-accent" disabled={busy}>
              {busy ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form id="edit-review" className="stack" onSubmit={save}>
          <StarInput value={rating} onChange={setRating} />
          <Field label="Your experience">
            <textarea className="textarea" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
          </Field>
        </form>
      </Modal>
      {confirmNode}
    </div>
  )
}
