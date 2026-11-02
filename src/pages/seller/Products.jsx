import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'
import ImageUploader from '../../components/ImageUploader'
import { Badge, Empty, Field, Modal, PageLoader, Toggle, useConfirm } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useToast } from '../../state/toast'
import { OFFER_LABEL, PLAN_LIMITS, STOCK_LABEL, formatPrice, priceLabel } from '../../lib/utils'

const splitList = (s) =>
  Array.from(
    new Set(
      (s || '')
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean)
    )
  ).slice(0, 30)

function blank(kind) {
  return {
    id: null,
    kind,
    offer_type: 'fixed',
    name: '',
    description: '',
    category: 'General',
    price: '',
    images: [],
    stock_status: 'in_stock',
    variations: '',
    custom_fields: '',
    active: true,
  }
}

function ProductForm({ initial, categories, shop, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const isService = f.kind === 'service'

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (f.name.trim().length < 2) errs.name = 'Enter a name (at least 2 characters).'
    const price = f.price === '' ? null : Number(f.price)
    if (f.offer_type === 'fixed' && (price === null || !(price >= 0))) errs.price = 'Enter a price (0 or more).'
    if (f.offer_type === 'custom' && price !== null && !(price >= 0)) errs.price = 'Price must be 0 or more.'
    if (price !== null && price > 99999999) errs.price = 'That price is too large.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const row = {
      kind: f.kind,
      offer_type: f.offer_type,
      name: f.name.trim(),
      description: f.description.trim() || null,
      category: f.category.trim() || 'General',
      price: f.offer_type === 'quote' ? null : price,
      images: f.images,
      stock_status: isService ? 'in_stock' : f.stock_status,
      variations: f.offer_type === 'fixed' ? splitList(f.variations) : [],
      custom_fields: f.offer_type === 'custom' ? splitList(f.custom_fields) : [],
      active: f.active,
    }
    setBusy(true)
    const res = f.id
      ? await supabase.from('products').update(row).eq('id', f.id)
      : await supabase.from('products').insert({ ...row, shop_id: shop.id })
    setBusy(false)
    if (res.error) return toast.error(errText(res.error))
    toast.success(f.id ? 'Saved.' : isService ? 'Service added.' : 'Product added.')
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`${f.id ? 'Edit' : 'Add'} ${isService ? 'service' : 'product'}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="product-form" className="btn btn-accent" disabled={busy}>
            {busy ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="product-form" className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <span className="label">Photos (up to 6, first one is the cover)</span>
          <ImageUploader multiple max={6} value={f.images} onChange={(images) => setF((x) => ({ ...x, images }))} label="Add photos" />
        </div>
        <Field label="Name" error={errors.name}>
          <input className="input" value={f.name} onChange={set('name')} maxLength={120} />
        </Field>
        <Field label="Description">
          <textarea className="textarea" rows={4} value={f.description} onChange={set('description')} maxLength={2000} />
        </Field>

        <div className="field">
          <span className="label">How is it sold?</span>
          <div className="radio-list">
            {Object.entries(OFFER_LABEL).map(([k, label]) => (
              <label key={k} className={`radio-card ${f.offer_type === k ? 'is-active' : ''}`}>
                <input type="radio" name="offer" value={k} checked={f.offer_type === k} onChange={set('offer_type')} />
                <span>
                  <strong>{label}</strong>
                  <small className="muted">
                    {k === 'fixed' && 'Set price. Customers add to cart and order.'}
                    {k === 'custom' && 'Customers fill a form (size, flavour, date, photo).'}
                    {k === 'quote' && 'Customers send a request, you reply with a price.'}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid-2">
          {f.offer_type !== 'quote' && (
            <Field
              label={f.offer_type === 'custom' ? `Starting price (optional, ${shop.config?.currency || 'INR'})` : `Price (${shop.config?.currency || 'INR'})`}
              error={errors.price}
            >
              <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={f.price} onChange={set('price')} />
            </Field>
          )}
          <Field label="Category" hint="Pick one or type a new one.">
            <input className="input" list="cat-list" value={f.category} onChange={set('category')} maxLength={40} />
            <datalist id="cat-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        {!isService && (
          <Field label="Availability">
            <select className="select" value={f.stock_status} onChange={set('stock_status')}>
              {Object.entries(STOCK_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        )}

        {f.offer_type === 'fixed' && (
          <Field label="Variations (optional)" hint="One per line or comma separated, e.g. Small, Medium, Large.">
            <textarea className="textarea" rows={2} value={f.variations} onChange={set('variations')} />
          </Field>
        )}
        {f.offer_type === 'custom' && (
          <Field label="Questions for the customer" hint="One per line or comma separated, e.g. Cake size, Flavour, Design preference.">
            <textarea className="textarea" rows={3} value={f.custom_fields} onChange={set('custom_fields')} placeholder={'Cake size\nFlavour\nDesign preference'} />
          </Field>
        )}

        <Toggle checked={f.active} onChange={(v) => setF((x) => ({ ...x, active: v }))} label="Visible in my shop" hint="Turn off to hide it without deleting." />
      </form>
    </Modal>
  )
}

export default function Products({ kind }) {
  const { shop } = useOutletContext()
  const toast = useToast()
  const [confirm, confirmNode] = useConfirm()
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const isService = kind === 'service'
  const currency = shop.config?.currency || 'INR'

  const load = async () => {
    const { data, error } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false })
    if (error) toast.error(errText(error))
    setRows(data || [])
  }
  useEffect(() => {
    setRows(null)
    load()
  }, [shop.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(
    () => Array.from(new Set([...(shop.config?.categories || []), ...(rows || []).map((r) => r.category)].filter(Boolean))),
    [rows, shop.config]
  )

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (rows || []).filter((r) => r.kind === kind && (!needle || `${r.name} ${r.category}`.toLowerCase().includes(needle)))
  }, [rows, kind, q])

  const total = (rows || []).length
  const limit = PLAN_LIMITS[shop.plan] || PLAN_LIMITS.free

  const edit = (r) =>
    setEditing({
      ...r,
      price: r.price ?? '',
      description: r.description || '',
      variations: (r.variations || []).join('\n'),
      custom_fields: (r.custom_fields || []).join('\n'),
    })

  const add = () => {
    if (total >= limit) return toast.error(`Your ${shop.plan} plan allows up to ${limit} items.`)
    setEditing(blank(kind))
  }

  const remove = async (r) => {
    if (!(await confirm(`Delete "${r.name}"? This cannot be undone.`, { confirmText: 'Delete', danger: true }))) return
    const { error } = await supabase.from('products').delete().eq('id', r.id)
    if (error) return toast.error(errText(error))
    toast.success('Deleted.')
    load()
  }

  const toggle = async (r) => {
    const { error } = await supabase.from('products').update({ active: !r.active }).eq('id', r.id)
    if (error) return toast.error(errText(error))
    setRows((l) => l.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x)))
  }

  if (rows === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div className="row wrap between">
        <div>
          <h1 className="page-title">{isService ? 'Services' : 'Products'}</h1>
          <p className="muted">
            {total} of {limit.toLocaleString()} items used on your {shop.plan} plan.
          </p>
        </div>
        <button type="button" className="btn btn-accent" onClick={add}>
          <Icon name="plus" size={18} /> Add {isService ? 'service' : 'product'}
        </button>
      </div>

      {list.length > 0 || q ? (
        <label className="search-box">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search your ${isService ? 'services' : 'products'}`} aria-label="Search" />
        </label>
      ) : null}

      {list.length === 0 ? (
        <Empty
          icon={isService ? 'calendar' : 'box'}
          title={q ? 'Nothing matches your search' : `No ${isService ? 'services' : 'products'} yet`}
          text={q ? undefined : 'Add your first one so customers have something to order.'}
          action={
            !q && (
              <button type="button" className="btn btn-accent" onClick={add}>
                Add {isService ? 'service' : 'product'}
              </button>
            )
          }
        />
      ) : (
        <div className="table-list">
          {list.map((r) => (
            <div key={r.id} className="row-card">
              <div className="row-thumb">{r.images?.[0] ? <img src={r.images[0]} alt="" loading="lazy" /> : <Icon name="image" />}</div>
              <div className="row-main">
                <strong>{r.name}</strong>
                <div className="row wrap tight">
                  <Badge tone="accent">{OFFER_LABEL[r.offer_type]}</Badge>
                  {!r.active && <Badge tone="muted">Hidden</Badge>}
                  {r.kind === 'product' && r.stock_status !== 'in_stock' && <Badge tone={r.stock_status === 'limited' ? 'warn' : 'bad'}>{STOCK_LABEL[r.stock_status]}</Badge>}
                  <small className="muted">{r.category}</small>
                </div>
              </div>
              <strong className="row-price">{r.offer_type === 'fixed' ? formatPrice(r.price, currency) : priceLabel(r, currency)}</strong>
              <div className="row tight">
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => toggle(r)} aria-label={r.active ? 'Hide' : 'Show'} title={r.active ? 'Hide from shop' : 'Show in shop'}>
                  <Icon name="eye" size={18} className={r.active ? '' : 'dim'} />
                </button>
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => edit(r)} aria-label={`Edit ${r.name}`}>
                  <Icon name="edit" size={18} />
                </button>
                <button type="button" className="btn btn-icon btn-ghost" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProductForm
          initial={editing}
          categories={categories}
          shop={shop}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
      {confirmNode}
    </div>
  )
}
