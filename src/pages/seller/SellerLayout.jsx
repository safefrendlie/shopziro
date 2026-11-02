import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import Icon from '../../components/Icon'
import { PageLoader } from '../../components/ui'
import { supabase, errText } from '../../lib/supabase'
import { useAuth } from '../../state/auth'
import { cx } from '../../lib/utils'

const NAV = [
  { to: '/seller', label: 'Overview', icon: 'grid', end: true },
  { to: '/seller/shop', label: 'My Shop', icon: 'store' },
  { to: '/seller/customise', label: 'Customise', icon: 'sparkles' },
  { to: '/seller/products', label: 'Products', icon: 'box' },
  { to: '/seller/services', label: 'Services', icon: 'calendar' },
  { to: '/seller/categories', label: 'Categories', icon: 'tag' },
  { to: '/seller/orders', label: 'Orders', icon: 'cart' },
  { to: '/seller/customers', label: 'Customers', icon: 'users' },
  { to: '/seller/enquiries', label: 'Enquiries', icon: 'chat' },
  { to: '/seller/reviews', label: 'Reviews', icon: 'star' },
  { to: '/seller/analytics', label: 'Analytics', icon: 'chart' },
  { to: '/seller/integrations', label: 'Connections', icon: 'link' },
  { to: '/seller/settings', label: 'Settings', icon: 'settings' },
]

export default function SellerLayout() {
  const { user } = useAuth()
  const loc = useLocation()
  const [state, setState] = useState({ loading: true, shop: null, error: '' })

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('shops').select('*').eq('owner_id', user.id).maybeSingle()
    setState({ loading: false, shop: data || null, error: error ? errText(error) : '' })
    return data || null
  }, [user.id])

  useEffect(() => {
    reload()
  }, [reload])

  /** Save changes to the live shop. `changes.config` is merged into the existing config. */
  const updateShop = useCallback(
    async (changes) => {
      const current = state.shop
      if (!current) return { error: new Error('Create your shop first.') }
      const { config, ...cols } = changes
      const payload = { ...cols }
      if (config) payload.config = { ...(current.config || {}), ...config }
      const { error } = await supabase.from('shops').update(payload).eq('id', current.id)
      if (!error) await reload()
      return { error }
    },
    [state.shop, reload]
  )

  if (state.loading) return <PageLoader label="Loading your dashboard..." />

  const needsShop = !state.shop
  const onSetup = loc.pathname === '/seller/shop' || loc.pathname === '/seller/settings'
  if (needsShop && !onSetup) return <Navigate to="/seller/shop" replace />

  return (
    <div className="container dash">
      <aside className="dash-side">
        <div className="dash-shop">
          {state.shop ? (
            <>
              <strong>{state.shop.name}</strong>
              <span className={cx('badge', state.shop.published ? 'badge-good' : 'badge-warn')}>{state.shop.published ? 'Live' : 'Draft'}</span>
              <Link to={`/shop/${state.shop.slug}`} className="link-btn small" target="_blank" rel="noopener noreferrer">
                View shop <Icon name="external" size={13} />
              </Link>
            </>
          ) : (
            <strong>Set up your shop</strong>
          )}
        </div>
        <nav className="dash-nav" aria-label="Seller dashboard">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => cx('dash-link', isActive && 'is-active', needsShop && !['/seller/shop', '/seller/settings'].includes(n.to) && 'is-locked')}
              onClick={(e) => {
                if (needsShop && !['/seller/shop', '/seller/settings'].includes(n.to)) e.preventDefault()
              }}
            >
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="dash-main">
        {state.error && <div className="notice notice-bad">{state.error}</div>}
        <Outlet context={{ shop: state.shop, reload, updateShop }} />
      </section>
    </div>
  )
}
