import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ImageUploader from '../../components/ImageUploader'
import ShopView from '../../components/ShopView'
import { Field, PageLoader, Toggle } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useToast } from '../../state/toast'
import { FONTS, THEMES, cx } from '../../lib/utils'

// Only these appearance settings go through the draft. Business details (logo, contact) save instantly in My Shop.
const DRAFT_KEYS = ['theme', 'bg', 'text', 'accent', 'font', 'radius', 'cols', 'banner_url', 'tagline', 'announcement', 'show_reviews', 'show3d']

const pick = (cfg) => {
  const o = {}
  DRAFT_KEYS.forEach((k) => {
    if (cfg[k] !== undefined) o[k] = cfg[k]
  })
  return o
}

export default function Builder() {
  const { shop, updateShop } = useOutletContext()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState('')
  const [products, setProducts] = useState([])
  const [device, setDevice] = useState('mobile')
  const first = useRef(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [d, p] = await Promise.all([
        supabase.from('shop_drafts').select('data').eq('shop_id', shop.id).maybeSingle(),
        supabase.from('products').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(24),
      ])
      if (!alive) return
      setDraft({ ...pick(shop.config || {}), ...(d.data?.data || {}) })
      setProducts(p.data || [])
      setLoading(false)
      first.current = true
    })()
    return () => {
      alive = false
    }
  }, [shop.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const previewShop = useMemo(() => (draft ? { ...shop, config: { ...(shop.config || {}), ...draft } } : shop), [shop, draft])

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }

  const saveDraft = async (silent = false) => {
    setBusy('save')
    const { error } = await supabase.from('shop_drafts').upsert({ shop_id: shop.id, data: draft, updated_at: new Date().toISOString() })
    setBusy('')
    if (error) {
      toast.error(errText(error))
      return false
    }
    setDirty(false)
    if (!silent) toast.success('Draft saved. Your public shop has not changed yet.')
    return true
  }

  const publish = async () => {
    if (!window.confirm('Publish these changes? Your public shop will update immediately.')) return
    setBusy('publish')
    const ok = await saveDraft(true)
    if (!ok) return setBusy('')
    const { error } = await updateShop({ published: true, config: draft })
    setBusy('')
    if (error) return toast.error(errText(error))
    setDirty(false)
    toast.success('Published! Your shop is live with the new design.')
  }

  const discard = async () => {
    if (!window.confirm('Discard your draft and go back to the published design?')) return
    setDraft(pick(shop.config || {}))
    await supabase.from('shop_drafts').delete().eq('shop_id', shop.id)
    setDirty(false)
    toast.info('Draft discarded.')
  }

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined
    const h = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  if (loading || !draft) return <PageLoader />

  const custom = draft.theme === 'custom'

  return (
    <div className="stack-lg">
      <div className="row wrap between">
        <div>
          <h1 className="page-title">Customise your shop</h1>
          <p className="muted">Changes appear in the preview only. Nothing goes public until you press Publish.</p>
        </div>
        <div className="row wrap">
          {dirty && <span className="badge badge-warn">Unsaved changes</span>}
          <button type="button" className="btn btn-ghost" onClick={() => saveDraft(false)} disabled={busy !== '' || !dirty}>
            {busy === 'save' ? 'Saving...' : 'Save draft'}
          </button>
          <button type="button" className="btn btn-accent" onClick={publish} disabled={busy !== ''}>
            {busy === 'publish' ? 'Publishing...' : shop.published ? 'Publish changes' : 'Publish shop'}
          </button>
        </div>
      </div>

      <div className="builder">
        <div className="builder-panel stack-lg">
          <div className="card stack">
            <h3>Theme</h3>
            <div className="theme-grid">
              {Object.entries(THEMES).map(([k, t]) => (
                <button
                  type="button"
                  key={k}
                  className={cx('theme-card', draft.theme === k && 'is-active')}
                  onClick={() => set({ theme: k })}
                  aria-pressed={draft.theme === k}
                >
                  <span className="theme-swatch" style={{ background: t.bg, borderColor: t.accent }}>
                    <i style={{ background: t.accent }} />
                    <i style={{ background: t.text }} />
                  </span>
                  <strong>{t.label}</strong>
                  <small>{t.blurb}</small>
                </button>
              ))}
            </div>
          </div>

          {custom && (
            <div className="card stack">
              <h3>Your colours and style</h3>
              <div className="grid-3">
                <Field label="Background">
                  <input className="color" type="color" value={draft.bg || '#101014'} onChange={(e) => set({ bg: e.target.value })} />
                </Field>
                <Field label="Text">
                  <input className="color" type="color" value={draft.text || '#f4f4f8'} onChange={(e) => set({ text: e.target.value })} />
                </Field>
                <Field label="Buttons and accents">
                  <input className="color" type="color" value={draft.accent || '#c8ff4d'} onChange={(e) => set({ accent: e.target.value })} />
                </Field>
              </div>
              <Field label="Font">
                <select className="select" value={draft.font || 'grotesk'} onChange={(e) => set({ font: e.target.value })}>
                  {Object.entries(FONTS).map(([k, f]) => (
                    <option key={k} value={k}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Corner roundness (${draft.radius ?? 16}px)`}>
                <input type="range" min="0" max="32" value={draft.radius ?? 16} onChange={(e) => set({ radius: Number(e.target.value) })} />
              </Field>
            </div>
          )}

          <div className="card stack">
            <h3>Banner and message</h3>
            <div className="field">
              <span className="label">Banner image</span>
              <ImageUploader value={draft.banner_url || ''} onChange={(u) => set({ banner_url: u })} shape="wide" label="Upload banner" compact />
            </div>
            <Field label="Tagline">
              <input className="input" value={draft.tagline || ''} onChange={(e) => set({ tagline: e.target.value })} maxLength={90} placeholder="A short line under your shop name" />
            </Field>
            <Field label="Announcement bar (optional)">
              <input className="input" value={draft.announcement || ''} onChange={(e) => set({ announcement: e.target.value })} maxLength={120} placeholder="e.g. Free delivery this weekend" />
            </Field>
          </div>

          <div className="card stack">
            <h3>Layout</h3>
            <Field label="Product columns on large screens">
              <div className="seg">
                {[2, 3, 4].map((n) => (
                  <button type="button" key={n} className={cx('seg-btn', (draft.cols || 3) === n && 'is-active')} onClick={() => set({ cols: n })}>
                    {n} columns
                  </button>
                ))}
              </div>
            </Field>
            <Toggle checked={draft.show_reviews !== false} onChange={(v) => set({ show_reviews: v })} label="Show reviews section" />
            <Toggle checked={draft.show3d !== false} onChange={(v) => set({ show3d: v })} label="Offer the 3D shop to visitors" hint="Visitors can always choose the normal store instead." />
          </div>

          <div className="row wrap">
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={discard}>
              Discard draft
            </button>
          </div>
        </div>

        <div className="builder-preview">
          <div className="row between">
            <strong>Live preview</strong>
            <div className="seg">
              <button type="button" className={cx('seg-btn', device === 'mobile' && 'is-active')} onClick={() => setDevice('mobile')}>
                Phone
              </button>
              <button type="button" className={cx('seg-btn', device === 'desktop' && 'is-active')} onClick={() => setDevice('desktop')}>
                Desktop
              </button>
            </div>
          </div>
          <div className={cx('device', `device-${device}`)}>
            <div className="device-screen">
              <ShopView shop={previewShop} products={products.filter((p) => p.active)} reviews={[]} preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
