import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { Toggle } from './ui'
import { useNotifications } from '../state/notifications'
import { useToast } from '../state/toast'
import { useClickOutside } from '../lib/hooks'
import {
  askNotificationPermission,
  notificationPermission,
  playChime,
  setSoundEnabled,
  soundEnabled,
} from '../lib/notify'
import { cx, timeAgo } from '../lib/utils'

export function NotificationSettings() {
  const toast = useToast()
  const [sound, setSound] = useState(soundEnabled())
  const [perm, setPerm] = useState(notificationPermission())

  const toggleSound = (on) => {
    setSoundEnabled(on)
    setSound(on)
    if (on) playChime(true)
  }
  const enable = async () => {
    const p = await askNotificationPermission()
    setPerm(p)
    if (p === 'granted') toast.success('Browser alerts are on.')
    else if (p === 'denied') toast.error('Alerts are blocked. Allow notifications for this site in your browser settings.')
  }

  return (
    <div className="stack">
      <Toggle checked={sound} onChange={toggleSound} label="Notification sound" hint="A soft two-note chime when something new arrives." />
      <div className="row wrap">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => playChime(true)}>
          <Icon name="sound" size={16} /> Play test sound
        </button>
        {perm === 'unsupported' ? (
          <span className="hint">This browser does not support system alerts.</span>
        ) : perm === 'granted' ? (
          <span className="badge badge-good">Browser alerts on</span>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={enable}>
            <Icon name="bell" size={16} /> Turn on browser alerts
          </button>
        )}
      </div>
      <p className="hint">
        Alerts appear while Shopziro is open, in the background, or installed on your device. For alerts when the app is fully closed, see
        "Push notifications" in the README.
      </p>
    </div>
  )
}

export function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  useClickOutside(ref, () => setOpen(false))

  const openItem = (n) => {
    if (!n.read) markRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="popover-wrap" ref={ref}>
      <button type="button" className="btn btn-icon btn-ghost bell" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Icon name="bell" />
        {unread > 0 && <span className="dot-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="popover notif-pop">
          <div className="popover-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="link-btn" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="hint pad">Nothing yet. New orders, quotes and replies will show up here.</p>}
            {items.map((n) => (
              <button type="button" key={n.id} className={cx('notif-item', !n.read && 'is-unread')} onClick={() => openItem(n)}>
                <strong>{n.title}</strong>
                {n.body && <span>{n.body}</span>}
                <small>{timeAgo(n.created_at)}</small>
              </button>
            ))}
          </div>
          <Link to="/account/settings" className="popover-foot" onClick={() => setOpen(false)}>
            Sound and alert settings
          </Link>
        </div>
      )}
    </div>
  )
}
