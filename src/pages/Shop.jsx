import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ShopView from '../components/ShopView'
import ProductModal from '../components/ProductModal'
import { ShareModal } from '../components/Share'
import { Empty, PageLoader, Spinner } from '../components/ui'
import { supabase, errText } from '../lib/supabase'
import { useAuth } from '../state/auth'
import { useToast } from '../state/toast'
import { useBuyerGuard } from '../lib/hooks'
import { shopLink } from '../lib/utils'

const Shop3D = lazy(() => import('../components/Shop3D'))

export function webglSupported() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')))
  } catch {
    return false
  }
}

function sourceFrom(ref) {
  if (ref) return ref
  const r = (document.referrer || '').toLowerCase()
  if (r.includes('instagram')) return 'instagram'
  if (r.includes('facebook') || r.includes('fb.')) return 'facebook'
  if (r.includes('whatsapp')) return 'whatsapp'
  if (r.includes('google')) return 'google'
  if (r.includes('t.co') || r.includes('twitter') || r.includes('x.com')) return 'x'
  return 'direct'
}

export default function Shop() {
  const { slug, pid } = useParams()
  const [sp] = useSearchParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const guard = useBuyerGuard()

  const [state, setState] = useState({ loading: true, shop: null, products: [], reviews: [], error: null })
  const [fav, setFav] = useState(false)
  const [share, setShare] = useState(false)
  const [view3d, setView3d] = useState(false)
  const [gl] = useState(webglSupported)

  useEffect(() => {
    let alive = true
    setState({ loading: true, shop: null, products: [], reviews: [], error: null })
    ;(async () => {
      const { data: shop, error } = await supabase.from('shops').select('*').eq('slug', String(slug).toLowerCase()).maybeSingle()
      if (!alive) return
      if (error || !shop) {
        setState({ loading: false, shop: null, products: [], reviews: [], error })
        return
      }
      const [pr, rv] = await Promise.all([
        supabase.from('products').select('*').eq('shop_id', shop.id).eq('active', true).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(50),
      ])
      if (!alive) return
      setState({ loading: false, shop, products: pr.data || [], reviews: rv.data || [], error: null })
    })()
    return () => {
      alive = false
    }
  }, [slug])

  const { shop, products, reviews, loading } = state

  useEffect(() => {
    if (!shop) return undefined
    const prev = document.title
    document.title = `${shop.name} | Shopziro`
    return () => {
      document.title = prev
    }
  }, [shop])

  // Count one visit per browser session (never the owner's own visits).
  useEffect(() => {
    if (!shop || !shop.published) return
    if (user && user.id === shop.owner_id) return
    const key = `visit_${shop.id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* ignore */
    }
    supabase.rpc('track_visit', { p_shop: shop.id, p_source: sourceFrom(sp.get('ref')) }).then(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id])

  useEffect(() => {
    let alive = true
    if (!shop || !user || profile?.role !== 'buyer') {
      setFav(false)
      return undefined
    }
    supabase
      .from('favorites')
      .select('shop_id')
      .eq('buyer_id', user.id)
      .eq('shop_id', shop.id)
      .maybeSingle()
      .then(({ data }) => alive && setFav(Boolean(data)))
    return () => {
      alive = false
    }
  }, [shop, user, profile])

  const toggleFav = () =>
    guard(async () => {
      if (fav) {
        const { error } = await supabase.from('favorites').delete().eq('buyer_id', user.id).eq('shop_id', shop.id)
        if (error) return toast.error(errText(error))
        setFav(false)
        toast.info('Removed from favourite shops')
      } else {
        const { error } = await supabase.from('favorites').insert({ buyer_id: user.id, shop_id: shop.id })
        if (error) return toast.error(errText(error))
        setFav(true)
        toast.success('Saved to your favourite shops')
      }
    })

  if (loading) return <PageLoader label="Opening shop..." />
  if (!shop) {
    return (
      <div className="container page">
        <Empty
          icon="store"
          title="Shop not found"
          text="This shop does not exist, or the owner has not published it yet."
          action={
            <Link to="/explore" className="btn btn-primary">
              Explore other shops
            </Link>
          }
        />
      </div>
    )
  }

  const isOwner = user && user.id === shop.owner_id
  const product = pid ? products.find((p) => p.id === pid) : null
  const closeProduct = () => navigate(`/shop/${shop.slug}`, { replace: true })

  return (
    <>
      {!shop.published && isOwner && (
        <div className="draft-bar">
          This shop is <strong>not published</strong>, so only you can see it.{' '}
          <Link to="/seller/customise">Finish and publish it</Link>
        </div>
      )}
      <ShopView
        shop={shop}
        products={products}
        reviews={reviews}
        favorite={fav}
        onToggleFavorite={toggleFav}
        onShare={() => setShare(true)}
        allow3d={gl}
        onOpen3D={() => setView3d(true)}
      />

      {pid && product && <ProductModal shop={shop} product={product} onClose={closeProduct} />}
      {pid && !product && (
        <div className="container page">
          <Empty
            icon="box"
            title="That product is not available"
            action={
              <Link to={`/shop/${shop.slug}`} className="btn btn-primary">
                Back to {shop.name}
              </Link>
            }
          />
        </div>
      )}

      <ShareModal open={share} onClose={() => setShare(false)} url={shopLink(shop.slug)} title={`Share ${shop.name}`} text={`Check out ${shop.name} on Shopziro`} />

      {view3d && (
        <Suspense
          fallback={
            <div className="s3d-loading">
              <Spinner size={30} />
              <span>Building the 3D shop...</span>
            </div>
          }
        >
          <Shop3D
            shop={shop}
            products={products}
            onClose={() => setView3d(false)}
            onOpenProduct={(id) => navigate(`/shop/${shop.slug}/product/${id}`)}
          />
        </Suspense>
      )}
    </>
  )
}
