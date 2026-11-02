import { useId } from 'react'
import { Link } from 'react-router-dom'

/** The Shopziro mark: a bold "Z" followed by a lime dot, on a violet-to-cyan tile. */
export function LogoMark({ size = 36 }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b6cff" />
          <stop offset="1" stopColor="#36e0ff" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#g${id})`} />
      <path d="M12 15h19L12 32h19" fill="none" stroke="#0b0b10" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="37" cy="31.5" r="3.2" fill="#c8ff4d" />
    </svg>
  )
}

export default function Logo({ size = 34, showTag = false, to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="Shopziro home">
      <LogoMark size={size} />
      <span className="logo-text">
        <span className="logo-word">Shopziro</span>
        {showTag && <span className="logo-tag">Your Business. Your World.</span>}
      </span>
    </Link>
  )
}
