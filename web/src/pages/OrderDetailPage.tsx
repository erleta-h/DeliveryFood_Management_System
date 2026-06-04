import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { OrderPaymentResultBanner } from '../components/OrderPaymentResultBanner'
import { OrderDeliveryChatPanel } from '../components/OrderDeliveryChatPanel'
import { OrderTrackingMapLeaflet } from '../components/OrderTrackingMapLeaflet'
import { normalizeDeliveryChatMessage } from '../lib/deliveryChatApi'
import { estimateDriveEtaMinutes } from '../lib/geoEta'
import {
  ORDER_STATUS_CONFIRMED,
  ORDER_STATUS_PREPARING,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_CANCELLED,
  isCourierEnRouteToCustomer,
  isTerminalOrderStatus,
} from '../lib/orderStatusLabels'
import { createOrdersHubConnection, startOrdersHub } from '../lib/orderHub'
import {
  clearStripeCheckoutOrderSession,
  FULFILLMENT_PICKUP,
  fetchMyOrder,
  hideMyOrderFromHistory,
  readStripeCheckoutOrderSession,
  type CustomerOrderDetail,
} from '../lib/ordersApi'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

/* ─── step config ─── */

type StepDef = { label: string; icon: React.ReactNode }

const ico = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

const DELIVERY_STEPS: StepDef[] = [
  { label: 'Pranoi', icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> },
  { label: 'Përgatitet', icon: ico('M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M16.24 16.24l2.83 2.83M18 12h4M16.24 7.76l2.83-2.83') },
  { label: 'Gati', icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
  { label: 'Merr porosinë', icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { label: 'Në rrugë', icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M9.5 18h6M7 15.5l3-6h4l2 3h4"/><rect x="13" y="6" width="4" height="3.5" rx="1"/><path d="M15 6V4"/></svg> },
  { label: 'Dorëzuar', icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
]

const checkIcon = <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

function deliveryActiveStep(order: CustomerOrderDetail): number {
  if (order.status === ORDER_STATUS_CANCELLED) return -1
  if (order.status === ORDER_STATUS_DELIVERED) return 6
  if (isCourierEnRouteToCustomer(order)) return 4
  const leg = order.deliveryLegStatus
  if (leg === 2) return 3
  if (leg === 1) return 2
  const m: Record<number, number> = { 0: 0, 1: 1, 2: 1, 5: 2, 3: 4, 4: 5 }
  return m[order.status] ?? 0
}

/* ─── phase helpers ─── */

type Phase = 'pending' | 'preparing' | 'driverAssigned' | 'driverPickedUp' | 'driverNear' | 'delivered' | 'cancelled'

function orderPhase(order: CustomerOrderDetail): Phase {
  if (order.status === ORDER_STATUS_CANCELLED) return 'cancelled'
  if (order.status === ORDER_STATUS_DELIVERED) return 'delivered'
  const leg = order.deliveryLegStatus
  if (leg === 3) return 'driverNear'
  if (leg === 2) return 'driverPickedUp'
  if (leg === 1 || order.deliveryChatAvailable) return 'driverAssigned'
  if (order.status === 0) return 'pending'
  return 'preparing'
}

function phaseBadge(phase: Phase) {
  switch (phase) {
    case 'pending': return { text: 'NË PRITJE', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' }
    case 'preparing': return { text: 'PËRGATITJE', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
    case 'driverAssigned': return { text: 'DRIVERI ËSHTË NË RRUGË', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    case 'driverPickedUp': return { text: 'E MORI POROSINË', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' }
    case 'driverNear': return { text: 'AFËR JUSH', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    case 'delivered': return { text: 'POROSIA U DORËZUA', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    case 'cancelled': return { text: 'ANULUAR', color: 'bg-red-500/20 text-red-300 border-red-500/30' }
  }
}

function phaseTitle(phase: Phase) {
  switch (phase) {
    case 'pending': return 'Porosia juaj u dërgua'
    case 'preparing': return 'Porosia po përgatitet'
    case 'driverAssigned': return 'Driveri është në rrugë'
    case 'driverPickedUp': return 'Korrieri e mori porosinë'
    case 'driverNear': return 'Korrieri është afër jush'
    case 'delivered': return 'Faleminderit!'
    case 'cancelled': return 'Porosia u anulua'
  }
}

function phaseDesc(phase: Phase) {
  switch (phase) {
    case 'pending': return 'Duke pritur konfirmimin nga restoranti.'
    case 'preparing': return 'Restoranti është duke përgatitur porosinë tuaj.'
    case 'driverAssigned': return 'Korrieri është duke u nisur për ta marrë porosinë tuaj.'
    case 'driverPickedUp': return 'Korrieri e ka marrë porosinë dhe është në rrugë.'
    case 'driverNear': return 'Korrieri është shumë afër adresës suaj.'
    case 'delivered': return 'Porosia juaj është dorëzuar me sukses.'
    case 'cancelled': return 'Kjo porosi është anuluar.'
  }
}

function ringPct(phase: Phase) {
  switch (phase) {
    case 'pending': return 10
    case 'preparing': return 25
    case 'driverAssigned': return 45
    case 'driverPickedUp': return 65
    case 'driverNear': return 85
    case 'delivered': return 100
    case 'cancelled': return 0
  }
}

function estimatedArrivalTime(etaMin: number | null): string | null {
  if (etaMin == null) return null
  const d = new Date(Date.now() + etaMin * 60_000)
  return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
}

/* ═══════════════════════════════════════ Component ═══════════════════════════════════════ */

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const token = useAuthStore((s) => s.token)
  const clearCart = useCartStore((s) => s.clear)
  const orderId = Number(id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null)
  const [liveDriver, setLiveDriver] = useState<{ lat: number; lng: number } | null>(null)
  const [hideBusy, setHideBusy] = useState(false)
  const [chatRefresh, setChatRefresh] = useState(0)
  const [unreadChat, setUnreadChat] = useState(0)
  const [payDismissed, setPayDismissed] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const orderRef = useRef<CustomerOrderDetail | null>(null)
  orderRef.current = order

  const payQ = searchParams.get('payment')
  const payConfirming = !payDismissed && payQ === 'success' && order?.pendingStripePayment === true
  const paySuccess = !payDismissed && payQ === 'success' && order != null && order.pendingStripePayment !== true
  const payFailed = !payDismissed && payQ === 'failed'
  const payPending = !payDismissed && order?.pendingStripePayment === true && payQ !== 'success'

  function dismissPay() {
    setPayDismissed(true)
    if (payQ) { const n = new URLSearchParams(searchParams); n.delete('payment'); setSearchParams(n, { replace: true }) }
  }

  /* data */
  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) { setLoading(false); return }
    let c = false; setLoading(true)
    fetchMyOrder(token, orderId).then((o) => { if (!c) setOrder(o) }).catch((e: unknown) => { if (!c) setError(e instanceof Error ? e.message : 'Gabim.') }).finally(() => { if (!c) setLoading(false) })
    return () => { c = true }
  }, [token, orderId])

  useEffect(() => {
    if (payQ !== 'success' || !token || !Number.isFinite(orderId)) return
    let c = false; let a = 0
    const p = window.setInterval(() => { a++; if (c || a > 15) { window.clearInterval(p); return }; void fetchMyOrder(token, orderId).then((o) => { if (!c && o) setOrder(o); if (o && !o.pendingStripePayment) window.clearInterval(p) }) }, 2000)
    return () => { c = true; window.clearInterval(p) }
  }, [payQ, token, orderId])

  useEffect(() => {
    if (!order || !Number.isFinite(orderId)) return
    if (readStripeCheckoutOrderSession() !== orderId || order.pendingStripePayment) return
    clearCart(); clearStripeCheckoutOrderSession()
  }, [order, orderId, clearCart])

  useEffect(() => { setLiveDriver(null) }, [orderId])
  useEffect(() => { if (order && isTerminalOrderStatus(order.status)) setLiveDriver(null) }, [order?.status])

  /* SignalR */
  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) return
    const conn = createOrdersHubConnection(token)
    conn.on('orderStatus', (p: { orderId: number; status?: number }) => {
      if (p.orderId !== orderId) return
      if (typeof p.status === 'number') setOrder((prev) => prev ? { ...prev, status: p.status as number } : prev)
      void fetchMyOrder(token, orderId).then((o) => { if (o) setOrder(o) }).catch(() => {})
    })
    conn.on('driverLocation', (p: { orderId: number; latitude: number; longitude: number }) => {
      if (p.orderId !== orderId) return
      const st = orderRef.current?.status; if (st !== undefined && isTerminalOrderStatus(st)) return
      setLiveDriver({ lat: p.latitude, lng: p.longitude })
    })
    conn.on('deliveryChatMessage', (raw: unknown) => {
      const m = normalizeDeliveryChatMessage(raw); if (!m || m.orderId !== orderId) return
      setChatRefresh((s) => s + 1)
      if (m.senderRole === 'driver') setUnreadChat((n) => n + 1)
    })
    let stopped = false
    ;(async () => {
      try {
        await startOrdersHub(conn, [{ kind: 'order', orderId }])
      } catch (err) {
        console.warn('[OrderDetail] SignalR nuk u lidh.', err)
      }
    })()
    return () => {
      stopped = true
      void conn.stop()
    }
  }, [token, orderId])

  /* computed */
  const driverForMap = useMemo(() => {
    if (!order || isTerminalOrderStatus(order.status)) return null
    return liveDriver ?? (order.driverLatitude != null && order.driverLongitude != null ? { lat: order.driverLatitude, lng: order.driverLongitude } : null)
  }, [liveDriver, order])

  const etaMin = useMemo(() => {
    if (!order || order.fulfillmentType === FULFILLMENT_PICKUP || !isCourierEnRouteToCustomer(order)) return null
    const d = driverForMap; if (!d || order.customerLatitude == null || order.customerLongitude == null) return null
    return estimateDriveEtaMinutes(d, { lat: order.customerLatitude, lng: order.customerLongitude }, 24)
  }, [order, driverForMap])

  const prepEta = useMemo(() => {
    if (!order) return null
    return (order.status === ORDER_STATUS_PREPARING || order.status === ORDER_STATUS_CONFIRMED || order.status === 0) ? (order.status === 0 ? 12 : 8) : null
  }, [order])

  if (!token) return <div className="py-16 text-center text-zinc-400">Duhet të jesh i kyçur.</div>
  if (loading) return <div className="py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
  if (error) return <div className="py-12 text-center text-red-300">{error}</div>
  if (!order) return <div className="py-12 text-center text-zinc-400">Porosia nuk u gjet.</div>

  const phase = orderPhase(order)
  const badge = phaseBadge(phase)
  const activeStep = deliveryActiveStep(order)
  const driver = order.driver
  const isDelivery = order.fulfillmentType !== FULFILLMENT_PICKUP
  const circ = 2 * Math.PI * 54
  const pct = ringPct(phase)
  const PHASE_FALLBACK_ETA: Record<string, number> = { pending: 12, driverAssigned: 15, driverPickedUp: 10, driverNear: 3, preparing: 8, confirmed: 10 }
  const rawEta = ['driverNear', 'driverPickedUp', 'driverAssigned'].includes(phase) ? etaMin : prepEta
  const displayEta = rawEta ?? PHASE_FALLBACK_ETA[phase] ?? null
  const gradId = `fd-ring-${order.id}`
  const arrivalTime = estimatedArrivalTime(displayEta)

  const rPt = order.restaurantLatitude != null && order.restaurantLongitude != null
    ? { lat: order.restaurantLatitude, lng: order.restaurantLongitude, title: order.restaurantName, label: 'R', color: '#d97706' } : null
  const cPt = order.customerLatitude != null && order.customerLongitude != null
    ? { lat: order.customerLatitude, lng: order.customerLongitude, title: 'Adresa', label: 'K', color: '#38bdf8' } : null
  const dPt = driverForMap
    ? { ...driverForMap, title: liveDriver ? 'Korrieri (live)' : 'Korrieri', label: 'D', color: '#34d399' } : null
  const canMap = !!(rPt || cPt || dPt) && phase !== 'cancelled'

  const ringColor =
    phase === 'cancelled'
      ? 'red'
      : phase === 'pending'
        ? 'sky'
        : phase === 'preparing'
          ? 'amber'
          : 'emerald'

  return (
    <div className="-mx-4 -mt-6 sm:-mt-8">

      {/* ═══ Top bar ═══ */}
      <div className="px-4 py-3 sm:px-6">
        <Link to="/app/orders" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-200">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          Kthehu te porositë
        </Link>
      </div>

      {/* Payment banners */}
      <div className="px-4 sm:px-6">
        {payConfirming && <OrderPaymentResultBanner kind="confirming" />}
        {paySuccess && <OrderPaymentResultBanner kind="success" orderNumber={order.orderNumber} total={order.total} onDismiss={dismissPay} />}
        {payFailed && <OrderPaymentResultBanner kind="failed" onDismiss={dismissPay} />}
        {payPending && <OrderPaymentResultBanner kind="pending" payHref={`/app/orders/${order.id}/pay`} onDismiss={dismissPay} />}
      </div>

      {/* ═══ Hero: 2 columns — dark card left, map right ═══ */}
      <div className="mt-2 grid min-h-[340px] grid-cols-1 gap-0 lg:grid-cols-[480px_1fr]">

        {/* Left column — dark card */}
        <div className="relative z-10 flex flex-col justify-center rounded-r-2xl bg-[#0c1322] px-6 py-6 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
          {/* Row: ring side-by-side with text */}
          <div className="flex items-start gap-5">
            {/* Progress ring — clean, no background map */}
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120" aria-hidden>
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={phase === 'cancelled' ? 'rgba(239,68,68,0.28)' : 'rgba(255,255,255,0.06)'}
                  strokeWidth="6"
                />
                <circle cx="60" cy="60" r="54" fill="none" stroke={`url(#${gradId})`} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * circ} ${circ}`} className="transition-[stroke-dasharray] duration-700" />
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    {ringColor === 'red'
                      ? <><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#ef4444" /></>
                      : ringColor === 'sky'
                      ? <><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0ea5e9" /></>
                      : ringColor === 'amber'
                      ? <><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f59e0b" /></>
                      : <><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#22c55e" /></>}
                  </linearGradient>
                </defs>
              </svg>
              <div className="relative z-10 flex flex-col items-center">
                {phase === 'delivered' ? (
                  <svg className="h-12 w-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : phase === 'cancelled' ? (
                  <div className="h-4 w-4 rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.65)]" />
                ) : displayEta != null ? (
                  <>
                    <span className="text-3xl font-bold leading-none tracking-tight text-white tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">{Math.round(displayEta)}</span>
                    <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">min</span>
                    <span className="mt-0.5 text-[9px] text-zinc-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">Koha e vlerësuar</span>
                  </>
                ) : (
                  <div className="h-4 w-4 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
                )}
              </div>
            </div>

            {/* Badge + title + description + ETA */}
            <div className="flex-1 pt-1">
              <span className={`inline-block rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${badge.color}`}>
                {badge.text}
              </span>
              <h2 className="mt-2.5 text-xl font-bold text-white">{phaseTitle(phase)}</h2>
              <p className="mt-1 text-sm text-zinc-400">{phaseDesc(phase)}</p>
              {phase === 'cancelled' && order.cancellationReason?.trim() ? (
                <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-300/90">
                    Arsyeja e anulimit
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-red-100/95">{order.cancellationReason.trim()}</p>
                </div>
              ) : null}
              {arrivalTime && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-500">Estimated delivery time</p>
                  <p className="text-lg font-bold tabular-nums text-white">{arrivalTime}</p>
                </div>
              )}
            </div>
          </div>

          {/* Step indicators */}
          {isDelivery && (
            <div className="mt-6 w-full">
              <div className="flex items-center">
                {DELIVERY_STEPS.map((step, i) => {
                  const done = activeStep > i || phase === 'delivered'
                  const current = activeStep === i && phase !== 'delivered' && phase !== 'cancelled'
                  return (
                    <div key={step.label} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                          done ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-400' :
                          current ? 'border-emerald-400/80 bg-emerald-500/25 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.25)]' :
                          'border-zinc-700 bg-zinc-800/40 text-zinc-600'
                        }`}>
                          {done ? checkIcon : step.icon}
                        </div>
                        <span className={`whitespace-nowrap text-[10px] font-medium ${
                          done ? 'text-emerald-400/80' : current ? 'text-emerald-300' : 'text-zinc-600'
                        }`}>{step.label}</span>
                      </div>
                      {i < DELIVERY_STEPS.length - 1 && (
                        <div className={`mx-1 mb-5 h-[2px] flex-1 rounded-full transition-colors ${
                          activeStep > i + 1 || phase === 'delivered' ? 'bg-emerald-500/50' :
                          activeStep > i ? 'bg-emerald-500/30' :
                          'bg-zinc-700/50'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: large map with fade on left edge */}
        {canMap ? (
          <div className="relative min-h-[280px] lg:-ml-6 lg:min-h-0">
            <OrderTrackingMapLeaflet
              restaurant={rPt} customer={cPt} driver={dPt} followDriver={!!dPt}
              driverEtaMinutes={isCourierEnRouteToCustomer(order) ? etaMin : null}
              className="h-full min-h-[280px] w-full"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0c1322] to-transparent lg:block hidden" />
          </div>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center bg-[#0d1117] text-zinc-600">
            <p className="text-sm">Harta shfaqet kur ka koordinata GPS</p>
          </div>
        )}
      </div>

      {/* ═══ Info cards ═══ */}
      <div className="grid grid-cols-1 gap-px border-t border-white/[0.06] bg-white/[0.03] sm:grid-cols-2">

        {/* Restoranti */}
        <div className="border-r border-white/[0.04] bg-[#0f1419] p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Restoranti</p>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-sm font-bold text-amber-400">
              {order.restaurantName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{order.restaurantName}</p>
              <p className="text-xs text-zinc-500">Porosia #{order.orderNumber}</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowDetails(!showDetails)}
            className="mt-3 w-full rounded-lg border border-white/[0.06] bg-[#1a2332] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-white/10 hover:text-zinc-200">
            Detajet e porosisë
          </button>
        </div>

        {/* Porosia juaj */}
        <div className="bg-[#0f1419] p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Porosia juaj</p>
          <ul className="space-y-1">
            {order.items.map((item, i) => (
              <li key={i} className="truncate text-sm text-zinc-300">{item.quantity}× {item.name}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-zinc-600">{order.items.length} artikull</p>
          <button type="button" onClick={() => setShowDetails(!showDetails)}
            className="mt-3 w-full rounded-lg border border-white/[0.06] bg-[#1a2332] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-white/10 hover:text-zinc-200">
            Detajet e porosisë
          </button>
        </div>
      </div>

      {/* ═══ Order details (expandable) ═══ */}
      {showDetails && (
        <div className="border-t border-white/[0.06] bg-[#0f1419] p-5">
          <div className="mx-auto max-w-lg space-y-3">
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Nr. porosisë</span><span className="font-mono text-zinc-200">{order.orderNumber}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Restoranti</span><span className="text-zinc-200">{order.restaurantName}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Data</span><span className="text-zinc-200">{new Date(order.placedAtUtc).toLocaleString('sq-AL')}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Adresa</span><span className="text-right text-zinc-200">{order.addressLine1}, {order.city}</span></div>
            <hr className="border-white/[0.06]" />
            <ul className="space-y-1.5">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{item.quantity}× {item.name}</span>
                  <span className="text-zinc-400">{item.lineTotal.toFixed(2)} €</span>
                </li>
              ))}
            </ul>
            <hr className="border-white/[0.06]" />
            <div className="space-y-1 text-right">
              <p className="text-sm text-zinc-500">Nëntotali: {order.subtotal.toFixed(2)} €</p>
              <p className="text-sm text-zinc-500">Tarifa e dorëzimit: {order.deliveryFee.toFixed(2)} €</p>
              <p className="text-base font-bold text-white">Totali: {order.total.toFixed(2)} €</p>
            </div>
            {order.pendingStripePayment && !payPending && (
              <Link to={`/app/orders/${order.id}/pay`}
                className="mt-2 inline-flex w-full justify-center rounded-xl bg-[#FF7A18] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#FF8F3A]">
                Përfundo pagesën me kartë
              </Link>
            )}
            <button type="button" disabled={hideBusy}
              onClick={() => { if (!token) return; if (!window.confirm(`Hiq «${order.orderNumber}» nga «Porositë e mia»?`)) return; setHideBusy(true); void hideMyOrderFromHistory(token, order.id).then((r) => { setHideBusy(false); if (r.ok) navigate('/app/orders', { replace: true }); else setError(r.message) }) }}
              className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-300/80 transition hover:border-red-400/30 hover:bg-red-500/10 disabled:opacity-40">
              {hideBusy ? 'Duke hequr…' : 'Hiq nga «Porositë e mia»'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Chat me driverin — bottom ═══ */}
      {driver && (
        <div className="border-t border-white/[0.06] bg-[#0f1419] px-4 py-4 sm:px-6">
          <button type="button" onClick={() => { setShowChat(!showChat); setUnreadChat(0) }}
            className="relative mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-[#1a2332] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-sky-500/20 hover:text-sky-300">
            💬 Chat me driverin
            {unreadChat > 0 && !showChat && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white shadow-lg">
                {unreadChat}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ═══ Chat panel ═══ */}
      {showChat && token && (
        <div className="border-t border-white/[0.06] bg-[#0f1419] p-5">
          <OrderDeliveryChatPanel
            token={token}
            orderId={order.id}
            allowPost={!isTerminalOrderStatus(order.status)}
            useOwnHubConnection={false}
            refreshSignal={chatRefresh}
          />
        </div>
      )}

      {/* ═══ Bottom security bar ═══ */}
      <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#0b0f14] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15">
            <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-300">Porosia juaj është e sigurt</p>
            <p className="text-[10px] text-zinc-600">Ne monitorojmë çdo hap të porosisë në kohë reale.</p>
          </div>
        </div>
        <Link to={`/app/support?orderId=${orderId}`} className="text-xs font-medium text-amber-400/80 no-underline transition hover:text-amber-300">
          Raporto problem
        </Link>
      </div>
    </div>
  )
}
