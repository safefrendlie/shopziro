/* In-app alerts: a soft, professional two-note chime (generated with the Web Audio
   API, so there is no sound file), gentle vibration on phones, and optional system
   notifications that stay silent so only our chime plays. */

let audioCtx = null
const KEY = 'shopziro_sound'

export function soundEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
export function setSoundEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

function ctx() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!audioCtx) audioCtx = new AC()
  return audioCtx
}

/** Browsers only allow sound after a tap/click, so we unlock on the first one. */
export function unlockAudio() {
  const c = ctx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

export function playChime(force = false) {
  if (!force && !soundEnabled()) return
  const c = ctx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const now = c.currentTime
  const master = c.createGain()
  master.gain.value = 0.11
  master.connect(c.destination)
  ;[
    { f: 659.25, t: 0 }, // E5
    { f: 987.77, t: 0.13 }, // B5
  ].forEach(({ f, t }) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    g.gain.setValueAtTime(0.0001, now + t)
    g.gain.linearRampToValueAtTime(1, now + t + 0.025)
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.75)
    osc.connect(g)
    g.connect(master)
    osc.start(now + t)
    osc.stop(now + t + 0.8)
  })
}

export function notificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}
export function notificationPermission() {
  return notificationSupported() ? Notification.permission : 'unsupported'
}
export async function askNotificationPermission() {
  if (!notificationSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function systemNotify(title, body, url = '/') {
  if (notificationPermission() !== 'granted') return
  try {
    const reg = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'shopziro',
        data: { url },
        silent: true,
      })
      return
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, { body, icon: '/icons/icon-192.png', silent: true })
  } catch {
    /* ignore */
  }
}
