import type { ReactNode, SVGProps } from 'react'

export type AdminNavIconName =
  | 'dashboard'
  | 'partner'
  | 'driver'
  | 'restaurant'
  | 'food'
  | 'orders'
  | 'riders'
  | 'zones'
  | 'users'
  | 'support'
  | 'finance'
  | 'promotions'
  | 'reviews'
  | 'reports'
  | 'import'
  | 'cms'
  | 'security'
  | 'settings'
  | 'logo'
  | 'search'
  | 'filter'
  | 'paperclip'
  | 'message'
  | 'sun'
  | 'chevronLeft'
  | 'chevronRight'

type IconProps = SVGProps<SVGSVGElement> & { name: AdminNavIconName; size?: number }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const paths: Record<AdminNavIconName, ReactNode> = {
  logo: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  dashboard: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </>
  ),
  partner: (
    <>
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M12 12v4M10 14h4" />
    </>
  ),
  driver: (
    <>
      <path d="M3 17h1.5l1.8-5.4a2 2 0 0 1 1.9-1.4h7.6a2 2 0 0 1 1.9 1.4L19.5 17H21" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
      <path d="M5 11h14l-1.5-4H6.5L5 11z" />
    </>
  ),
  restaurant: (
    <>
      <path d="M4 10V4h3v6M7 4v16M11 8V4h1v4h1v12" />
      <path d="M14 8h6v12h-6z" />
    </>
  ),
  food: (
    <>
      <path d="M4 6h16M4 12h16M4 18h10" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  orders: (
    <>
      <path d="M6 6h15l-1.5 9H7.5L6 6z" />
      <path d="M6 6 5 3H3" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </>
  ),
  riders: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 20v-1a6 6 0 0 1 12 0v1" />
    </>
  ),
  zones: (
    <>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a6 6 0 0 1 6-6h0" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M15 20v-1a4 4 0 0 1 4-4h0" />
    </>
  ),
  support: (
    <>
      <path d="M21 12a8 8 0 0 1-8 8H9l-4 3v-6.5A8 8 0 1 1 21 12z" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 14h4" />
    </>
  ),
  promotions: (
    <>
      <path d="M4 9V5a2 2 0 0 1 2-2h3l2 3h5a2 2 0 0 1 2 2v1" />
      <path d="M8 13h8l2 6H6l2-6z" />
    </>
  ),
  reviews: (
    <>
      <path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.2l5-.7L12 3z" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </>
  ),
  import: (
    <>
      <path d="M12 3v12M8 11l4 4 4-4" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </>
  ),
  cms: (
    <>
      <path d="M6 4h12v16H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  security: (
    <>
      <path d="M12 3 5 6v6c0 4.5 3.5 7.7 7 9 3.5-1.3 7-4.5 7-9V6z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  paperclip: (
    <>
      <path d="M8 12v-1.5a4 4 0 0 1 8 0V14a6 6 0 0 1-12 0V9" />
    </>
  ),
  message: (
    <>
      <path d="M21 12a8 8 0 0 1-8 8H9l-4 3v-6.5A8 8 0 1 1 21 12z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  chevronLeft: <path d="m14 6-6 6 6 6" />,
  chevronRight: <path d="m10 6 6 6-6 6" />,
}

export function AdminIcon({ name, size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className ?? 'shrink-0'}
      aria-hidden
      {...rest}
    >
      <g {...stroke}>{paths[name]}</g>
    </svg>
  )
}
