import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { OrderDeliveryTracking } from '../components/OrderDeliveryTracking'
import { customerCard, customerCardMuted, customerPanelSubtitle } from '../lib/customerTheme'
import { estimateDriveEtaMinutes } from '../lib/geoEta'
import {
  formatOrderStatus,
  isCourierEnRouteToCustomer,
  isTerminalOrderStatus,
} from '../lib/orderStatusLabels'
import { createOrdersHubConnection } from '../lib/orderHub'
import {
  clearStripeCheckoutOrderSession,
  FULFILLMENT_PICKUP,
  fetchMyOrder,
  hideMyOrderFromHistory,
  readStripeCheckoutOrderSession,
  type CustomerOrderDetail,
} from '../lib/ordersApi'
import { OrderDeliveryChatPanel } from '../components/OrderDeliveryChatPanel'
import { normalizeDeliveryChatMessage } from '../lib/deliveryChatApi'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const clearCart = useCartStore((s) => s.clear)
  const orderId = Number(id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null)
  const [liveDriver, setLiveDriver] = useState<{ lat: number; lng: number } | null>(null)
  const [hideBusy, setHideBusy] = useState(false)
  const [deliveryChatRefreshSignal, setDeliveryChatRefreshSignal] = useState(0)
  const orderRef = useRef<CustomerOrderDetail | null>(null)
  orderRef.current = order

  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchMyOrder(token, orderId)
      .then((o) => {
        if (!cancelled) setOrder(o)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Gabim.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, orderId])

  useEffect(() => {
    if (!order || !Number.isFinite(orderId)) return
    const sessionOid = readStripeCheckoutOrderSession()
    if (sessionOid !== orderId) return
    if (order.pendingStripePayment) return
    clearCart()
    clearStripeCheckoutOrderSession()
  }, [order, orderId, clearCart])

  useEffect(() => {
    setLiveDriver(null)
  }, [orderId])

  useEffect(() => {
    if (order && isTerminalOrderStatus(order.status)) setLiveDriver(null)
  }, [order?.status])

  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) return
    const conn = createOrdersHubConnection(token)
    conn.on('orderStatus', (payload: { orderId: number; status?: number }) => {
      if (payload.orderId !== orderId) return
      if (typeof payload.status === 'number') {
        setOrder((prev) => (prev ? { ...prev, status: payload.status as number } : prev))
      }
      void fetchMyOrder(token, orderId)
        .then((o) => {
          if (o) setOrder(o)
        })
        .catch(() => {})
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
    conn.on('deliveryChatMessage', (raw: unknown) => {
      const m = normalizeDeliveryChatMessage(raw)
      if (!m || m.orderId !== orderId) return
      setDeliveryChatRefreshSignal((s) => s + 1)
    })
    let stopped = false
    ;(async () => {
      try {
        await conn.start()
        if (!stopped) await conn.invoke('JoinOrder', orderId)
      } catch {
        /* SignalR — heshtur në dev pa API */
      }
    })()
    return () => {
      stopped = true
      void conn.stop()
    }
  }, [token, orderId])

  const driverForMap = useMemo(() => {
    if (!order || isTerminalOrderStatus(order.status)) return null
    return (
      liveDriver ??
      (order.driverLatitude != null && order.driverLongitude != null
        ? { lat: order.driverLatitude, lng: order.driverLongitude }
        : null)
    )
  }, [liveDriver, order, order?.status, order?.driverLatitude, order?.driverLongitude])

  /** Vlerësim minutash (distancë ajrore / shpejtësi mesatare — jo trafik Google). */
  const courierEtaMinutes = useMemo(() => {
    if (!order || order.fulfillmentType === FULFILLMENT_PICKUP) return null
    if (!isCourierEnRouteToCustomer(order)) return null
    const d = driverForMap
    if (
      !d ||
      order.customerLatitude == null ||
      order.customerLongitude == null
    )
      return null
    return estimateDriveEtaMinutes(
      d,
      { lat: order.customerLatitude, lng: order.customerLongitude },
      24,
    )
  }, [order, driverForMap])

  if (!token) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  return (
    <section className={customerCard}>
      <Link
        to="/app/orders"
        className="mb-4 inline-block text-sm text-amber-400/90 hover:text-amber-300"
      >
        ← Porositë
      </Link>
      <h1 className="text-2xl font-bold text-zinc-100">Porosia #{id}</h1>
      <p className={customerPanelSubtitle}>Detaje dhe kontakti që u dërgua te restoranti.</p>

      {loading ? <p className="mt-6 text-sm text-zinc-500">Duke ngarkuar…</p> : null}
      {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
      {!loading && !order ? (
        <p className="mt-6 text-sm text-zinc-500">Porosia nuk u gjet.</p>
      ) : null}

      {order ? (
        <div className="mt-6 space-y-4">
          <div className={customerCardMuted}>
            <p className="font-mono text-sm text-amber-200/90">{order.orderNumber}</p>
            <p className="text-sm text-zinc-300">{order.restaurantName}</p>
            <p className="text-xs text-zinc-500">
              {new Date(order.placedAtUtc).toLocaleString('sq-AL')}
            </p>
            <p className="mt-2 text-sm font-medium text-amber-200/90">
              Statusi: {formatOrderStatus(order.status)}
            </p>
            {order.pendingStripePayment === true ? (
              <Link
                to={`/app/orders/${order.id}/pay`}
                className="mt-3 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Përfundo pagesën me kartë
              </Link>
            ) : null}
            <p className="mt-1 text-xs text-sky-300/90">
              {order.fulfillmentType === FULFILLMENT_PICKUP
                ? 'Marrje në restoran (pickup)'
                : 'Dërgesë'}
            </p>
          </div>
          <OrderDeliveryTracking
            order={order}
            driverForMap={driverForMap}
            liveDriver={liveDriver != null}
            courierEtaMinutes={courierEtaMinutes}
          />
          <div className={customerCardMuted}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {order.fulfillmentType === FULFILLMENT_PICKUP
                ? 'Kontakt & lokacioni i marrjes'
                : 'Kontakt & dërgesë (snapshot)'}
            </p>
            <p className="mt-2 text-sm text-zinc-200">
              <span className="text-zinc-500">Telefon: </span>
              {order.contactPhone || '—'}
            </p>
            <p className="text-sm text-zinc-200">
              <span className="text-zinc-500">
                {order.fulfillmentType === FULFILLMENT_PICKUP ? 'Merrni te: ' : 'Adresa: '}
              </span>
              {order.addressLine1}, {order.city}
              {order.postalCode ? ` · ${order.postalCode}` : ''}
            </p>
            {order.customerNotes ? (
              <p className="mt-2 text-sm text-zinc-400">Shënim: {order.customerNotes}</p>
            ) : null}
          </div>
          {order.deliveryChatAvailable === true && order.fulfillmentType !== FULFILLMENT_PICKUP ? (
            <div className={customerCardMuted}>
              <OrderDeliveryChatPanel
                token={token}
                orderId={order.id}
                allowPost={!isTerminalOrderStatus(order.status)}
                useOwnHubConnection={false}
                refreshSignal={deliveryChatRefreshSignal}
              />
            </div>
          ) : null}
          <ul className="space-y-2">
            {order.items.map((i, idx) => (
              <li
                key={idx}
                className="flex justify-between border-b border-white/[0.06] py-2 text-sm text-zinc-300"
              >
                <span>
                  {i.quantity}× {i.name}
                </span>
                <span>{i.lineTotal.toFixed(2)} €</span>
              </li>
            ))}
          </ul>
          <div className="text-right text-sm text-zinc-400">
            <p>Nëntotali: {order.subtotal.toFixed(2)} €</p>
            <p>
              {order.fulfillmentType === FULFILLMENT_PICKUP ? 'Pickup' : 'Dërgesa'}:{' '}
              {order.deliveryFee.toFixed(2)} €
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-100">
              Totali: {order.total.toFixed(2)} €
            </p>
          </div>
          <button
            type="button"
            disabled={hideBusy}
            onClick={() => {
              if (!token) return
              const ok = window.confirm(
                `Hiq «${order.orderNumber}» nga «Porositë e mia»?\n\nPorosia mbetet për restorantin; thjesht nuk do të shfaqet më në listën tënde.`,
              )
              if (!ok) return
              setHideBusy(true)
              void hideMyOrderFromHistory(token, order.id).then((r) => {
                setHideBusy(false)
                if (r.ok) navigate('/app/orders', { replace: true })
                else setError(r.message)
              })
            }}
            className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-200/90 transition hover:border-red-400/40 hover:bg-red-500/10 disabled:opacity-40"
          >
            {hideBusy ? 'Duke hequr…' : 'Hiq nga «Porositë e mia»'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
