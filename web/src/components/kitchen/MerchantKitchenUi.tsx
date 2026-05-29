import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { KitchenOrder, KitchenTodayStats } from '../../lib/kitchenApi'

const S = {
  Pending: 0,
  Confirmed: 1,
  Preparing: 2,
  ReadyForPickup: 5,
  OutForDelivery: 3,
  Delivered: 4,
  Cancelled: 9,
} as const

export { S as KitchenOrderStatus }

export function formatOrderClock(placedAtUtc: string): string {
  try {
    return new Date(placedAtUtc).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export function minutesAgoLabel(placedAtUtc: string, nowMs = Date.now()): string {
  const t = Date.parse(placedAtUtc)
  if (!Number.isFinite(t)) return ''
  const m = Math.max(0, Math.floor((nowMs - t) / 60_000))
  if (m < 1) return 'tani'
  return `${m} min më parë`
}

function customerFullName(o: KitchenOrder): string {
  const f = o.customerFirstName?.trim() || ''
  const l = o.customerLastName?.trim() || ''
  return `${f} ${l}`.trim() || 'Klient'
}

const columnThemes = {
  new: { label: 'NEW', pill: 'bg-amber-400/15 text-amber-300 ring-amber-400/30' },
  progress: { label: 'IN PROGRESS', pill: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
  ready: { label: 'READY', pill: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  out: { label: 'OUT FOR DELIVERY', pill: 'bg-violet-500/15 text-violet-300 ring-violet-500/30' },
  completed: { label: 'COMPLETED', pill: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30' },
} as const

export function KanbanColumn({
  kind,
  count,
  children,
}: {
  kind: keyof typeof columnThemes
  count: number
  children: ReactNode
}) {
  const theme = columnThemes[kind]
  return (
    <div className="flex min-h-[320px] min-w-[min(100%,240px)] flex-1 flex-col rounded-xl border border-[#30363d] bg-[#161b22] md:min-w-0">
      <div className="flex items-center justify-between gap-2 border-b border-[#30363d] px-3 py-2.5">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ${theme.pill}`}
        >
          {theme.label}
        </span>
        <span className="min-w-[1.25rem] rounded-md bg-[#21262d] px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-zinc-200">
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">{children}</div>
    </div>
  )
}

export function ColumnEmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#21262d] text-zinc-500">{icon}</div>
      <p className="max-w-[12rem] text-xs leading-relaxed text-zinc-500">{text}</p>
    </div>
  )
}

function StatIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#21262d] text-zinc-400">
      {children}
    </div>
  )
}

export function StatsRow({
  stats,
  inDeliveryCount,
  avgPrepMinutes,
}: {
  stats: KitchenTodayStats
  inDeliveryCount: number
  avgPrepMinutes: number | null
}) {
  const cards = [
    {
      key: 'today',
      title: 'SOT',
      value: String(stats.ordersCount),
      sub: 'porosi · UTC',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      key: 'done',
      title: 'PËRFUNDUARA',
      value: String(stats.completedCount),
      sub: 'sot',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l2.5 2.5L16 9" />
        </svg>
      ),
    },
    {
      key: 'rev',
      title: 'TË HYRAT',
      value: `${stats.revenueTotal.toFixed(2)} €`,
      sub: 'excl. cancelled',
      valueClass: 'text-emerald-400',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      ),
    },
    {
      key: 'prep',
      title: 'MES. PËRGJATITJE',
      value: avgPrepMinutes != null ? `${avgPrepMinutes} min` : '—',
      sub: 'minuta',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    },
    {
      key: 'del',
      title: 'NË DORËZIM',
      value: String(inDeliveryCount),
      sub: 'porosi',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="6" cy="17" r="2" />
          <circle cx="18" cy="17" r="2" />
          <path d="M8 17h8M6 15l2-6h7l2 4h3" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex items-center gap-3 rounded-xl border border-[#30363d] bg-[#161b22] px-3 py-3 sm:px-4"
        >
          <StatIcon>{c.icon}</StatIcon>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">{c.title}</p>
            <p className={`mt-0.5 text-xl font-bold tabular-nums text-white ${c.valueClass ?? ''}`}>{c.value}</p>
            <p className="text-[10px] text-zinc-500">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

const merchantCardShell =
  'rounded-xl border border-[#30363d] bg-[#21262d] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.25)]'

export function MerchantOrderCard({
  o,
  nowMs,
  statusLine,
  footer,
  highlight,
}: {
  o: KitchenOrder
  nowMs?: number
  statusLine?: string
  footer?: ReactNode
  highlight?: boolean
}) {
  const isDelivery = o.fulfillmentType !== 'pickup'
  const orderLabel = o.orderNumber.startsWith('#') ? o.orderNumber : `#${o.orderNumber}`
  const address = [o.addressLine1, o.city].filter(Boolean).join(', ')

  return (
    <article className={`${merchantCardShell} ${highlight ? 'ring-1 ring-amber-400/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-[13px] font-semibold text-white">{orderLabel}</p>
          <p className="mt-0.5 text-[11px] tabular-nums text-zinc-500">{formatOrderClock(o.placedAtUtc)}</p>
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums text-white">{o.total.toFixed(2)} €</p>
      </div>

      <p className="mt-2 text-sm font-semibold text-zinc-100">{customerFullName(o)}</p>

      {isDelivery ? (
        <span className="mt-1.5 inline-block rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
          Delivery
        </span>
      ) : (
        <span className="mt-1.5 inline-block rounded bg-zinc-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
          Pickup
        </span>
      )}

      {address ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-zinc-400">
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span>{address}</span>
        </p>
      ) : null}

      {o.contactPhone ? (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <a href={`tel:${o.contactPhone.replace(/\s/g, '')}`} className="hover:text-sky-300">
            {o.contactPhone}
          </a>
        </p>
      ) : null}

      {statusLine ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {statusLine}
          {nowMs != null ? <span className="text-zinc-500"> · {minutesAgoLabel(o.placedAtUtc, nowMs)}</span> : null}
        </p>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </article>
  )
}

export function MerchantAssignDriverBtn({
  busy,
  onClick,
}: {
  busy?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full rounded-lg bg-emerald-500 py-2.5 text-center text-sm font-semibold text-[#0d1117] transition hover:bg-emerald-400 disabled:opacity-45"
    >
      Cakto driver
    </button>
  )
}

export function MerchantDetailsBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-[#30363d] bg-[#161b22] py-2 text-center text-sm font-medium text-zinc-300 transition hover:bg-[#21262d]"
    >
      Detaje
    </button>
  )
}

export function MerchantPrimaryBtn({
  children,
  busy,
  onClick,
}: {
  children: ReactNode
  busy?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="w-full rounded-lg bg-[#009fe3] py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#1aacf0] disabled:opacity-45"
    >
      {children}
    </button>
  )
}

export function MerchantGhostBtn({
  children,
  busy,
  onClick,
  danger,
}: {
  children: ReactNode
  busy?: boolean
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`w-full py-1 text-center text-xs font-medium disabled:opacity-45 ${
        danger ? 'text-red-400/90 hover:text-red-300' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  )
}

export function RecentHistorySection({
  rows,
  historyLink,
}: {
  rows: KitchenOrder[]
  historyLink: string
}) {
  if (rows.length === 0) return null
  return (
    <section className="rounded-xl border border-[#30363d] bg-[#161b22]">
      <div className="flex items-center justify-between gap-2 border-b border-[#30363d] px-4 py-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Recent history</h2>
        <Link to={historyLink} className="text-[11px] font-medium text-sky-400 hover:text-sky-300">
          Historiku i plotë →
        </Link>
      </div>
      <ul>
        {rows.map((o) => (
          <li
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363d] px-4 py-3 text-sm last:border-b-0"
          >
            <span className="font-mono text-xs text-zinc-300">{o.orderNumber}</span>
            <span className="text-zinc-500">
              {o.status === S.Cancelled
                ? 'Refuzuar'
                : o.fulfillmentType === 'pickup'
                  ? 'Marrë në lokacion'
                  : 'Dorëzuar'}
            </span>
            <span className="font-semibold tabular-nums text-zinc-200">{o.total.toFixed(2)} €</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
