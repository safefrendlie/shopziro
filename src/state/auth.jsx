import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    if (!supabase || !uid) return
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data || null)
    setProfileLoaded(true)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      if (active) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) {
        // Defer: calling Supabase inside this callback can deadlock the client.
        setTimeout(() => loadProfile(s.user.id), 0)
      } else {
        setProfile(null)
        setProfileLoaded(false)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const userId = session?.user?.id

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      profileLoaded,
      role: profile?.role || null,
      loading,
      refreshProfile: () => loadProfile(userId),
      signOut: async () => {
        if (supabase) await supabase.auth.signOut()
        setProfile(null)
        setProfileLoaded(false)
      },
    }),
    [session, profile, profileLoaded, loading, loadProfile, userId]
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
