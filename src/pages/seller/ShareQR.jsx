import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon'
import { QRCard, ShareModal, nativeShare, withRef } from '../../components/Share'
import { CopyButton, Empty, Field, PageLoader, Tabs } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { linkWarning, productLink, shopLink } from '../../lib/utils'

const PLATFORMS = [
  ['Instagram bio', 'instagram', 'instagram'],
  ['WhatsApp status', 'whatsapp', 'whatsapp'],
  ['Facebook page', 'facebook', 'facebook'],
  ['TikTok bio', 'tiktok', 'tiktok'],
  ['YouTube description', 'youtube', 'youtube'],
  ['X (Twitter) bio', 'x', 'xlogo'],
]

/** One row: label, the link itself, and Copy / Open / Share buttons. */
function LinkRow({ label, icon, url, onShare, sub }) {
  return (
    <div className="link-row">
      <div className="link-label">
        {icon && <Icon name={icon} size={18} />}
        <span>
          <strong>{label}</strong>
          {sub && <small className="muted block clip">{sub}</small>}
        </span>
      </div>
      <input className="input" readOnly value={url} aria-label={`${label} link`} onFocus={(e) => e.target.select()} />
      <div className="row tight link-actions">
        <CopyButton text={url} label="Copy" />
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer">
          <Icon name="external" size={16} /> Open
        </a>
        <button type="button" className="btn btn-accent btn-sm" onClick={onShare}>
          <Icon name="share" size={16} /> Share
        </button>
      </div>
    </div>
  )
}

export default function ShareQR() {
  const { shop } = useOutletContext()
  const [tab, setTab] = useState('links')
  const [products, setProducts] = useState(null)
  const [q, setQ] = useState('')
  const [target, setTarget] = useState('shop')
  const [sharing, setSharing] = useState(null) // { url, title, text }
  const warning = useMemo(() => linkWarning(), [])

  useEffect(() => {
    let alive = true
    supabase
      .from('products')
      .select('id,name,kind,active')
      .eq('shop_id', shop.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => alive && setProducts(data || []))
    return () => {
      alive = false
    }
  }, [shop.id])

  const url = shopLink(shop.slug)
  const list = (products || []).filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
  const selected = target === 'shop' ? null : (products || []).find((p) => p.id === target)
  const qrUrl = selected ? productLink(shop.slug, selected.id) : url
  const qrTitle = selected ? selected.name : shop.name

  const share = async (item) => {
    const done = await nativeShare({ title: item.title, text: item.text, url: item.url })
    if (!done) setSharing(item)
  }

  if (products === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Share and QR</h1>
        <p className="muted">Every link and QR code opens your shop directly. Customers do not need an account to look around.</p>
      </div>

      {warning && (
        <div className="notice notice-bad">
          <Icon name="shield" />
          <div>
            <strong>These links may not open for your customers</strong>
            <p>{warning}</p>
          </div>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'links', label: 'Links' },
          { value: 'qr', label: 'QR codes' },
        ]}
      />

      {tab === 'links' ? (
        <>
          <div className="card stack">
            <h3>Your shop link</h3>
            <LinkRow
              label={shop.name}
              icon="store"
              url={url}
              onShare={() => share({ url: withRef(url, 'share'), title: shop.name, text: `Visit ${shop.name} on Shopziro` })}
            />
            {!shop.published && <p className="hint">Your shop is still a draft. Publish it in Customise so customers can open this link.</p>}
          </div>

          <div className="card stack">
            <h3>One link for each place you promote</h3>
            <p className="muted small">Same shop, different tag, so Analytics can show which platform brings visitors.</p>
            {PLATFORMS.map(([label, ref, icon]) => (
              <LinkRow
                key={ref}
                label={label}
                icon={icon}
                url={shopLink(shop.slug, ref)}
                onShare={() => share({ url: shopLink(shop.slug, ref), title: shop.name, text: `Visit ${shop.name} on Shopziro` })}
              />
            ))}
          </div>

          <div className="card stack">
            <div className="row wrap between">
              <h3>Product and service links</h3>
              {products.length > 6 && (
                <label className="search-box compact">
                  <Icon name="search" size={16} />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search products" />
                </label>
              )}
            </div>
            {products.length === 0 ? (
              <Empty icon="box" title="No products yet" text="Add products to get a link for each one." />
            ) : list.length === 0 ? (
              <p className="muted">Nothing matches your search.</p>
            ) : (
              list.slice(0, 40).map((p) => (
                <LinkRow
                  key={p.id}
                  label={p.name}
                  sub={p.kind === 'service' ? 'Service' : 'Product'}
                  url={productLink(shop.slug, p.id)}
                  onShare={() => share({ url: productLink(shop.slug, p.id, 'share'), title: p.name, text: `${p.name} at ${shop.name}` })}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="card stack">
          <h3>QR code</h3>
          <Field label="What should the QR code open?">
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="shop">My whole shop</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <QRCard key={qrUrl} url={qrUrl} name={selected ? `${shop.slug}-${selected.id.slice(0, 6)}` : shop.slug} title={qrTitle} />
          <p className="hint">Print it on packaging, menus, bills or your shop door. Make it at least 3 cm wide so phones scan it easily.</p>
        </div>
      )}

      {sharing && <ShareModal open onClose={() => setSharing(null)} url={sharing.url} title={sharing.title} text={sharing.text} />}
    </div>
  )
}
