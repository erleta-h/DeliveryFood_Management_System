import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { estimateDriveEtaMinutes } from '../lib/geoEta'
import {
  ORDER_STATUS_OUT_FOR_DELIVERY,
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
import { createOrdersHubConnection } from '../lib/orderHub'
import { useAuthStore } from '../store/authStore'
import { OrderTrackingMapLeaflet } from './OrderTrackingMapLeaflet'

const STORAGE_KEY = 'fd-customer-order-float-pos-v1'
/** Diametër i butonit (px) — pak më i madh për lexim dhe prekje më të lehtë. */
const WIDGET = 92
const EDGE = 10
const DRAG_THRESHOLD = 8

type Pos = { left: number; top: number }

function readPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as Pos
    if (typeof j.left !== 'number' || typeof j.top !== 'number') return null
    return j
  } catch {
    return null
  }
}

function defaultPos(): Pos {
  if (typeof window === 'undefined') return { left: 16, top: 100 }
  return {
    left: Math.max(EDGE, window.innerWidth - WIDGET - 20),
    top: Math.max(EDGE, window.innerHeight - WIDGET - 100),
  }
}

function clampPos(p: Pos): Pos {
  if (typeof window === 'undefined') return p
  const maxL = Math.max(EDGE, window.innerWidth - WIDGET - EDGE)
  const maxT = Math.max(EDGE, window.innerHeight - WIDGET - EDGE)
  return {
    left: Math.min(maxL, Math.max(EDGE, p.left)),
    top: Math.min(maxT, Math.max(EDGE, p.top)),
  }
}

function pickActiveOrder(list: CustomerOrderSummary[]): CustomerOrderSummary | null {
  const active = list.filter((o) => !isTerminalOrderStatus(o.status))
  if (active.length === 0) return null
  active.sort((a, b) => new Date(b.placedAtUtc).getTime() - new Date(a.placedAtUtc).getTime())
  return active[0] ?? null
}

function shortLabel(order: CustomerOrderDetail): string {
  if (isCourierEnRouteToCustomer(order)) return 'Në rrugë'
  if (order.status === 0) return 'Dërguar'
  if (order.status === 1) return 'Pranuar'
  if (order.status === 2) return 'Përgatitje'
  if (order.status === 5) return 'Gati'
  if (order.status === ORDER_STATUS_OUT_FOR_DELIVERY) return 'Në rrugë'
  return '…'
}

export function CustomerOrderFloatWidget() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  const navigate = useNavigate()
  const [pos, setPos] = useState<Pos>(() => clampPos(readPos() ?? defaultPos()))
  const [summary, setSummary] = useState<CustomerOrderSummary | null>(null)
  const [detail, setDetail] = useState<CustomerOrderDetail | null>(null)
  const [liveDriver, setLiveDriver] = useState<{ lat: number; lng: number } | null>(null)
  const drag = useRef<{
    startX: number
    startY: number
    origLeft: number
    origTop: number
    moved: boolean
    /** Me `setPointerCapture`, `pointerup.target` bëhet div-i kapës — ruajmë prekjen fillestare. */
    startedOnMiniMap: boolean
  } | null>(null)

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

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const orderId = summary?.id
  const orderRef = useRef<CustomerOrderDetail | null>(null)
  orderRef.current = detail

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
        await conn.start()
        if (!stopped) await conn.invoke('JoinOrder', orderId)
      } catch {
        /* SignalR */
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

  const restaurantPt =
    detail &&
    detail.restaurantLatitude != null &&
    detail.restaurantLongitude != null
      ? {
          lat: detail.restaurantLatitude,
          lng: detail.restaurantLongitude,
          title: detail.restaurantName,
          label: 'R',
          color: '#c4a574',
        }
      : null
  const customerPt =
    detail &&
    detail.customerLatitude != null &&
    detail.customerLongitude != null
      ? {
          lat: detail.customerLatitude,
          lng: detail.customerLongitude,
          title: 'Adresa',
          label: 'K',
          color: '#7dd3fc',
        }
      : null
  const driverPt = driverForMap
    ? {
        ...driverForMap,
        title: liveDriver ? 'Korrieri (live)' : 'Korrieri',
        label: 'D',
        color: '#86efac',
      }
    : null
  const canMap = !!(restaurantPt || customerPt || driverPt) && detail && !isTerminalOrderStatus(detail.status)

  const orderIdRef = useRef(detail?.id ?? 0)
  orderIdRef.current = detail?.id ?? 0

  const enRoute = detail != null && isCourierEnRouteToCustomer(detail)

  const showMiniMap = detail != null && enRoute && canMap

  const floatEtaPinStyle = showMiniMap && enRoute && etaMinutes != null

  const centerText = useMemo(() => {
    if (!detail) return ''
    if (enRoute && etaMinutes != null) return `${etaMinutes}m`
    return shortLabel(detail)
  }, [detail, enRoute, etaMinutes])

  const ringPct = useMemo(() => {
    if (!detail) return 0
    if (isTerminalOrderStatus(detail.status)) return 100
    const pickup = detail.fulfillmentType === FULFILLMENT_PICKUP
    const m: Record<number, number> = pickup
      ? { 0: 12, 1: 30, 2: 50, 5: 72, 3: 85 }
      : { 0: 10, 1: 22, 2: 38, 5: 52, 3: 78, 4: 100 }
    if (!pickup && isCourierEnRouteToCustomer(detail)) return m[ORDER_STATUS_OUT_FOR_DELIVERY]
    return m[detail.status] ?? 18
  }, [detail])

  const gradId = detail ? `fd-float-ring-${detail.id}` : 'fd-float-ring'

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    const t = e.target as HTMLElement | null
    const startedOnMiniMap = Boolean(
      showMiniMap && t?.closest?.('[data-fd-float-map]'),
    )
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: pos.left,
      origTop: pos.top,
      moved: false,
      startedOnMiniMap,
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true
    setPos(clampPos({ left: d.origLeft + dx, top: d.origTop + dy }))
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current
    drag.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
    setPos((p) => {
      const c = clampPos(p)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
      } catch {
        /* */
      }
      return c
    })
    if (!d || d.moved || !orderIdRef.current) return
    if (d.startedOnMiniMap) void goOrderTracking()
    else void navigate(`/app/orders/${orderIdRef.current}`)
  }

  function goOrderTracking() {
    const id = orderIdRef.current
    if (!id) return
    /** `harta=1` hap modalin «Ku është korrieri» në faqen e porosisë (si në screenshot). */
    void navigate(`/app/orders/${id}?harta=1`)
  }

  if (!token || !summary || !detail || onOrderDetailPage) return null

  return (
    <>
      <div
        className="pointer-events-auto fixed z-[85] select-none touch-none"
        style={{ left: pos.left, top: pos.top, width: WIDGET, height: WIDGET }}
      >
        <div
          tabIndex={showMiniMap ? -1 : 0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(e) => {
            if (showMiniMap) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              goOrderTracking()
            }
          }}
          className="absolute inset-0 flex cursor-grab flex-col items-center justify-center rounded-full border-2 border-emerald-400/40 bg-gradient-to-br from-slate-900/92 via-[#0f1c17]/93 to-slate-950/92 shadow-[0_10px_42px_-8px_rgba(52,211,153,0.3),0_4px_20px_rgba(0,0,0,0.48)] backdrop-blur-md transition hover:brightness-[1.06] active:cursor-grabbing"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          aria-label={`Porosia aktive: ${detail.orderNumber}. Tërhiq nga unaza; prek për detajet e porosisë${showMiniMap ? '; prek hartën në mes për gjurmimin e korrierit.' : ''}.`}
        >
          {!showMiniMap ? (
            <span className="pointer-events-none absolute inset-[3px] rounded-full bg-emerald-500/[0.08]" />
          ) : null}
          <svg
            className="pointer-events-none absolute h-[calc(100%-8px)] w-[calc(100%-8px)] -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(52,211,153,0.16)"
              strokeWidth="5"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(ringPct / 100) * 264} 264`}
              className="transition-[stroke-dasharray] duration-500"
            />
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="45%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>

          {showMiniMap ? (
            <div
              role="button"
              tabIndex={0}
              data-fd-float-map
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  goOrderTracking()
                }
              }}
              className="absolute left-1/2 top-1/2 z-[8] h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 cursor-grab overflow-hidden rounded-full border border-emerald-400/40 bg-slate-950/30 shadow-[0_3px_14px_rgba(0,0,0,0.4),0_0_0_1px_rgba(52,211,153,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] transition active:cursor-grabbing active:scale-[0.98]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Hap faqen e gjurmimit të korrierit; tërhiq nga unaza jashtë hartës për ta lëvizur widget-in."
              title="Gjurmo korrierin"
            >
              <div className="relative h-full w-full">
                <OrderTrackingMapLeaflet
                  variant="mini"
                  restaurant={restaurantPt}
                  customer={customerPt}
                  driver={driverPt}
                  followDriver={!!driverPt}
                  driverEtaMinutes={etaMinutes}
                  className="pointer-events-none h-full w-full [&_.leaflet-container]:brightness-[0.78] [&_.leaflet-container]:saturate-[0.92]"
                />
                {/* Lehtë hije që të mos “djegë” hartën — ende duket qartë që është hartë. */}
                <div
                  className="pointer-events-none absolute inset-0 z-[1] rounded-full bg-gradient-to-b from-black/12 via-transparent to-black/22 shadow-[inset_0_2px_16px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                  aria-hidden
                />
              </div>
            </div>
          ) : null}

          {floatEtaPinStyle ? (
            <span className="pointer-events-none relative z-[12] flex flex-col items-center px-0.5 text-center font-sans">
              <span className="text-[15px] font-bold leading-none tracking-tight text-white tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                {etaMinutes}
              </span>
              <span className="mt-1 text-[7px] font-semibold uppercase tracking-[0.16em] text-emerald-200/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                min
              </span>
            </span>
          ) : (
            <span
              className={`relative z-[12] block max-w-[5rem] px-1 py-0.5 text-center font-sans font-bold leading-snug tracking-tight line-clamp-2 sm:max-w-[5.5rem] ${
                showMiniMap
                  ? 'pointer-events-none rounded-md bg-slate-950/60 px-1.5 py-1 text-[10px] uppercase tracking-[0.07em] text-emerald-50 shadow-[0_2px_12px_rgba(0,0,0,0.5)]'
                  : 'pointer-events-none text-[11px] text-emerald-50 sm:text-[12px]'
              }`}
            >
              {centerText}
            </span>
          )}
          {liveDriver && enRoute && !showMiniMap ? (
            <span className="pointer-events-none absolute bottom-2.5 left-1/2 z-[14] h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
          ) : null}
        </div>
      </div>
    </>
  )
}
