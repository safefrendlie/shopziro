import { Link } from 'react-router-dom'

/** The Shopziro mark: a storefront awning over a round doorway that reads as a zero.
    variant "light" = white tile (for dark backgrounds), "brand" = purple tile (for light backgrounds). */
export function LogoMark({ size = 38, variant = 'light' }) {
  const brand = variant === 'brand'
  const tile = brand ? '#3b2bb0' : '#ffffff'
  const a = '#e8590b'
  const b = brand ? '#ffffff' : '#3b2bb0'
  const ring = brand ? '#ffffff' : '#3b2bb0'
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true" className="logo-mark" focusable="false">
      <rect width="1024" height="1024" rx="230" fill={tile} />
      <path d="M259 312h126v107a63 63 0 0 1-126 0z" fill={a} />
      <path d="M385 312h127v107a63.5 63.5 0 0 1-127 0z" fill={b} />
      <path d="M512 312h126v107a63 63 0 0 1-126 0z" fill={a} />
      <path d="M638 312h127v107a63.5 63.5 0 0 1-127 0z" fill={b} />
      <ellipse cx="512" cy="644" rx="80" ry="113" fill="none" stroke={ring} strokeWidth="46" />
    </svg>
  )
}

export default function Logo({ size = 38, showTag = false, to = '/', variant = 'light' }) {
  return (
    <Link to={to} className="logo" aria-label="Shopziro home">
      <LogoMark size={size} variant={variant} />
      <span className="logo-text">
        <span className="logo-word">
          Shop<span className="logo-z">ziro</span>
        </span>
        {showTag && <span className="logo-tag">Your Business. Your World.</span>}
      </span>
    </Link>
  )
}
