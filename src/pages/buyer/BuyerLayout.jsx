import { NavLink, Outlet } from 'react-router-dom'
import Icon from '../../components/Icon'
import { useAuth } from '../../state/auth'
import { cx, initials } from '../../lib/utils'

const NAV = [
  { to: '/buyer/orders', label: 'My Orders', icon: 'cart' },
  { to: '/buyer/enquiries', label: 'My Requests', icon: 'chat' },
  { to: '/buyer/favourites', label: 'Favourite Shops', icon: 'heart' },
  { to: '/buyer/saved', label: 'Saved Products', icon: 'tag' },
  { to: '/buyer/reviews', label: 'Reviews', icon: 'star' },
  { to: '/buyer/settings', label: 'Account', icon: 'settings' },
]

export default function BuyerLayout() {
  const { user, profile } = useAuth()
  return (
    <div className="container dash">
      <aside className="dash-side">
        <div className="dash-shop row">
          <div className="avatar">{initials(profile?.full_name || user.email)}</div>
          <div>
            <strong>{profile?.full_name || 'My profile'}</strong>
            <small className="muted block clip">{user.email}</small>
          </div>
        </div>
        <nav className="dash-nav" aria-label="Buyer dashboard">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('dash-link', isActive && 'is-active')}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="dash-main">
        <Outlet />
      </section>
    </div>
  )
}
