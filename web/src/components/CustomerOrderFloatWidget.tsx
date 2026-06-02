import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { estimateDriveEtaMinutes } from '../lib/geoEta'
import {
  ORDER_STATUS_OUT_FOR_DELIVERY,
  ORDER_STATUS_CONFIRMED,
  ORDER_STATUS_PREPARING,
  ORDER_STATUS_READY_FOR_PICKUP,
  isCourierEnRouteToCustomer,
  isTerminalOrderStatus,
} from '../lib/orderStatusLabels'
import {
  FULFILLMENT_PICKUP,
  fetchMyOrder,
  fetchMyOrders,
  type CustomerOrderDetail,
  type CustomerOrderSummary,
} from '../lib/ordersApi'
import { createOrdersHubConnection, startOrdersHub } from '../lib/orderHub'
import { useAuthStore } from '../store/authStore'

function pickActiveOrder(list: CustomerOrderSummary[]): CustomerOrderSummary | null {
  const active = list.filter((o) => !isTerminalOrderStatus(o.status))
  if (active.length === 0) return null
  active.sort((a, b) => new Date(b.placedAtUtc).getTime() - new Date(a.placedAtUtc).getTime())
  return active[0] ?? null
}

function statusLabel(order: CustomerOrderDetail): string {
  if (isCourierEnRouteToCustomer(order)) return 'Në rrugë për te ju'
  if (order.status === 0) return 'Dërguar te restoranti'
  if (order.status === ORDER_STATUS_CONFIRMED) return 'Pranuar nga restoranti'
  if (order.status === ORDER_STATUS_PREPARING) return 'Duke u përgatitur...'
  if (order.status === ORDER_STATUS_READY_FOR_PICKUP) return 'Gati për marrje'
  if (order.status === ORDER_STATUS_OUT_FOR_DELIVERY) return 'Në rrugë për te ju'
  return 'Duke u procesuar...'
}

function progressPercent(detail: CustomerOrderDetail): number {
  if (isTerminalOrderStatus(detail.status)) return 100
  const pickup = detail.fulfillmentType === FULFILLMENT_PICKUP
  const m: Record<number, number> = pickup
    ? { 0: 12, 1: 30, 2: 50, 5: 72, 3: 85 }
    : { 0: 10, 1: 22, 2: 38, 5: 52, 3: 78, 4: 100 }
  if (!pickup && isCourierEnRouteToCustomer(detail)) return m[ORDER_STATUS_OUT_FOR_DELIVERY]
  return m[detail.status] ?? 18
}

export function CustomerOrderFloatWidget() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<CustomerOrderSummary | null>(null)
  const [detail, setDetail] = useState<CustomerOrderDetail | null>(null)
  const [liveDriver, setLiveDriver] = useState<{ lat: number; lng: number } | null>(null)
  const orderRef = useRef<CustomerOrderDetail | null>(null)
  orderRef.current = detail

  const refresh = useCallback(async () => {
    if (!token) {
      setSummary(null)
      setDetail(null)
      return
    }
    try {
      const list = await fetchMyOrders(token)
      const s = pickActiveOrder(list)
      setSummary(s)
      if (!s) {
        setDetail(null)
        return
      }
      const d = await fetchMyOrder(token, s.id)
      setDetail(d)
    } catch {
      setSummary(null)
      setDetail(null)
    }
  }, [token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onRefresh = () => void refresh()
    window.addEventListener('fd-refresh-active-order', onRefresh)
    return () => window.removeEventListener('fd-refresh-active-order', onRefresh)
  }, [refresh])

  useEffect(() => {
    if (!token || !summary) return
    const t = window.setInterval(() => void refresh(), 14_000)
    return () => window.clearInterval(t)
  }, [token, summary, refresh])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  const orderId = summary?.id

  useEffect(() => {
    if (!token || !orderId || !Number.isFinite(orderId)) {
      setLiveDriver(null)
      return
    }
    const conn = createOrdersHubConnection(token)
    conn.on('orderStatus', (payload: { orderId: number; status?: number }) => {
      if (payload.orderId !== orderId) return
      if (typeof payload.status === 'number') {
        setDetail((prev) =>
          prev && prev.id === orderId ? { ...prev, status: payload.status as number } : prev,
        )
      }
      void fetchMyOrder(token, orderId).then((d) => {
        if (d && d.id === orderId) setDetail(d)
      })
    })
    conn.on(
      'driverLocation',
      (payload: { orderId: number; latitude: number; longitude: number }) => {
        if (payload.orderId !== orderId) return
        const st = orderRef.current?.status
        if (st !== undefined && isTerminalOrderStatus(st)) return
        setLiveDriver({ lat: payload.latitude, lng: payload.longitude })
      },
    )
    let stopped = false
    ;(async () => {
      try {
        await startOrdersHub(conn, [{ kind: 'order', orderId }])
      } catch {
        /* SignalR — widget përdor edhe polling nga refresh */
      }
    })()
    return () => {
      stopped = true
      setLiveDriver(null)
      void conn.stop()
    }
  }, [token, orderId])

  useEffect(() => {
    setLiveDriver(null)
  }, [orderId])

  const driverForMap = useMemo(() => {
    if (!detail || isTerminalOrderStatus(detail.status)) return null
    return (
      liveDriver ??
      (detail.driverLatitude != null && detail.driverLongitude != null
        ? { lat: detail.driverLatitude, lng: detail.driverLongitude }
        : null)
    )
  }, [detail, liveDriver])

  const etaMinutes = useMemo(() => {
    if (!detail || detail.fulfillmentType === FULFILLMENT_PICKUP) return null
    if (!isCourierEnRouteToCustomer(detail)) return null
    const d = driverForMap
    if (!d || detail.customerLatitude == null || detail.customerLongitude == null) return null
    return estimateDriveEtaMinutes(
      d,
      { lat: detail.customerLatitude, lng: detail.customerLongitude },
      24,
    )
  }, [detail, driverForMap])

  const onOrderDetailPage =
    detail != null && location.pathname === `/app/orders/${detail.id}`

  if (!token || !summary || !detail || onOrderDetailPage) return null

  const ringPct = progressPercent(detail)
  const enRoute = isCourierEnRouteToCustomer(detail)
  const centerContent = enRoute && etaMinutes != null ? `${etaMinutes}` : null
  const gradId = `fd-widget-ring-${detail.id}`
  const circumference = 2 * Math.PI * 22

  return (
    <div
      className="fixed right-4 top-[72px] z-[85] animate-[fd-slide-in_0.35s_ease-out]"
      style={{ animationFillMode: 'backwards' }}
    >
      <button
        type="button"
        onClick={() => navigate(`/app/orders/${detail.id}`)}
        className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-[#111827]/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl transition-all hover:border-[#F5B800]/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_4px_rgba(245,184,0,0.15)]"
      >
        {/* Progress ring */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56" aria-hidden>
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="rgba(52,211,153,0.12)"
              strokeWidth="3.5"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${(ringPct / 100) * circumference} ${circumference}`}
              className="transition-[stroke-dasharray] duration-700"
            />
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="50%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
          <div className="relative z-10 flex flex-col items-center">
            {centerContent ? (
              <>
                <span className="text-[17px] font-bold leading-none tracking-tight text-white tabular-nums">
                  {centerContent}
                </span>
                <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-widest text-emerald-300/70">
                  min
                </span>
              </>
            ) : (
              <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            )}
          </div>
        </div>

        {/* Order info */}
        <div className="min-w-0 text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#F5B800]">
            Porosia jote
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">
            {detail.restaurantName}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {statusLabel(detail)}
          </p>
          <p className="mt-1 text-xs font-medium text-[#F5B800] transition-colors group-hover:text-[#ffd04a]">
            Shiko porosinë →
          </p>
        </div>

        {/* Delivery motorcycle icon */}
        <div className="ml-1 flex shrink-0 items-center">
          <svg
            className="h-9 w-9 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden
          >
            <circle cx="14" cy="34" r="5" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="36" cy="34" r="5" stroke="currentColor" strokeWidth="2.2" />
            <path
              d="M19 34h12M14 29l5-10h6l3 5h8"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="22" y="14" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M25 14v-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </button>
    </div>
  )
}
