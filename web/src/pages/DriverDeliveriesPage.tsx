import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DRIVER_LEG,
  fetchDriverDeliveries,
  fetchDriverEarnings,
  fetchDriverOrderDetail,
  fetchDriverStatus,
  mapsDirectionsUrl,
  postDriverAcceptOffer,
  postDriverArrivedRestaurant,
  postDriverDeclineOffer,
  postDriverDelivered,
  postDriverOffline,
  postDriverOnline,
  postDriverPickup,
  type DriverDeliveryRow,
  type DriverEarnings,
  type DriverOrderDetail,
  type DriverStatus,
} from '../lib/driverApi'
import { ORDER_STATUS_CANCELLED, ORDER_STATUS_DELIVERED } from '../lib/orderStatusLabels'
import { OrderDeliveryChatPanel } from '../components/OrderDeliveryChatPanel'
import { useAuthStore } from '../store/authStore'
import { useDriverAlertsStore } from '../store/driverAlertsStore'

function fmtMoney(n: number) {
  return `${n.toFixed(2)} €`
}


function fmtOnlineTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function statusBadgeClasses(legStatus: number): string {
  if (legStatus === DRIVER_LEG.enRouteToCustomer) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  if (legStatus === DRIVER_LEG.atRestaurant) return 'bg-sky-500/20 text-sky-300 border-sky-500/30'
  if (legStatus === DRIVER_LEG.headingToRestaurant) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
}

function statusBadgeLabel(legStatus: number): string {
  if (legStatus === DRIVER_LEG.enRouteToCustomer) return 'PICKED UP'
  if (legStatus === DRIVER_LEG.atRestaurant) return 'AT RESTAURANT'
  if (legStatus === DRIVER_LEG.headingToRestaurant) return 'ACCEPTED'
  return 'PENDING'
}

export default function DriverDeliveriesPage() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState<DriverStatus | null>(null)
  const [rows, setRows] = useState<DriverDeliveryRow[]>([])
  const [earnings, setEarnings] = useState<DriverEarnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [detail, setDetail] = useState<DriverOrderDetail | null>(null)
  const [detailFor, setDetailFor] = useState<number | null>(null)
  const [chatOrderId, setChatOrderId] = useState<number | null>(null)

  const loadStatus = useCallback(async () => {
    if (!token) return
    const s = await fetchDriverStatus(token)
    setStatus(s)
  }, [token])

  const loadDeliveries = useCallback(async () => {
    if (!token) return
    const list = await fetchDriverDeliveries(token)
    setRows(list)
  }, [token])

  const loadEarnings = useCallback(async () => {
    if (!token) return
    try {
      const e = await fetchDriverEarnings(token)
      setEarnings(e)
    } catch {
      /* non-critical */
    }
  }, [token])

  const loadAll = useCallback(async () => {
    if (!token) return
    setError(null)
    await Promise.all([loadStatus(), loadDeliveries(), loadEarnings()])
  }, [token, loadStatus, loadDeliveries, loadEarnings])

  useEffect(() => {
    if (!token) return
    let c = false
    setLoading(true)
    void loadAll()
      .catch((e: unknown) => {
        if (!c) setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [token, loadAll])

  useEffect(() => {
    if (!token) return
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void loadAll().catch(() => {})
    }, 5000)
    return () => window.clearInterval(t)
  }, [token, loadAll])

  useEffect(() => {
    useDriverAlertsStore.getState().clearBell()
  }, [])

  useEffect(() => {
    const onRefresh = () => void loadAll().catch(() => {})
    window.addEventListener('fd-driver-refresh-deliveries', onRefresh)
    return () => window.removeEventListener('fd-driver-refresh-deliveries', onRefresh)
  }, [loadAll])

  const incoming = useMemo(() => rows.filter((r) => r.requiresAccept), [rows])
  const activeJobs = useMemo(() => rows.filter((r) => !r.requiresAccept), [rows])
  const chatRow = useMemo(() => rows.find((r) => r.orderId === chatOrderId), [rows, chatOrderId])

  const pickedUpJobs = useMemo(
    () => activeJobs.filter((r) => r.driverLegStatus === DRIVER_LEG.enRouteToCustomer),
    [activeJobs],
  )
  const queuedJobs = useMemo(
    () => activeJobs.filter((r) => r.driverLegStatus !== DRIVER_LEG.enRouteToCustomer),
    [activeJobs],
  )

  async function toggleOnline() {
    if (!token || !status) return
    setActionError(null)
    if (status.isOnline) {
      const r = await postDriverOffline(token)
      if (!r.ok) setActionError(r.message)
    } else {
      const r = await postDriverOnline(token)
      if (!r.ok) setActionError(r.message)
    }
    void loadStatus().then(() => {
      window.dispatchEvent(new CustomEvent('fd-driver-status-changed'))
    })
  }

  async function run(
    fn: () => Promise<{ ok: true } | { ok: false; message: string }>,
    orderId?: number,
  ) {
    if (!token) return
    setActionError(null)
    if (orderId != null) setBusyId(orderId)
    const r = await fn()
    if (orderId != null) setBusyId(null)
    if (!r.ok) setActionError(r.message)
    else void loadAll()
  }

  async function openDetail(orderId: number) {
    if (!token) return
    setDetailFor(orderId)
    setDetail(null)
    try {
      const d = await fetchDriverOrderDetail(token, orderId)
      setDetail(d)
    } catch {
      setDetail(null)
    }
  }

  function closeDetail() {
    setDetail(null)
    setDetailFor(null)
  }

  const onlineSeconds = status?.secondsOnlineToday ?? 0
  const displayName = user?.firstName ?? 'Driver'
  const initials = (user?.firstName?.[0] ?? 'D').toUpperCase()

  return (
    <div className="min-h-screen bg-[#0a0e17] pb-24">
      {/* ── Profile header ── */}
      <div className="px-4 pb-2 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20">
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold text-white">{displayName}</p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${status?.isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`}
                />
                <span className={`text-xs font-medium ${status?.isOnline ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {status?.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/driver/profile"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
              title="Profili"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
            <Link
              to="/driver/earnings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
              title="Fitimet"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </Link>
            <Link
              to="/driver/history"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
              title="Historiku"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Online toggle card ── */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-white">
                {status?.isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {status?.isOnline
                  ? 'Je online dhe po merr oferta'
                  : 'Ndiz online për të marrë porosi'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void toggleOnline()}
              className={`relative h-8 w-[52px] rounded-full transition-colors duration-200 ${
                status?.isOnline
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-zinc-700'
              }`}
              role="switch"
              aria-checked={!!status?.isOnline}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  status?.isOnline ? 'translate-x-[22px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-white/[0.08] bg-[#111827] px-3 py-3.5 text-center">
            <p className="text-xl font-bold text-white">{earnings?.todayDeliveriesCount ?? activeJobs.length}</p>
            <p className="mt-0.5 text-[11px] font-medium text-zinc-500">Porosi</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#111827] px-3 py-3.5 text-center">
            <p className="text-xl font-bold text-emerald-400">{fmtMoney(earnings?.todayTotal ?? 0)}</p>
            <p className="mt-0.5 text-[11px] font-medium text-zinc-500">Fitimi</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#111827] px-3 py-3.5 text-center">
            <p className="text-xl font-bold text-white">{fmtOnlineTime(onlineSeconds)}</p>
            <p className="mt-0.5 text-[11px] font-medium text-zinc-500">Koha</p>
          </div>
        </div>
      </div>

      {/* ── Errors ── */}
      {actionError && (
        <div className="px-4 pt-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {actionError}
          </div>
        </div>
      )}
      {error && (
        <div className="px-4 pt-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="px-4 pt-6">
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Duke ngarkuar…
          </div>
        </div>
      )}

      {/* ── Incoming offers ── */}
      {incoming.length > 0 && (
        <div className="px-4 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
              Ofertë e re
            </h2>
          </div>
          <div className="space-y-3">
            {incoming.map((r) => (
              <IncomingCard
                key={r.orderId}
                offeredAtUtc={r.offeredAtUtc}
                row={r}
                busy={busyId === r.orderId}
                onAccept={() =>
                  void run(() => postDriverAcceptOffer(token!, r.orderId), r.orderId)
                }
                onDecline={() =>
                  void run(() => postDriverDeclineOffer(token!, r.orderId), r.orderId)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Active deliveries (picked up) ── */}
      {pickedUpJobs.length > 0 && (
        <div className="px-4 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Porosia aktive
            </h2>
            <button
              type="button"
              className="text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
              onClick={() => void loadAll()}
            >
              Rifresko
            </button>
          </div>
          <div className="space-y-3">
            {pickedUpJobs.map((r) => (
              <ActiveOrderCard
                key={r.orderId}
                row={r}
                busyId={busyId}
                onArrived={() =>
                  void run(() => postDriverArrivedRestaurant(token!, r.orderId), r.orderId)
                }
                onPickup={() => void run(() => postDriverPickup(token!, r.orderId), r.orderId)}
                onDelivered={() => void run(() => postDriverDelivered(token!, r.orderId), r.orderId)}
                onOpenDetail={() => void openDetail(r.orderId)}
                onOpenChat={() => setChatOrderId(r.orderId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Queued orders ── */}
      {queuedJobs.length > 0 && (
        <div className="px-4 pt-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-300">
            Porosia në radhë ({queuedJobs.length})
          </h2>
          <div className="space-y-3">
            {queuedJobs.map((r) => (
              <ActiveOrderCard
                key={r.orderId}
                row={r}
                busyId={busyId}
                onArrived={() =>
                  void run(() => postDriverArrivedRestaurant(token!, r.orderId), r.orderId)
                }
                onPickup={() => void run(() => postDriverPickup(token!, r.orderId), r.orderId)}
                onDelivered={() => void run(() => postDriverDelivered(token!, r.orderId), r.orderId)}
                onOpenDetail={() => void openDetail(r.orderId)}
                onOpenChat={() => setChatOrderId(r.orderId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && activeJobs.length === 0 && incoming.length === 0 && (
        <div className="px-4 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#111827] text-zinc-600">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 5 20 16 16 13" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-400">
            Nuk ke dërgesa aktive
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {status?.isOnline
              ? 'Duke pritur oferta të reja…'
              : 'Ndiz online për të filluar marrjen e porosive'}
          </p>
        </div>
      )}

      {/* ── Quick links ── */}
      <div className="px-4 pt-6">
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: '/driver/stats', label: 'Stats', icon: 'M16 8v8M12 11v5M8 14v2M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z' },
            { to: '/driver/support', label: 'Support', icon: 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01M12 2a10 10 0 100 20 10 10 0 000-20z' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-[#111827]/60 px-2 py-3 text-zinc-500 transition hover:border-white/[0.12] hover:bg-[#111827] hover:text-zinc-300"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d={link.icon} />
              </svg>
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Order detail modal ── */}
      {detailFor != null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-[#0f1420] p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                Detaje porosie
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400 transition hover:bg-white/[0.1] hover:text-white"
                onClick={closeDetail}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {detail && token ? (
              <DetailBody detail={detail} token={token} />
            ) : (
              <div className="flex items-center justify-center py-10">
                <svg className="h-5 w-5 animate-spin text-zinc-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chat modal ── */}
      {chatOrderId != null && token && (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal
          aria-labelledby="driver-chat-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-violet-500/20 bg-[#0f1420] p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 id="driver-chat-title" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-300">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Chat me klientin
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400 transition hover:bg-white/[0.1] hover:text-white"
                onClick={() => setChatOrderId(null)}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="mt-3">
              <OrderDeliveryChatPanel
                token={token}
                orderId={chatOrderId}
                allowPost={
                  chatRow != null &&
                  chatRow.orderStatus !== ORDER_STATUS_DELIVERED &&
                  chatRow.orderStatus !== ORDER_STATUS_CANCELLED &&
                  chatRow.driverLegStatus !== DRIVER_LEG.completed
                }
                compact
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Offer countdown hook
 * ───────────────────────────────────────────────────────────────────────── */

const ACCEPT_WINDOW_SEC = 15

function useOfferCountdown(offeredAtUtc: string | null) {
  const [left, setLeft] = useState(ACCEPT_WINDOW_SEC)
  useEffect(() => {
    if (!offeredAtUtc) return
    const tick = () => {
      const off = new Date(offeredAtUtc).getTime()
      setLeft(Math.max(0, ACCEPT_WINDOW_SEC - Math.floor((Date.now() - off) / 1000)))
    }
    tick()
    const id = window.setInterval(tick, 300)
    return () => window.clearInterval(id)
  }, [offeredAtUtc])
  return left
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Incoming offer card — prominent full-width card
 * ───────────────────────────────────────────────────────────────────────── */

function IncomingCard({
  offeredAtUtc,
  row,
  busy,
  onAccept,
  onDecline,
}: {
  offeredAtUtc: string | null
  row: DriverDeliveryRow
  busy: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const left = useOfferCountdown(offeredAtUtc)
  const pct = (left / ACCEPT_WINDOW_SEC) * 100

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-[#111827] shadow-lg shadow-amber-900/20">
      {/* Map placeholder area */}
      <div className="relative flex h-28 items-center justify-center bg-[#0d1117]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.06),transparent_70%)]" />
        <svg className="h-8 w-8 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <div className="absolute right-3 top-3 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-sm">
          {row.distanceToRestaurantKm != null ? `${row.distanceToRestaurantKm} km` : '— km'}
          {row.estimatedTotalMinutes ? ` · ~${row.estimatedTotalMinutes} min` : ''}
        </div>
      </div>

      <div className="p-4">
        {/* Restaurant name */}
        <p className="text-lg font-bold text-white">{row.restaurantName}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {row.restaurantAddressLine}, {row.restaurantCity}
        </p>

        {/* Customer */}
        <div className="mt-3 flex items-start gap-2">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {row.customerFirstName} {row.customerLastName}
            </p>
            <p className="text-xs text-zinc-500">
              {row.customerAddressLine1}, {row.customerCity}
            </p>
          </div>
        </div>

        {/* Payout + distance */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5">
          <div>
            <p className="text-xs text-zinc-500">Pagesa</p>
            <p className="text-lg font-bold text-emerald-400">{fmtMoney(row.estimatedDriverPayout)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Distanca totale</p>
            <p className="text-sm font-medium text-zinc-300">
              {row.distanceToRestaurantKm != null && row.distanceRestaurantToCustomerKm != null
                ? `${(row.distanceToRestaurantKm + row.distanceRestaurantToCustomerKm).toFixed(1)} km`
                : '—'}
            </p>
          </div>
        </div>

        {/* Countdown bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-amber-300">
              Oferta skadon për {left} sekonda
            </span>
            <span className="font-mono text-amber-400">{left}s</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50"
            onClick={onAccept}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Prano
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 text-sm font-bold text-red-300 transition hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50"
            onClick={onDecline}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Refuzo
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Active / queued order card
 * ───────────────────────────────────────────────────────────────────────── */

function ActiveOrderCard({
  row,
  busyId,
  onArrived,
  onPickup,
  onDelivered,
  onOpenDetail,
}: {
  row: DriverDeliveryRow
  busyId: number | null
  onArrived: () => void
  onPickup: () => void
  onDelivered: () => void
  onOpenDetail: () => void
  onOpenChat: () => void
}) {
  const toRest = mapsDirectionsUrl({
    destLat: row.restaurantLatitude,
    destLng: row.restaurantLongitude,
    labelFallback: `${row.restaurantAddressLine}, ${row.restaurantCity}`,
  })
  const toClientFromRestaurant = mapsDirectionsUrl({
    destLat: row.customerLatitude,
    destLng: row.customerLongitude,
    originLat: row.restaurantLatitude,
    originLng: row.restaurantLongitude,
    labelFallback: `${row.customerAddressLine1}, ${row.customerCity}`,
  })
  const toClientFromHere = mapsDirectionsUrl({
    destLat: row.customerLatitude,
    destLng: row.customerLongitude,
    labelFallback: `${row.customerAddressLine1}, ${row.customerCity}`,
  })
  const enRouteToCustomer = row.driverLegStatus === DRIVER_LEG.enRouteToCustomer
  const mapToCustomerHref = enRouteToCustomer ? toClientFromHere : toClientFromRestaurant

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-4">
      {/* Header: order number + status badge */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-semibold text-zinc-500">{row.orderNumber}</p>
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClasses(row.driverLegStatus)}`}
        >
          {statusBadgeLabel(row.driverLegStatus)}
        </span>
      </div>

      {/* Restaurant info */}
      <div className="mt-3 flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 2l2.5 13h13L21 2H3z" />
            <path d="M16 19a2 2 0 100 4 2 2 0 000-4zM8 19a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{row.restaurantName}</p>
          <p className="truncate text-xs text-zinc-500">{row.restaurantAddressLine}, {row.restaurantCity}</p>
        </div>
      </div>

      {/* Customer info */}
      <div className="mt-2.5 flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200">
            {row.customerFirstName} {row.customerLastName}
          </p>
          <p className="truncate text-xs text-zinc-500">{row.customerAddressLine1}, {row.customerCity}</p>
          {row.distanceRestaurantToCustomerKm != null && (
            <p className="mt-0.5 text-xs text-zinc-600">
              {row.distanceRestaurantToCustomerKm} km
              {row.estimatedTotalMinutes ? ` · ~${row.estimatedTotalMinutes} min` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Customer notes */}
      {row.customerNotes && (
        <div className="mt-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          <span className="font-medium">Shënim:</span> {row.customerNotes}
        </div>
      )}

      {/* Price + payment */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">{fmtMoney(row.orderTotal)}</span>
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
            {row.paymentMethodLabel}
          </span>
        </div>
        {row.cashCollectAtDoor && (
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            Mblidh {fmtMoney(row.orderTotal)}
          </span>
        )}
      </div>

      {/* Primary navigation button → opens dedicated step page */}
      <Link
        to={`/driver/delivery/${row.orderId}`}
        className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 no-underline transition hover:bg-emerald-400 active:scale-[0.98]"
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {enRouteToCustomer ? 'Navigo te klienti' : row.canMarkArrivedRestaurant ? 'Navigo te restoranti' : row.canMarkPickedUp ? 'Merr porosinë' : 'Hap dërgesën'}
      </Link>

      {/* Secondary map links */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {toRest && (
          <a
            href={toRest}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-sky-300 no-underline transition hover:bg-white/[0.1]"
          >
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Restorant
          </a>
        )}
        {mapToCustomerHref && !enRouteToCustomer && (
          <a
            href={mapToCustomerHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-sky-300 no-underline transition hover:bg-white/[0.1]"
          >
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Klient
          </a>
        )}
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.1] hover:text-zinc-200"
          onClick={onOpenDetail}
        >
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Detaje
        </button>
        <ChatLink orderId={row.orderId} />
      </div>

      {/* Step action buttons */}
      <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.06] pt-3">
        {row.canMarkArrivedRestaurant && (
          <button
            type="button"
            disabled={busyId === row.orderId}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-bold text-white shadow-lg shadow-sky-500/15 transition hover:bg-sky-400 active:scale-[0.98] disabled:opacity-50"
            onClick={onArrived}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Arrita te restoranti
          </button>
        )}
        {row.canMarkPickedUp && (
          <button
            type="button"
            disabled={busyId === row.orderId}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-blue-500 text-sm font-bold text-white shadow-lg shadow-blue-500/15 transition hover:bg-blue-400 active:scale-[0.98] disabled:opacity-50"
            onClick={onPickup}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 9h18v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path d="M3 9l2.5-4h13L21 9" />
            </svg>
            E mora porosinë
          </button>
        )}
        {row.driverLegStatus === DRIVER_LEG.enRouteToCustomer && (
          <p className="text-center text-[11px] text-zinc-600">
            Pas dorëzimit shtypni butonin poshtë
          </p>
        )}
        {row.canMarkDelivered && (
          <button
            type="button"
            disabled={busyId === row.orderId}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50"
            onClick={onDelivered}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Dorëzova te klienti
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Order detail body (inside modal)
 * ───────────────────────────────────────────────────────────────────────── */

function DetailBody({ detail, token }: { detail: DriverOrderDetail; token: string }) {
  const chatVisible = detail.driverLegStatus !== DRIVER_LEG.pendingAccept
  const chatAllowPost =
    detail.orderStatus !== ORDER_STATUS_DELIVERED &&
    detail.orderStatus !== ORDER_STATUS_CANCELLED &&
    detail.driverLegStatus !== DRIVER_LEG.completed
  const rUrl = mapsDirectionsUrl({
    destLat: detail.restaurant.latitude,
    destLng: detail.restaurant.longitude,
    labelFallback: `${detail.restaurant.addressLine}, ${detail.restaurant.city}`,
  })
  const cUrl = mapsDirectionsUrl({
    destLat: detail.customer.latitude,
    destLng: detail.customer.longitude,
    labelFallback: `${detail.customer.addressLine}, ${detail.customer.city}`,
  })
  return (
    <div className="mt-4 space-y-5 text-sm">
      {/* Restaurant section */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Restoranti</p>
        <p className="mt-1 font-semibold text-white">{detail.restaurant.displayName}</p>
        <p className="text-xs text-zinc-500">
          {detail.restaurant.addressLine}, {detail.restaurant.city}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {detail.restaurant.phone && (
            <a
              href={`tel:${detail.restaurant.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-1 text-xs text-sky-400 no-underline hover:text-sky-300"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
              {detail.restaurant.phone}
            </a>
          )}
          {rUrl && (
            <a href={rUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-sky-400 no-underline hover:text-sky-300">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Hartë
            </a>
          )}
        </div>
      </div>

      {/* Customer section */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Klienti</p>
        <p className="mt-1 font-semibold text-white">{detail.customer.displayName}</p>
        <p className="text-xs text-zinc-500">
          {detail.customer.addressLine}, {detail.customer.city}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {detail.customer.phone && (
            <a
              href={`tel:${detail.customer.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-1 text-xs text-sky-400 no-underline hover:text-sky-300"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
              {detail.customer.phone}
            </a>
          )}
          {cUrl && (
            <a href={cUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-sky-400 no-underline hover:text-sky-300">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Hartë
            </a>
          )}
        </div>
      </div>

      {/* Customer notes */}
      {detail.customerNotes && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-200">
          <span className="font-semibold">Shënim:</span> {detail.customerNotes}
        </div>
      )}

      {/* Order items */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Produktet</p>
        <ul className="mt-2 space-y-1.5">
          {detail.lines.map((l, i) => (
            <li key={i} className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-bold text-zinc-500">
                  {l.quantity}×
                </span>
                {l.name}
              </span>
              <span className="font-medium text-zinc-200">{fmtMoney(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-white/[0.06] pt-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">{detail.paymentMethodLabel}</span>
            {detail.cashToCollect != null && (
              <span className="font-bold text-emerald-400">Mblidh: {fmtMoney(detail.cashToCollect)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat */}
      {chatVisible && (
        <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-3.5">
          <OrderDeliveryChatPanel
            token={token}
            orderId={detail.orderId}
            allowPost={chatAllowPost}
            compact
          />
        </div>
      )}
    </div>
  )
}

function ChatLink({ orderId }: { orderId: number }) {
  const chatUnread = useDriverAlertsStore((s) => s.chatUnread)
  const clearChat = useDriverAlertsStore((s) => s.clearChatUnread)
  return (
    <Link
      to={`/driver/chat/${orderId}`}
      onClick={clearChat}
      className="relative flex items-center gap-1 rounded-lg border border-violet-500/25 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-300 no-underline transition hover:bg-violet-500/20"
    >
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Chat
      {chatUnread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sky-500 px-0.5 text-[9px] font-bold text-white">
          {chatUnread}
        </span>
      )}
    </Link>
  )
}
