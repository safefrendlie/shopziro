import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { ShopCard } from '../../components/Cards'
import { Empty, PageLoader } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useAuth } from '../../state/auth'
import { useToast } from '../../state/toast'

export default function Favourites() {
  const { user } = useAuth()
  const toast = useToast()
  const [shops, setShops] = useState(null)

  const load = async () => {
    const { data, error } = await supabase.from('favorites').select('shop_id, shops(*)').eq('buyer_id', user.id).order('created_at', { ascending: false })
    if (error) toast.error(errText(error))
    setShops((data || []).map((r) => r.shops).filter(Boolean))
  }
  useEffect(() => {
    load()
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const unsave = async (id) => {
    const { error } = await supabase.from('favorites').delete().eq('buyer_id', user.id).eq('shop_id', id)
    if (error) return toast.error(errText(error))
    setShops((l) => l.filter((s) => s.id !== id))
    toast.info('Removed from favourites.')
  }

  if (shops === null) return <PageLoader />

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Favourite shops</h1>
      </div>
      {shops.length === 0 ? (
        <Empty
          icon="heart"
          title="No favourite shops yet"
          text="Tap the heart on any shop to save it here."
          action={
            <Link to="/explore" className="btn btn-primary">
              Explore shops
            </Link>
          }
        />
      ) : (
        <div className="grid-shops">
          {shops.map((s) => (
            <div key={s.id} className="with-remove">
              <ShopCard shop={s} />
              <button type="button" className="btn btn-icon btn-glass remove-btn" onClick={() => unsave(s.id)} aria-label={`Remove ${s.name} from favourites`}>
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
