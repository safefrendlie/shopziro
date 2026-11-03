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
  const register = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  // The page may already be fully loaded when this runs, so do not wait for a "load" event that has passed.
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

/** Finds out why the browser may refuse to install the app. Returns '' when everything looks fine. */
export async function diagnoseInstall() {
  try {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'This page is not served over https, so browsers will not offer installing. Open the https address of your site.'
    }
    const res = await fetch('/manifest.webmanifest', { credentials: 'omit', cache: 'no-store', redirect: 'manual' })
    const type = (res.headers.get('content-type') || '').toLowerCase()
    if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 403 || res.redirected) {
      return 'Your hosting is asking visitors to log in before it serves the app files (Vercel Deployment Protection). Browsers cannot read the app manifest, so the app cannot be installed. In Vercel open Settings, Deployment Protection, turn off Vercel Authentication, then redeploy.'
    }
    if (!res.ok) return `The app manifest could not be loaded (error ${res.status}). Redeploy the project and try again.`
    if (type.includes('text/html')) return 'The app manifest is being answered with a web page. Redeploy with the included vercel.json and try again.'
  } catch {
    return ''
  }
  return ''
}
