import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { ShopCard } from '../components/Cards'
import InstallButton from '../components/InstallButton'
import { Empty, Spinner } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAsync } from '../lib/hooks'
import { CATEGORIES } from '../lib/utils'

const CAT_ICON = {
  'Food & Bakery': 'sparkles',
  'Fashion & Boutique': 'tag',
  'Beauty & Salon': 'heart',
  'Gifts & Crafts': 'box',
  'Home & Decor': 'home',
  'Electronics & Mobile': 'bolt',
  'Health & Wellness': 'shield',
  'Education & Tutoring': 'calendar',
  'Photography & Events': 'image',
  'Repair & Home Services': 'settings',
  'Art & Design': 'edit',
  'Jewellery & Accessories': 'star',
  Other: 'store',
}

async function loadHome() {
  const base = () => supabase.from('shops').select('*').eq('published', true)
  const [trending, fresh, top, featured] = await Promise.all([
    base().order('visit_count', { ascending: false }).limit(8),
    base().order('created_at', { ascending: false }).limit(8),
    base().gt('rating_count', 0).order('rating_avg', { ascending: false }).limit(8),
    base().eq('featured', true).limit(8),
  ])
  const cities = new Set()
  ;[trending, fresh, top, featured].forEach((r) => (r.data || []).forEach((s) => s.city && cities.add(s.city)))
  return {
    trending: trending.data || [],
    fresh: fresh.data || [],
    top: top.data || [],
    featured: featured.data || [],
    cities: Array.from(cities).slice(0, 8),
  }
}

function Row({ title, subtitle, shops, to }) {
  if (!shops.length) return null
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <Link to={to} className="btn btn-ghost btn-sm">
          See all <Icon name="arrow-right" size={16} />
        </Link>
      </div>
      <div className="shop-rail">
        {shops.map((s) => (
          <ShopCard key={s.id} shop={s} />
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const { loading, data } = useAsync(loadHome, [])
  const none = data && !data.trending.length && !data.fresh.length

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-in">
          <span className="eyebrow">
            <Icon name="sparkles" size={14} /> Digital commerce for everyone
          </span>
          <h1 className="hero-title">
            Your Business.
            <br />
            <span className="grad-text">Your World.</span>
          </h1>
          <p className="hero-sub">
            Create, customise, showcase and grow your own online store in minutes. No coding, no stress. Share one link on Instagram,
            WhatsApp and everywhere else.
          </p>
          <div className="hero-cta">
            <Link to="/auth?mode=register&role=seller" className="btn btn-accent btn-lg">
              Create your shop <Icon name="arrow-right" size={18} />
            </Link>
            <Link to="/explore" className="btn btn-ghost btn-lg">
              Explore shops
            </Link>
          </div>
          <div className="hero-install">
            <InstallButton className="link-btn" label="Install the Shopziro app" />
          </div>
        </div>
      </section>

      <div className="container">
        <section className="bento" aria-label="What you get">
          <article className="bento-card bento-wide">
            <Icon name="store" size={26} />
            <h3>Your own shop link</h3>
            <p>Every seller gets a clean link and a QR code to put in an Instagram bio, a WhatsApp status or on packaging.</p>
          </article>
          <article className="bento-card">
            <Icon name="cube" size={26} />
            <h3>Optional 3D shop</h3>
            <p>Customers can walk into a 3D version of your store. A fast 2D store is always there too.</p>
          </article>
          <article className="bento-card">
            <Icon name="chat" size={26} />
            <h3>Custom orders and quotes</h3>
            <p>Cakes, tailoring, gifts, services: collect size, design and date in one tidy form.</p>
          </article>
          <article className="bento-card bento-wide">
            <Icon name="bell" size={26} />
            <h3>Instant, calm alerts</h3>
            <p>A soft chime and a notification the moment an order, quote request or review arrives.</p>
          </article>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Browse by category</h2>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <Link key={c} to={`/explore?category=${encodeURIComponent(c)}`} className="cat-chip">
                <Icon name={CAT_ICON[c] || 'store'} size={18} />
                {c}
              </Link>
            ))}
          </div>
        </section>

        {data?.cities?.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>Shops near you</h2>
            </div>
            <div className="cat-grid">
              {data.cities.map((c) => (
                <Link key={c} to={`/explore?city=${encodeURIComponent(c)}`} className="cat-chip">
                  <Icon name="pin" size={18} />
                  {c}
                </Link>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <div className="page-loader">
            <Spinner size={28} />
          </div>
        )}

        {data && (
          <>
            <Row title="Featured shops" shops={data.featured} to="/explore?sort=popular" />
            <Row title="Trending now" subtitle="Most visited shops" shops={data.trending.filter((s) => s.visit_count > 0)} to="/explore?sort=popular" />
            <Row title="Top rated" subtitle="Loved by verified customers" shops={data.top} to="/explore?sort=rating" />
            <Row title="New on Shopziro" shops={data.fresh} to="/explore?sort=new" />
          </>
        )}

        {none && (
          <Empty
            icon="store"
            title="Be the first shop here"
            text="No shops are published yet. Create yours and it will appear on this page."
            action={
              <Link to="/auth?mode=register&role=seller" className="btn btn-accent">
                Create your shop
              </Link>
            }
          />
        )}

        <section className="section cta-band">
          <h2>Ready to open your shop?</h2>
          <p className="muted">Free to start. Add products, share your link, receive orders.</p>
          <Link to="/auth?mode=register&role=seller" className="btn btn-accent btn-lg">
            Start free
          </Link>
        </section>
      </div>
    </>
  )
}
