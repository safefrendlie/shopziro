import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Empty, Field, Modal, PageLoader, useConfirm } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useToast } from '../../state/toast'

export default function Categories() {
  const { shop, updateShop } = useOutletContext()
  const toast = useToast()
  const [confirm, confirmNode] = useConfirm()
  const [products, setProducts] = useState(null)
  const [name, setName] = useState('')
  const [rename, setRename] = useState(null) // {from, to}
  const saved = shop.config?.categories || []

  const load = async () => {
    const { data } = await supabase.from('products').select('id,category').eq('shop_id', shop.id)
    setProducts(data || [])
  }
  useEffect(() => {
    load()
  }, [shop.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useMemo(() => {
    const map = new Map()
    saved.forEach((c) => map.set(c, 0))
    ;(products || []).forEach((p) => map.set(p.category, (map.get(p.category) || 0) + 1))
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [products, saved])

  const add = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2) return toast.error('Enter a category name (at least 2 characters).')
    if (cats.some(([c]) => c.toLowerCase() === n.toLowerCase())) return toast.error('That category already exists.')
    const { error } = await updateShop({ config: { categories: [...saved, n] } })
    if (error) return toast.error(errText(error))
    setName('')
    toast.success('Category added. Choose it when adding products.')
  }

  const doRename = async (e) => {
    e.preventDefault()
    const to = rename.to.trim()
    if (to.length < 2) return toast.error('Enter a category name (at least 2 characters).')
    if (to !== rename.from && cats.some(([c]) => c.toLowerCase() === to.toLowerCase())) return toast.error('That category already exists.')
    const { error } = await supabase.from('products').update({ category: to }).eq('shop_id', shop.id).eq('category', rename.from)
    if (error) return toast.error(errText(error))
    await updateShop({ config: { categories: saved.map((c) => (c === rename.from ? to : c)) } })
    setRename(null)
    toast.success('Category renamed.')
    load()
  }

  const remove = async (c, count) => {
    const msg = count
      ? `Delete "${c}"? Its ${count} item${count === 1 ? '' : 's'} will move to "General".`
      : `Delete the empty category "${c}"?`
    if (!(await confirm(msg, { confirmText: 'Delete', danger: true }))) return
    if (count) {
      const { error } = await supabase.from('products').update({ category: 'General' }).eq('shop_id', shop.id).eq('category', c)
      if (error) return toast.error(errText(error))
    }
    const { error } = await updateShop({ config: { categories: saved.filter((x) => x !== c) } })
    if (error) return toast.error(errText(error))
    toast.success('Category deleted.')
    load()
  }

  if (products === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Categories</h1>
        <p className="muted">Organise your shop into sections. Customers can filter by these on your storefront.</p>
      </div>

      <form className="card row wrap" onSubmit={add}>
        <Field label="New category" className="grow">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Birthday cakes" />
        </Field>
        <button className="btn btn-accent align-end">
          <Icon name="plus" size={18} /> Add
        </button>
      </form>

      {cats.length === 0 ? (
        <Empty icon="tag" title="No categories yet" text="Categories appear here as you add products, or you can create them above." />
      ) : (
        <div className="table-list">
          {cats.map(([c, count]) => (
            <div key={c} className="row-card">
              <div className="row-main">
                <strong>{c}</strong>
                <small className="muted">
                  {count} item{count === 1 ? '' : 's'}
                </small>
              </div>
              <div className="row tight">
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => setRename({ from: c, to: c })} aria-label={`Rename ${c}`}>
                  <Icon name="edit" size={18} />
                </button>
                {c !== 'General' && (
                  <button type="button" className="btn btn-icon btn-ghost" onClick={() => remove(c, count)} aria-label={`Delete ${c}`}>
                    <Icon name="trash" size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(rename)}
        onClose={() => setRename(null)}
        title="Rename category"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRename(null)}>
              Cancel
            </button>
            <button type="submit" form="rename-form" className="btn btn-accent">
              Save
            </button>
          </>
        }
      >
        <form id="rename-form" onSubmit={doRename}>
          <Field label="Category name">
            <input className="input" autoFocus value={rename?.to || ''} onChange={(e) => setRename((r) => ({ ...r, to: e.target.value }))} maxLength={40} />
          </Field>
        </form>
      </Modal>
      {confirmNode}
    </div>
  )
}
