import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerCard, customerCardMuted, customerPanelSubtitle } from '../lib/customerTheme'
import { formatOrderStatus } from '../lib/orderStatusLabels'
import {
  FULFILLMENT_PICKUP,
  fetchMyOrders,
  hideMyOrderFromHistory,
  type CustomerOrderSummary,
} from '../lib/ordersApi'
import { useAuthStore } from '../store/authStore'

export default function OrdersPage() {
  const token = useAuthStore((s) => s.token)
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)

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

  async function removeFromHistory(orderId: number, orderNumber: string) {
    if (!token) return
    const ok = window.confirm(
      `Hiq «${orderNumber}» nga «Porositë e mia»?\n\nPorosia mbetet në sistem për restorantin; thjesht nuk do të shfaqet më këtu.`,
    )
    if (!ok) return
    setRemovingId(orderId)
    setError(null)
    const r = await hideMyOrderFromHistory(token, orderId)
    setRemovingId(null)
    if (r.ok) setOrders((prev) => prev.filter((x) => x.id !== orderId))
    else setError(r.message)
  }

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
      <p className={customerPanelSubtitle}>
        Historia e porosive; telefoni ruhet në çdo porosi. Mund të heqësh një porosi nga kjo listë — ajo mbetet për
        restorantin.
      </p>

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
            <div
              className={`${customerCardMuted} flex items-stretch gap-1 transition hover:border-white/[0.14] sm:gap-2`}
            >
              <Link
                to={`/app/orders/${o.id}`}
                className="min-w-0 flex-1 rounded-xl px-3 py-3 outline-none ring-amber-400/30 focus-visible:ring-2 sm:px-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-amber-200/90">{o.orderNumber}</span>
                  <span className="text-sm font-semibold text-zinc-100">{o.total.toFixed(2)} €</span>
                </div>
                <p className="mt-1 text-sm text-zinc-300">{o.restaurantName}</p>
                {o.deliveryChatAvailable ? (
                  <p className="mt-1 text-xs text-emerald-300/90">
                    Chat me korrierin është aktiv — hap detajin e porosisë për mesazhet.
                  </p>
                ) : null}
                <p className="text-xs text-zinc-500">
                  {new Date(o.placedAtUtc).toLocaleString('sq-AL')} · {formatOrderStatus(o.status)}
                  {o.fulfillmentType === FULFILLMENT_PICKUP ? (
                    <span className="ml-1 text-sky-400/90">· Pickup</span>
                  ) : null}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => void removeFromHistory(o.id, o.orderNumber)}
                disabled={removingId === o.id}
                className="flex shrink-0 items-center justify-center rounded-xl border border-transparent px-2 text-zinc-500 transition hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-40"
                aria-label={`Hiq ${o.orderNumber} nga historia`}
                title="Hiq nga lista"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M9 3h6m-7 4h8m-1 0v11a2 2 0 01-2 2H10a2 2 0 01-2-2V7m3 0V5a2 2 0 012-2h0a2 2 0 012 2v2M10 11v6m4-6v6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
