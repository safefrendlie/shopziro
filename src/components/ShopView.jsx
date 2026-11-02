import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { Stars } from './ui'
import { ProductCard } from './Cards'
import { cx, fmtDate, initials, mix, resolveTheme, SOCIALS, socialUrl, themeVars, waLink } from '../lib/utils'

/**
 * The storefront. Used for the real public shop AND for the seller's live preview
 * (preview = true makes it non-interactive).
 */
export default function ShopView({
  shop,
  products = [],
  reviews = [],
  preview = false,
  favorite = false,
  onToggleFavorite,
  onShare,
  onOpen3D,
  allow3d = false,
}) {
  const c = shop.config || {}
  const vars = useMemo(() => themeVars(c), [c])
  const currency = c.currency || 'INR'
  const socials = c.socials || {}
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')

  const cats = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))], [products])
  const activeCat = cats.includes(cat) ? cat : 'All'
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return products.filter(
      (p) =>
        (activeCat === 'All' || p.category === activeCat) &&
        (!needle || `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(needle))
    )
  }, [products, activeCat, q])

  const accent = resolveTheme(c).accent
  const bannerStyle = c.banner_url
    ? { backgroundImage: `url(${c.banner_url})` }
    : { background: `linear-gradient(135deg, ${accent}, ${mix(accent, '#000000', 0.6)})` }

  const waUrl = waLink(socials.whatsapp, `Hi ${shop.name}, I found your shop on Shopziro and I have a question.`)
  const instaUrl = socials.instagram ? socialUrl('instagram', socials.instagram) : ''
  const connected = SOCIALS.filter((s) => socials[s.key])
  const showReviews = c.show_reviews !== false
  const avg = Number(shop.rating_avg) || 0
  const count = Number(shop.rating_count) || 0

  return (
    <div className={cx('shop-root', preview && 'preview-lock')} data-theme={c.theme || 'minimal'} data-cols={c.cols || 3} style={vars}>
      {c.announcement && <div className="shop-announce">{c.announcement}</div>}

      <header className="shop-hero">
        <div className="shop-banner" style={bannerStyle} />
        <div className="shop-head">
          <div className="shop-logo">{c.logo_url ? <img src={c.logo_url} alt={`${shop.name} logo`} /> : <span>{initials(shop.name)}</span>}</div>
          <div className="shop-title">
            <h1>{shop.name || 'Your shop name'}</h1>
            {c.tagline && <p className="shop-tagline">{c.tagline}</p>}
            <div className="shop-meta">
              <span className="shop-chip">{shop.category || 'Category'}</span>
              {shop.city && (
                <span className="shop-chip">
                  <Icon name="pin" size={14} /> {shop.city}
                </span>
              )}
              <span className="shop-chip">
                <Stars value={avg} size={14} /> {count > 0 ? `${avg.toFixed(1)} (${count})` : 'No reviews yet'}
              </span>
            </div>
          </div>
          <div className="shop-actions">
            {waUrl && (
              <a className="shop-btn shop-btn-solid" href={waUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" size={18} /> Chat
              </a>
            )}
            {instaUrl && (
              <a className="shop-btn" href={instaUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="instagram" size={18} /> Follow
              </a>
            )}
            <button type="button" className="shop-btn" onClick={onShare} aria-label="Share shop">
              <Icon name="share" size={18} />
            </button>
            <button type="button" className={cx('shop-btn', favorite && 'is-on')} onClick={onToggleFavorite} aria-label={favorite ? 'Remove from favourites' : 'Save shop'}>
              <Icon name="heart" size={18} filled={favorite} />
            </button>
          </div>
        </div>
        {allow3d && c.show3d !== false && (
          <button type="button" className="shop-3d-cta" onClick={onOpen3D}>
            <Icon name="cube" size={20} />
            <span>
              <strong>Walk into the 3D shop</strong>
              <small>Optional. The normal store is right below.</small>
            </span>
            <Icon name="arrow-right" size={18} />
          </button>
        )}
      </header>

      <section className="shop-section">
        <div className="shop-toolbar">
          <div className="shop-chips" role="tablist" aria-label="Categories">
            {cats.map((k) => (
              <button type="button" key={k} className={cx('shop-pill', activeCat === k && 'is-active')} onClick={() => setCat(k)}>
                {k}
              </button>
            ))}
          </div>
          <label className="shop-search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this shop" aria-label="Search this shop" />
          </label>
        </div>

        {list.length === 0 ? (
          <div className="shop-empty">
            <Icon name="box" size={28} />
            <p>{products.length === 0 ? 'No products or services yet. Check back soon.' : 'Nothing matches your search.'}</p>
          </div>
        ) : (
          <div className="shop-grid">
            {list.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                currency={currency}
                to={preview ? undefined : `/shop/${shop.slug}/product/${p.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {(c.description || c.address || c.phone || connected.length > 0) && (
        <section className="shop-section shop-about">
          <h2>About {shop.name}</h2>
          {c.description && <p className="shop-desc">{c.description}</p>}
          <ul className="shop-contact">
            {c.address && (
              <li>
                <Icon name="pin" size={16} /> {c.address}
              </li>
            )}
            {c.phone && (
              <li>
                <Icon name="phone" size={16} /> <a href={`tel:${c.phone}`}>{c.phone}</a>
              </li>
            )}
          </ul>
          {connected.length > 0 && (
            <div className="shop-socials">
              {connected.map((s) => (
                <a key={s.key} className="shop-btn" href={socialUrl(s.key, socials[s.key])} target="_blank" rel="noopener noreferrer">
                  <Icon name={s.icon} size={18} /> {s.label}
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {showReviews && (
        <section className="shop-section">
          <h2>Reviews</h2>
          {count === 0 ? (
            <p className="shop-desc">No reviews yet. Customers who complete an order can leave a verified review.</p>
          ) : (
            <div className="shop-review-sum">
              <strong>{avg.toFixed(1)}</strong>
              <Stars value={avg} size={18} />
              <span>
                {count} review{count === 1 ? '' : 's'}
              </span>
            </div>
          )}
          <div className="shop-reviews">
            {reviews.slice(0, 8).map((r) => (
              <article key={r.id} className="shop-review">
                <div className="shop-review-top">
                  <strong>{r.buyer_name || 'Customer'}</strong>
                  <Stars value={r.rating} size={14} />
                  <small>{fmtDate(r.created_at)}</small>
                </div>
                {r.verified && (
                  <small className="shop-verified">
                    <Icon name="shield" size={13} /> Verified purchase
                  </small>
                )}
                {r.comment && <p>{r.comment}</p>}
                {r.image_url && <img className="shop-review-img" src={r.image_url} alt="Review" loading="lazy" />}
                {r.seller_reply && (
                  <div className="shop-reply">
                    <strong>Reply from {shop.name}</strong>
                    <p>{r.seller_reply}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="shop-foot">
        <Link to="/" className="shop-powered">
          Powered by <strong>Shopziro</strong>. Your Business. Your World.
        </Link>
      </footer>
    </div>
  )
}
