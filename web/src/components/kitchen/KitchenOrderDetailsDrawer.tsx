import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { KitchenOrder } from '../../lib/kitchenApi'
import { formatOrderClock } from './MerchantKitchenUi'

const S = {
  Pending: 0,
  Confirmed: 1,
  Preparing: 2,
  ReadyForPickup: 5,
  OutForDelivery: 3,
  Delivered: 4,
  Cancelled: 9,
} as const

function customerFullName(o: KitchenOrder): string {
  const f = o.customerFirstName?.trim() || ''
  const l = o.customerLastName?.trim() || ''
  return `${f} ${l}`.trim() || 'Klient'
}

function statusMeta(status: number): { label: string; pill: string } {
  switch (status) {
    case S.Pending:
      return { label: 'NEW', pill: 'bg-amber-400/15 text-amber-300 ring-amber-400/30' }
    case S.Confirmed:
    case S.Preparing:
      return { label: 'IN PROGRESS', pill: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' }
    case S.ReadyForPickup:
      return { label: 'READY', pill: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' }
    case S.OutForDelivery:
      return { label: 'OUT FOR DELIVERY', pill: 'bg-violet-500/15 text-violet-300 ring-violet-500/30' }
    case S.Delivered:
      return { label: 'COMPLETED', pill: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30' }
    case S.Cancelled:
      return { label: 'CANCELLED', pill: 'bg-red-500/15 text-red-300 ring-red-500/30' }
    default:
      return { label: '—', pill: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30' }
  }
}

const cardBtnBase =
  'group flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/50'

/** Buton i butë, pa kornizë të fortë — më i rehatshëm për sy. */
const cardBtnDetails = `${cardBtnBase} bg-[#30363d] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:bg-[#3a424d] hover:text-white`

const cardBtnSecondary = `${cardBtnBase} bg-[#282e36] text-zinc-300 hover:bg-[#323841] hover:text-zinc-100`

const cardBtnIcon = 'text-zinc-400 transition-colors group-hover:text-zinc-200'

function IconEye({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={`${cardBtnIcon} ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconClock({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={`${cardBtnIcon} ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-zinc-500">{children}</span>
  )
}

export function MerchantCardFooterActions({
  showPrepBtn = true,
  onDetails,
  onPrep,
}: {
  showPrepBtn?: boolean
  onDetails: () => void
  onPrep?: () => void
}) {
  return (
    <div className={`grid gap-2.5 ${showPrepBtn && onPrep ? 'grid-cols-2' : 'grid-cols-1'}`}>
      <button type="button" onClick={onDetails} className={cardBtnDetails}>
        <IconEye />
        <span>Detajet</span>
      </button>
      {showPrepBtn && onPrep ? (
        <button type="button" onClick={onPrep} className={cardBtnSecondary}>
          <IconClock />
          <span className="truncate">Min. përgatitje</span>
        </button>
      ) : null}
    </div>
  )
}

export function MerchantDetailsBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cardBtnDetails}>
      <IconEye />
      <span>Detajet</span>
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="shrink-0 font-medium tabular-nums text-zinc-200">{value}</span>
    </div>
  )
}

type DrawerProps = {
  order: KitchenOrder | null
  busy: boolean
  focusPrep?: boolean
  onClose: () => void
  onPrepSave: (orderId: number, minutes: number) => Promise<boolean>
  onStatusAction: (orderId: number, status: number) => Promise<boolean>
  onReject: (orderId: number) => void
}

export function KitchenOrderDetailsDrawer({
  order,
  busy,
  focusPrep = false,
  onClose,
  onPrepSave,
  onStatusAction,
  onReject,
}: DrawerProps) {
  const [prepValue, setPrepValue] = useState('')
  const prepRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!order) return
    setPrepValue(String(order.estimatedPrepMinutes))
  }, [order])

  useEffect(() => {
    if (!order || !focusPrep) return
    const t = window.setTimeout(() => prepRef.current?.focus(), 120)
    return () => window.clearTimeout(t)
  }, [order, focusPrep])

  useEffect(() => {
    if (!order) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [order, onClose])

  if (!order) return null

  const meta = statusMeta(order.status)
  const orderLabel = order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`
  const address = [order.addressLine1, order.city].filter(Boolean).join(', ')
  const typeLabel = order.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'
  const phoneHref = order.contactPhone ? `tel:${order.contactPhone.replace(/\s/g, '')}` : null

  let primaryLabel: string | null = null
  let primaryStatus: number | null = null
  if (order.status === S.Confirmed) {
    primaryLabel = 'Fillo përgatitjen'
    primaryStatus = S.Preparing
  } else if (order.status === S.Preparing) {
    primaryLabel = 'Gati për marrje'
    primaryStatus = S.ReadyForPickup
  } else if (order.status === S.ReadyForPickup && order.fulfillmentType === 'pickup') {
    primaryLabel = 'Klienti e mori'
    primaryStatus = S.Delivered
  }

  const canReject =
    order.status === S.Pending ||
    order.status === S.Confirmed ||
    order.status === S.Preparing

  const showPrepEditor =
    focusPrep || order.status === S.Confirmed || order.status === S.Preparing

  async function handlePrimaryClick() {
    if (!order || primaryStatus == null || busy) return
    if (order.status === S.Confirmed && primaryStatus === S.Preparing) {
      const m = Math.round(Number(prepValue))
      if (!Number.isFinite(m) || m < 5 || m > 300) return
      const prepOk = await onPrepSave(order.id, m)
      if (!prepOk) return
    }
    await onStatusAction(order.id, primaryStatus)
  }

  const panel = (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/55" role="presentation">
      <button type="button" className="absolute inset-0" aria-label="Mbyll" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal
        aria-labelledby="kitchen-order-details-title"
        className="relative flex h-full w-full max-w-[380px] flex-col bg-[#0d1117] shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#21262d] px-5 py-4">
          <h2 id="kitchen-order-details-title" className="text-[17px] font-bold text-white">
            Detajet e porosisë
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-zinc-500 hover:bg-[#21262d] hover:text-white"
            aria-label="Mbyll"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-all font-mono text-[13px] font-semibold leading-snug text-white">{orderLabel}</p>
            <span
              className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${meta.pill}`}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-zinc-500">
            {formatOrderClock(order.placedAtUtc)} · {typeLabel}
          </p>

          <section className="mt-5 rounded-xl bg-[#161b22] px-4 py-3.5 ring-1 ring-[#21262d]">
            <p className="text-[15px] font-semibold text-white">{customerFullName(order)}</p>
            {phoneHref ? (
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={phoneHref}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#0d1117] transition hover:bg-emerald-400"
                  aria-label="Telefono klientin"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </a>
                <a href={phoneHref} className="min-w-0 break-all text-[13px] text-zinc-300 hover:text-sky-300">
                  {order.contactPhone}
                </a>
              </div>
            ) : null}
            {address ? (
              <p className="mt-3 flex gap-2 text-[13px] leading-relaxed text-zinc-400">
                <RowIcon>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </RowIcon>
                <span className="min-w-0 break-words pt-0.5">{address}</span>
              </p>
            ) : null}
          </section>

          <section className="mt-5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Artikujt e porosisë</h3>
            <ul className="mt-2.5 divide-y divide-[#21262d] rounded-xl bg-[#161b22] ring-1 ring-[#21262d]">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 text-[13px] text-zinc-200">
                    <span className="font-semibold text-white">{l.quantity}×</span> {l.name}
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-zinc-400">
                    {(l.unitPrice * l.quantity).toFixed(2)} €
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {order.customerNotes ? (
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400/90">Vërejtje</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-amber-100/90">{order.customerNotes}</p>
            </div>
          ) : null}

          {order.assignedDriverDisplay ? (
            <p className="mt-4 text-[13px] text-zinc-500">
              Korrier: <span className="font-medium text-emerald-400">{order.assignedDriverDisplay}</span>
            </p>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-[#21262d] bg-[#0d1117] px-5 py-4">
          {showPrepEditor ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#161b22] px-3 py-3 ring-1 ring-sky-500/40">
              <span className="text-[13px] text-zinc-400">Min. përgatitje</span>
              <input
                ref={prepRef}
                type="number"
                min={5}
                max={300}
                value={prepValue}
                onChange={(e) => setPrepValue(e.target.value)}
                disabled={busy}
                className="w-16 rounded-lg border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-center text-sm text-white"
              />
              <span className="text-[13px] text-zinc-500">min</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onPrepSave(order.id, Number(prepValue))}
                className="ml-auto rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-45"
              >
                Ruaj
              </button>
            </div>
          ) : null}

          <div className="space-y-2">
            <SummaryRow label="Min. përgatitje" value={`${order.estimatedPrepMinutes} min`} />
            <SummaryRow label="Koha e porosisë" value={formatOrderClock(order.placedAtUtc)} />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#21262d] pt-4">
            <span className="text-sm font-medium text-zinc-300">Totali</span>
            <span className="text-[22px] font-bold tabular-nums text-white">{order.total.toFixed(2)} €</span>
          </div>

          <div className="mt-4 space-y-2">
            {primaryLabel && primaryStatus != null ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePrimaryClick()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#009fe3] py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(0,159,227,0.25)] transition hover:bg-[#1aacf0] disabled:opacity-45"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 4v5h5M20 20v-5h-5M20 9A8 8 0 0 0 7 7M4 15a8 8 0 0 0 13 2" />
                </svg>
                {primaryLabel}
              </button>
            ) : null}
            {canReject ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onClose()
                  onReject(order.id)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-45"
              >
                <span className="text-base leading-none" aria-hidden>
                  ×
                </span>
                Refuzo porosinë
              </button>
            ) : null}
          </div>
        </footer>
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
