import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerCard, customerCardMuted, customerPanelSubtitle } from '../lib/customerTheme'
import { formatOrderStatus } from '../lib/orderStatusLabels.ts'
import {
  FULFILLMENT_PICKUP,
  fetchMyOrders,
  type CustomerOrderSummary,
} from '../lib/ordersApi'
import { useAuthStore } from '../store/authStore'

export default function OrdersPage() {
  const token = useAuthStore((s) => s.token)
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    fetchMyOrders(token)
      .then((list) => {
        if (!cancelled) setOrders(list)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Nuk u ngarkuan porositë.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) {
    return (
      <section className={customerCard}>
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  return (
    <section className={customerCard}>
      <h1 className="text-2xl font-bold text-zinc-100">Porositë e mia</h1>
      <p className={customerPanelSubtitle}>Historia e porosive; telefoni ruhet në çdo porosi.</p>

      {loading ? <p className="mt-6 text-sm text-zinc-500">Duke ngarkuar…</p> : null}
      {error ? (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">
          Nuk ke porosi ende.{' '}
          <Link to="/app/restaurants" className="text-amber-400 hover:text-amber-300">
            Porosit tani
          </Link>
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to={`/app/orders/${o.id}`}
              className={`${customerCardMuted} block transition hover:border-white/[0.14]`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm text-amber-200/90">{o.orderNumber}</span>
                <span className="text-sm font-semibold text-zinc-100">{o.total.toFixed(2)} €</span>
              </div>
              <p className="mt-1 text-sm text-zinc-300">{o.restaurantName}</p>
              <p className="text-xs text-zinc-500">
                {new Date(o.placedAtUtc).toLocaleString('sq-AL')} · {formatOrderStatus(o.status)}
                {o.fulfillmentType === FULFILLMENT_PICKUP ? (
                  <span className="ml-1 text-sky-400/90">· Pickup</span>
                ) : null}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
