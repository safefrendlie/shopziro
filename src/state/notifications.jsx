import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { playChime, systemNotify, unlockAudio } from '../lib/notify'
import { useAuth } from './auth'
import { useToast } from './toast'

const NotifyCtx = createContext(null)

export function NotifyProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const navRef = useRef(navigate)
  navRef.current = navigate
  const [items, setItems] = useState([])
  const userId = user?.id

  const load = useCallback(async () => {
    if (!supabase || !userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    setItems(data || [])
  }, [userId])

  // Browsers allow sound only after a tap, so unlock audio on the first interaction.
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!supabase || !userId) {
      setItems([])
      return undefined
    }
    load()
    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new
          setItems((l) => [n, ...l.filter((x) => x.id !== n.id)].slice(0, 30))
          toast.info(n.body || '', { title: n.title, onClick: () => n.link && navRef.current(n.link) })
          playChime()
          try {
            if (navigator.vibrate) navigator.vibrate(60)
          } catch {
            /* ignore */
          }
          if (document.hidden) systemNotify(n.title, n.body || '', n.link || '/')
        }
      )
      .subscribe()
    const onVisible = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [userId, load, toast])

  const unread = items.filter((i) => !i.read).length

  // Show the unread count on the installed app icon where the browser supports it.
  useEffect(() => {
    try {
      if (navigator.setAppBadge) {
        if (unread > 0) navigator.setAppBadge(unread)
        else navigator.clearAppBadge()
      }
    } catch {
      /* ignore */
    }
  }, [unread])

  const markRead = useCallback(
    async (id) => {
      setItems((l) => l.map((i) => (i.id === id ? { ...i, read: true } : i)))
      if (supabase) await supabase.from('notifications').update({ read: true }).eq('id', id)
    },
    []
  )

  const markAllRead = useCallback(async () => {
    setItems((l) => l.map((i) => ({ ...i, read: true })))
    if (supabase && userId) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    }
  }, [userId])

  const value = useMemo(() => ({ items, unread, markRead, markAllRead, reload: load }), [items, unread, markRead, markAllRead, load])
  return <NotifyCtx.Provider value={value}>{children}</NotifyCtx.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotifyCtx)
  if (!ctx) throw new Error('useNotifications must be used inside NotifyProvider')
  return ctx
}
