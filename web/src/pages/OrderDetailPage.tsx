import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { customerCard, customerCardMuted, customerPanelSubtitle } from '../lib/customerTheme'
import { formatOrderStatus } from '../lib/orderStatusLabels.ts'
import {
  FULFILLMENT_PICKUP,
  fetchMyOrder,
  type CustomerOrderDetail,
} from '../lib/ordersApi'
import { useAuthStore } from '../store/authStore'

export default function OrderDetailPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.token)
  const orderId = Number(id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null)

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
            <p className="mt-1 text-xs text-sky-300/90">
              {order.fulfillmentType === FULFILLMENT_PICKUP
                ? 'Marrje në restoran (pickup)'
                : 'Dërgesë'}
            </p>
          </div>
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
        </div>
      ) : null}
    </section>
  )
}
