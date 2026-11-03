import { Link, Navigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { ShopCard } from '../components/Cards'
import { PageLoader } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAsync } from '../lib/hooks'
import { useAuth } from '../state/auth'

async function loadPopular() {
  const { data } = await supabase.from('shops').select('*').eq('published', true).order('visit_count', { ascending: false }).limit(8)
  return data || []
}

function Landing() {
  const { data: shops } = useAsync(loadPopular, [])

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-in">
          <h1 className="hero-title">
            Your Business.
            <br />
            <span className="grad-text">Your World.</span>
          </h1>
          <p className="hero-sub">Create, customise and grow your own online store, then share it with one link.</p>
          <div className="hero-cta">
            <Link to="/auth?mode=register&role=seller" className="btn btn-accent btn-lg">
              Create your shop <Icon name="arrow-right" size={18} />
            </Link>
            <Link to="/explore" className="btn btn-ghost btn-lg">
              Explore shops
            </Link>
          </div>
        </div>
      </section>

      {shops && shops.length > 0 && (
        <div className="container">
          <section className="section">
            <div className="section-head">
              <h2>Popular shops</h2>
              <Link to="/explore?sort=popular" className="btn btn-ghost btn-sm">
                See all <Icon name="arrow-right" size={16} />
              </Link>
            </div>
            <div className="shop-rail">
              {shops.map((s) => (
                <ShopCard key={s.id} shop={s} />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

/** Signed-in people never see the landing page again: they go straight to their account. */
export default function Home() {
  const { user, profile, profileLoaded, loading } = useAuth()
  if (loading || (user && !profileLoaded)) return <PageLoader />
  if (user && profile) return <Navigate to={profile.role === 'seller' ? '/seller' : '/buyer'} replace />
  return <Landing />
}
