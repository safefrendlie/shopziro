import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import InstallButton from './InstallButton'
import { NotificationBell } from './NotificationUI'
import { useAuth } from '../state/auth'
import { useCart } from '../state/cart'
import { useClickOutside } from '../lib/hooks'
import { cx, initials } from '../lib/utils'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function AppShell() {
  const { user, profile, signOut } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setMenu(false))

  const dash = profile?.role === 'seller' ? '/seller' : '/buyer'
  const isSeller = profile?.role === 'seller'

  const logout = async () => {
    setMenu(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="app">
      <ScrollToTop />
      <header className="topbar">
        <div className="container topbar-in">
          <Logo size={34} to={user ? dash : '/'} />
          <nav className="topnav" aria-label="Main">
            <NavLink to="/explore" className={({ isActive }) => cx('topnav-link', isActive && 'is-active')}>
              Explore
            </NavLink>
            {!user && (
              <Link to="/auth?mode=register&role=seller" className="topnav-link">
                Sell on Shopziro
              </Link>
            )}
            {user && (
              <NavLink to={dash} className={({ isActive }) => cx('topnav-link', isActive && 'is-active')}>
                Dashboard
              </NavLink>
            )}
          </nav>
          <div className="topbar-actions">
            <InstallButton iconOnlyOnPhone />
            {profile?.role !== 'seller' && (
              <Link to="/cart" className="btn btn-icon btn-ghost cart-btn" aria-label={`Cart, ${count} items`}>
                <Icon name="cart" />
                {count > 0 && <span className="dot-count">{count > 9 ? '9+' : count}</span>}
              </Link>
            )}
            {user && <NotificationBell />}
            {user ? (
              <div className="popover-wrap" ref={ref}>
                <button type="button" className="avatar avatar-btn" onClick={() => setMenu((m) => !m)} aria-label="Account menu">
                  {initials(profile?.full_name || user.email || '')}
                </button>
                {menu && (
                  <div className="popover menu-pop">
                    <div className="popover-head stack-xs">
                      <strong>{profile?.full_name || 'My account'}</strong>
                      <small className="muted">{user.email}</small>
                      {profile && <span className="badge badge-accent">{profile.role === 'seller' ? 'Seller account' : 'Buyer account'}</span>}
                    </div>
                    <Link className="menu-item" to={dash} onClick={() => setMenu(false)}>
                      <Icon name="grid" size={18} /> Dashboard
                    </Link>
                    <Link className="menu-item" to="/account/settings" onClick={() => setMenu(false)}>
                      <Icon name="settings" size={18} /> Account and alerts
                    </Link>
                    <button type="button" className="menu-item" onClick={logout}>
                      <Icon name="logout" size={18} /> Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-links">
                <Link to="/auth?mode=login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link to="/auth?mode=register&role=seller" className="btn btn-accent btn-sm hide-xs">
                  Start free
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-in">
          <div className="stack-sm">
            <Logo size={30} showTag />
            <p className="muted small">A digital commerce platform where anyone can create, customize, showcase, and grow their own online store.</p>
          </div>
          <div className="footer-links">
            <Link to="/explore">Explore shops</Link>
            {!user && <Link to="/auth?mode=register&role=seller">Create your shop</Link>}
          </div>
          <small className="muted">© 2026 Shopziro. Your Business. Your World.</small>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Mobile">
        <NavLink to={user ? dash : '/'} end className={({ isActive }) => cx('bn-item', isActive && 'is-active')}>
          <Icon name="home" /> <span>Home</span>
        </NavLink>
        <NavLink to="/explore" className={({ isActive }) => cx('bn-item', isActive && 'is-active')}>
          <Icon name="search" /> <span>Explore</span>
        </NavLink>
        {!isSeller && (
          <NavLink to="/cart" className={({ isActive }) => cx('bn-item', isActive && 'is-active')}>
            <span className="bn-icon">
              <Icon name="cart" />
              {count > 0 && <span className="dot-count">{count > 9 ? '9+' : count}</span>}
            </span>
            <span>Cart</span>
          </NavLink>
        )}
        {user ? (
          <NavLink to="/account/settings" className={({ isActive }) => cx('bn-item', isActive && 'is-active')}>
            <Icon name="user" /> <span>Account</span>
          </NavLink>
        ) : (
          <NavLink to="/auth?mode=login" className="bn-item">
            <Icon name="user" /> <span>Log in</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}
