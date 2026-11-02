export const cx = (...a) => a.filter(Boolean).join(' ')

/* ---------- text / numbers / dates ---------- */
export function slugify(s = '') {
  return s
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'PKR', label: 'Pakistani Rupee (PKR)' },
  { code: 'BDT', label: 'Bangladeshi Taka (BDT)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
]

export function defaultCurrency() {
  return import.meta.env.VITE_DEFAULT_CURRENCY || 'INR'
}

export function formatPrice(n, currency = 'INR') {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return ''
  const v = Number(n)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: v % 1 === 0 ? 0 : 2,
    }).format(v)
  } catch {
    return `${currency} ${v.toFixed(2)}`
  }
}

export function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString()
}

export function fmtDate(iso, withTime = false) {
  if (!iso) return ''
  const d = new Date(iso)
  return withTime
    ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '')

export function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase() || 'S'
  )
}

export function siteUrl() {
  const env = import.meta.env.VITE_SITE_URL
  return (env || window.location.origin).replace(/\/+$/, '')
}
export function shopLink(slug, ref) {
  return `${siteUrl()}/shop/${slug}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`
}
export function productLink(slug, id, ref) {
  return `${siteUrl()}/shop/${slug}/product/${id}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`
}

export function waLink(number, text = '') {
  const digits = String(number || '').replace(/[^\d]/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/* ---------- lists ---------- */
export const CATEGORIES = [
  'Food & Bakery',
  'Fashion & Boutique',
  'Beauty & Salon',
  'Gifts & Crafts',
  'Home & Decor',
  'Electronics & Mobile',
  'Health & Wellness',
  'Education & Tutoring',
  'Photography & Events',
  'Repair & Home Services',
  'Art & Design',
  'Jewellery & Accessories',
  'Other',
]

export const PLAN_LIMITS = { free: 50, pro: 1000, business: 100000 }

export const ORDER_STATUS = {
  pending: { label: 'Pending', tone: 'warn' },
  accepted: { label: 'Accepted', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'good' },
  rejected: { label: 'Declined', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
}
export const ENQUIRY_STATUS = {
  new: { label: 'New', tone: 'warn' },
  quoted: { label: 'Quoted', tone: 'info' },
  accepted: { label: 'Accepted', tone: 'good' },
  declined: { label: 'Declined', tone: 'bad' },
  closed: { label: 'Closed', tone: 'muted' },
}
export const PAYMENT_METHODS = {
  cod: 'Cash on delivery / pay at pickup',
  direct: 'Pay the seller directly (UPI, bank, wallet)',
  whatsapp: 'Arrange payment on WhatsApp',
}

/* ---------- social platforms (optional "Connect" buttons) ---------- */
export const SOCIALS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', kind: 'phone', placeholder: 'Number with country code, e.g. 919876543210' },
  { key: 'instagram', label: 'Instagram', icon: 'instagram', kind: 'handle', base: 'https://instagram.com/', placeholder: 'yourhandle' },
  { key: 'facebook', label: 'Facebook', icon: 'facebook', kind: 'handle', base: 'https://facebook.com/', placeholder: 'yourpage' },
  { key: 'tiktok', label: 'TikTok', icon: 'tiktok', kind: 'handle', base: 'https://www.tiktok.com/@', placeholder: 'yourhandle' },
  { key: 'youtube', label: 'YouTube', icon: 'youtube', kind: 'handle', base: 'https://www.youtube.com/@', placeholder: 'yourchannel' },
  { key: 'x', label: 'X (Twitter)', icon: 'xlogo', kind: 'handle', base: 'https://x.com/', placeholder: 'yourhandle' },
  { key: 'website', label: 'Website', icon: 'globe', kind: 'url', placeholder: 'https://yourwebsite.com' },
]

export function normalizeSocial(key, raw) {
  const def = SOCIALS.find((s) => s.key === key)
  const v = (raw || '').trim()
  if (!def) return { error: 'Unknown platform.' }
  if (!v) return { value: '' }
  if (def.kind === 'phone') {
    const d = v.replace(/[^\d]/g, '')
    if (d.length < 8 || d.length > 15) return { error: 'Enter a valid number with country code (8 to 15 digits).' }
    return { value: d }
  }
  if (def.kind === 'url') {
    const u = /^https?:\/\//i.test(v) ? v : `https://${v}`
    try {
      const parsed = new URL(u)
      if (!parsed.hostname.includes('.')) throw new Error('bad host')
      return { value: parsed.toString() }
    } catch {
      return { error: 'Enter a valid website address.' }
    }
  }
  let h = v
  if (/^https?:\/\//i.test(h)) {
    try {
      h = new URL(h).pathname.split('/').filter(Boolean)[0] || ''
    } catch {
      return { error: 'Enter a valid profile link or handle.' }
    }
  }
  h = h.replace(/^@/, '')
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(h)) return { error: 'Use letters, numbers, dots, dashes or underscores only.' }
  return { value: h }
}

export function socialUrl(key, value) {
  if (!value) return ''
  if (key === 'whatsapp') return `https://wa.me/${value}`
  if (key === 'website') return value
  const def = SOCIALS.find((s) => s.key === key)
  return (def?.base || '') + value
}

/* ---------- colours and shop themes ---------- */
function hexToRgb(h) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h || '')
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]
}
export function mix(a, b, t) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
export function readableOn(bg) {
  const [r, g, b] = hexToRgb(bg)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0b0b10' : '#ffffff'
}

export const FONTS = {
  inter: { label: 'Inter (clean)', css: "'Inter', system-ui, sans-serif" },
  grotesk: { label: 'Bricolage (expressive)', css: "'Bricolage Grotesque', 'Inter', sans-serif" },
  serif: { label: 'Playfair (elegant)', css: "'Playfair Display', Georgia, serif" },
  rounded: { label: 'Nunito (friendly)', css: "'Nunito', system-ui, sans-serif" },
  mono: { label: 'Space Mono (techy)', css: "'Space Mono', ui-monospace, monospace" },
}

export const THEMES = {
  minimal: { label: 'Modern Minimal', blurb: 'Clean, calm and spacious.', bg: '#0f1115', text: '#f2f3f7', accent: '#7c5cff', font: 'inter', radius: 18 },
  luxury: { label: 'Premium Luxury', blurb: 'Gold on deep black.', bg: '#0b0a08', text: '#f6efe0', accent: '#d4af37', font: 'serif', radius: 6 },
  creative: { label: 'Creative Colourful', blurb: 'Bold, playful, expressive.', bg: '#150d24', text: '#fff7fb', accent: '#ff5fa2', font: 'grotesk', radius: 26 },
  boutique: { label: 'Fashion Boutique', blurb: 'Soft light editorial look.', bg: '#faf5f0', text: '#2a2220', accent: '#c4577a', font: 'serif', radius: 12 },
  professional: { label: 'Professional Store', blurb: 'Trustworthy and sharp.', bg: '#0a1220', text: '#eaf1fb', accent: '#2f8cff', font: 'inter', radius: 10 },
  custom: { label: 'Custom Design', blurb: 'Choose your own colours.', bg: '#101014', text: '#f4f4f8', accent: '#c8ff4d', font: 'grotesk', radius: 16 },
}

export function resolveTheme(c = {}) {
  const base = THEMES[c.theme] || THEMES.minimal
  if (c.theme !== 'custom') return base
  const radius = Number(c.radius)
  return {
    ...base,
    bg: c.bg || base.bg,
    text: c.text || base.text,
    accent: c.accent || base.accent,
    font: FONTS[c.font] ? c.font : base.font,
    radius: Number.isFinite(radius) ? radius : base.radius,
  }
}

export function themeVars(c = {}) {
  const t = resolveTheme(c)
  const dark = readableOn(t.bg) === '#ffffff'
  return {
    '--s-bg': t.bg,
    '--s-text': t.text,
    '--s-surface': mix(t.bg, t.text, dark ? 0.07 : 0.04),
    '--s-border': mix(t.bg, t.text, 0.16),
    '--s-muted': mix(t.bg, t.text, 0.62),
    '--s-accent': t.accent,
    '--s-accent-ink': readableOn(t.accent),
    '--s-radius': `${t.radius}px`,
    '--s-font': (FONTS[t.font] || FONTS.inter).css,
  }
}

export function defaultConfig(extra = {}) {
  return {
    tagline: '',
    description: '',
    logo_url: '',
    banner_url: '',
    theme: 'minimal',
    bg: THEMES.custom.bg,
    text: THEMES.custom.text,
    accent: THEMES.custom.accent,
    font: 'grotesk',
    radius: 16,
    cols: 3,
    currency: defaultCurrency(),
    phone: '',
    address: '',
    payment_note: '',
    announcement: '',
    show_reviews: true,
    show3d: true,
    socials: {},
    ...extra,
  }
}

/* ---------- product helpers ---------- */
export function priceLabel(p, currency) {
  if (p.offer_type === 'quote') return 'Request a quote'
  if (p.offer_type === 'custom') return p.price != null ? `From ${formatPrice(p.price, currency)}` : 'Custom order'
  return formatPrice(p.price, currency)
}
export const OFFER_LABEL = { fixed: 'Fixed price', custom: 'Custom order', quote: 'Request a quote' }
export const STOCK_LABEL = { in_stock: 'In stock', limited: 'Limited stock', out_of_stock: 'Out of stock' }

export function debounce(fn, ms = 300) {
  let t
  const d = (...a) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...a), ms)
  }
  d.cancel = () => clearTimeout(t)
  return d
}

export function safeJson(v, fallback) {
  try {
    return JSON.parse(v)
  } catch {
    return fallback
  }
}
