import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { ProductCard } from '../../components/Cards'
import { Empty, PageLoader } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useAuth } from '../../state/auth'
import { useToast } from '../../state/toast'

export default function SavedProducts() {
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('saved_products')
        .select('product_id, products(*, shops(slug,name,config,published))')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
      if (error) toast.error(errText(error))
      if (alive) setRows((data || []).map((r) => r.products).filter((p) => p && p.shops))
    })()
    return () => {
      alive = false
    }
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const unsave = async (id) => {
    const { error } = await supabase.from('saved_products').delete().eq('buyer_id', user.id).eq('product_id', id)
    if (error) return toast.error(errText(error))
    setRows((l) => l.filter((p) => p.id !== id))
    toast.info('Removed from saved products.')
  }

  if (rows === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <h1 className="page-title">Saved products</h1>
      {rows.length === 0 ? (
        <Empty
          icon="tag"
          title="Nothing saved yet"
          text="Open a product and tap Save to keep it here."
          action={
            <Link to="/explore?type=products" className="btn btn-primary">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="grid-products">
          {rows.map((p) => (
            <div key={p.id} className="with-remove">
              <ProductCard product={p} currency={p.shops.config?.currency || 'INR'} shopName={p.shops.name} to={`/shop/${p.shops.slug}/product/${p.id}`} />
              <button type="button" className="btn btn-icon btn-glass remove-btn" onClick={() => unsave(p.id)} aria-label={`Remove ${p.name}`}>
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
