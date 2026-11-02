const c = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`

const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  search: c(11, 11, 7) + 'M20 20l-3.5-3.5',
  cart: 'M3 4h2.2l2.1 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L19.5 8H6' + c(9.5, 19.5, 1.2) + c(17, 19.5, 1.2),
  user: c(12, 8, 4) + 'M4 21c0-4 3.6-6 8-6s8 2 8 6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 21h4',
  store: 'M4 9l1.5-5h13L20 9 M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9 M5 12v8h14v-8 M10 20v-5h4v5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  heart: 'M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z',
  share: c(6, 12, 2.5) + c(18, 6, 2.5) + c(18, 18, 2.5) + 'M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6',
  copy: 'M8 8h11v12H8z M5 16V4h11',
  qr: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 14h2v2h-2z M14 18h2v2h-2z M18 18h2v2h-2z',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  image: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4' + c(9, 9, 1.4),
  box: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z M3.5 7.5 12 12l8.5-4.5 M12 12v9',
  tag: 'M3 12V4h8l10 10-8 8z' + c(7.5, 8.5, 1.2),
  clock: c(12, 12, 9) + 'M12 7v5l3 2',
  chat: 'M4 5h16v11H9l-5 4z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  pin: 'M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z' + c(12, 9, 2.5),
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z' + c(12, 12, 4) + 'M17.5 6.5h.01',
  facebook: 'M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z',
  whatsapp: 'M3 21l1.6-5A8.5 8.5 0 1 1 8 19.4z M9 10c0 3 2 5 5 5l1-1.5-2-1-1 .8c-.8-.4-1.4-1-1.8-1.8l.8-1-1-2z',
  tiktok: 'M14 3v11a3.5 3.5 0 1 1-3.5-3.5 M14 3c.3 2.3 1.8 4 4 4.2',
  youtube: 'M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z M10 9l5 3-5 3z',
  xlogo: 'M4 4l16 16M20 4L4 20',
  globe: c(12, 12, 9) + 'M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  chart: 'M4 20V11M10 20V4M16 20v-8M21 20H3',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10' + c(16, 7, 2) + c(8, 17, 2),
  users: c(9, 8, 3.5) + 'M2.5 20c0-3.5 3-5.5 6.5-5.5S15.5 16.5 15.5 20 M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.7c2 .7 3.5 2.3 3.5 5.3',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z' + c(12, 12, 3),
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5',
  logout: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  menu: 'M4 7h16M4 12h16M4 17h16',
  sparkles: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z M9 12l2 2 4-4',
  mail: 'M3 6h18v12H3z M3 7l9 7 9-7',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4M16 3v4',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6z',
  refresh: 'M20 11a8 8 0 0 0-14.5-3M4 5v4h4 M4 13a8 8 0 0 0 14.5 3M20 19v-4h-4',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  sound: 'M4 9v6h4l5 4V5L8 9z M17 9a4 4 0 0 1 0 6 M19.5 6.5a8 8 0 0 1 0 11',
  soundoff: 'M4 9v6h4l5 4V5L8 9z M17 9l5 6M22 9l-5 6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  more: c(5, 12, 1) + c(12, 12, 1) + c(19, 12, 1),
  rupee: 'M7 5h10M7 9h10M7 5c5 0 7 2 7 4s-2 4-7 4l7 6',
}

export default function Icon({ name, size = 20, filled = false, className = '', strokeWidth = 1.8 }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
