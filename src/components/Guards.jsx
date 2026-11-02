import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { Empty, PageLoader } from './ui'

export function RequireRole({ role, children }) {
  const { user, profile, profileLoaded, loading, signOut } = useAuth()
  const loc = useLocation()

  if (loading) return <PageLoader />
  if (!user) {
    return <Navigate to={`/auth?mode=login&role=${role || 'buyer'}&next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  }
  if (!profile && !profileLoaded) return <PageLoader label="Loading your account..." />
  if (!profile) {
    return (
      <div className="container page">
        <Empty
          icon="shield"
          title="We could not find your account profile"
          text="Run supabase/schema.sql in your Supabase project, then sign out and create the account again."
          action={
            <button type="button" className="btn btn-primary" onClick={signOut}>
              Sign out
            </button>
          }
        />
      </div>
    )
  }
  if (role && profile.role !== role) {
    const other = profile.role === 'seller' ? '/seller' : '/buyer'
    return (
      <div className="container page">
        <Empty
          icon="shield"
          title={role === 'seller' ? 'This area is for seller accounts' : 'This area is for buyer accounts'}
          text={`You are signed in as a ${profile.role}. Seller and buyer accounts are separate on Shopziro.`}
          action={
            <Link to={other} className="btn btn-primary">
              Go to my {profile.role} dashboard
            </Link>
          }
        />
      </div>
    )
  }
  return children
}

export function RequireUser({ children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to={`/auth?mode=login&next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return children
}
