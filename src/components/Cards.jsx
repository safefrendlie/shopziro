import { Link } from 'react-router-dom'
import Icon from './Icon'
import { Badge, Stars } from './ui'
import { cx, initials, mix, priceLabel, STOCK_LABEL, OFFER_LABEL } from '../lib/utils'
import { resolveTheme } from '../lib/utils'

export function ShopCard({ shop }) {
  const c = shop.config || {}
  const accent = resolveTheme(c).accent
  const bannerStyle = c.banner_url
    ? { backgroundImage: `url(${c.banner_url})` }
    : { background: `linear-gradient(135deg, ${accent}, ${mix(accent, '#000000', 0.55)})` }
  return (
    <Link to={`/shop/${shop.slug}`} className="shop-card">
      <div className="shop-card-banner" style={bannerStyle}>
        {shop.featured && <span className="badge badge-accent shop-card-flag">Featured</span>}
      </div>
      <div className="shop-card-body">
        <div className="avatar avatar-lg shop-card-logo">
          {c.logo_url ? <img src={c.logo_url} alt="" loading="lazy" /> : <span>{initials(shop.name)}</span>}
        </div>
        <h3>{shop.name}</h3>
        <p className="muted">
          {shop.category}
          {shop.city ? ` · ${shop.city}` : ''}
        </p>
        <div className="row tight">
          <Stars value={shop.rating_avg} size={14} />
          <small className="muted">
            {Number(shop.rating_count) > 0 ? `${Number(shop.rating_avg).toFixed(1)} (${shop.rating_count})` : 'New'}
          </small>
        </div>
      </div>
    </Link>
  )
}

export function ProductCard({ product, currency, to, shopName, onClick }) {
  const img = product.images?.[0]
  const out = product.stock_status === 'out_of_stock'
  const body = (
    <>
      <div className="product-media">
        {img ? <img src={img} alt={product.name} loading="lazy" /> : <div className="product-noimg"><Icon name="image" size={28} /></div>}
        <div className="product-flags">
          {product.kind === 'service' && <Badge tone="info">Service</Badge>}
          {product.offer_type !== 'fixed' && <Badge tone="accent">{OFFER_LABEL[product.offer_type]}</Badge>}
          {out && <Badge tone="bad">{STOCK_LABEL.out_of_stock}</Badge>}
          {product.stock_status === 'limited' && <Badge tone="warn">{STOCK_LABEL.limited}</Badge>}
        </div>
      </div>
      <div className="product-info">
        <h4>{product.name}</h4>
        {shopName && <small className="muted">{shopName}</small>}
        <strong className="product-price">{priceLabel(product, currency)}</strong>
      </div>
    </>
  )
  if (to) {
    return (
      <Link to={to} className={cx('product-card', out && 'is-out')}>
        {body}
      </Link>
    )
  }
  return (
    <div className={cx('product-card', out && 'is-out')} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {body}
    </div>
  )
}
