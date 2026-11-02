import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { useToast } from '../state/toast'

export function useClickOutside(ref, handler) {
  const saved = useRef(handler)
  saved.current = handler
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) saved.current(e)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [ref])
}

/** Runs fn only for a logged-in buyer; otherwise sends the visitor to log in. */
export function useBuyerGuard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  return useCallback(
    (fn) => {
      if (!user) {
        toast.info('Please log in or create a free buyer account to continue.')
        navigate(`/auth?mode=login&role=buyer&next=${encodeURIComponent(loc.pathname + loc.search)}`)
        return false
      }
      if (profile && profile.role !== 'buyer') {
        toast.error('This needs a buyer account. Seller accounts can browse but not place orders.')
        return false
      }
      if (fn) fn()
      return true
    },
    [user, profile, navigate, loc.pathname, loc.search, toast]
  )
}

/** Small helper for loading data with loading + error state. */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve()
      .then(fn)
      .then((data) => alive && setState({ loading: false, error: null, data }))
      .catch((error) => alive && setState({ loading: false, error, data: null }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { ...state, reload: () => setTick((t) => t + 1) }
}
