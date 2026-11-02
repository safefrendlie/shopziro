import { useCallback, useEffect, useState } from 'react'

let deferredPrompt = null
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit()
  })
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true
  )
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function usePwaInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => listeners.delete(l)
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return 'manual'
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    emit()
    return choice.outcome
  }, [])

  return { canPrompt: Boolean(deferredPrompt), installed: isStandalone(), install }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
