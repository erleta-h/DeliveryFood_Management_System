import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CartSummaryPanel } from '../components/CartSummaryPanel'
import {
  customerBtnPrimary,
  customerCard,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { apiPath } from '../lib/apiBase'
import { fetchRestaurantMenu } from '../lib/restaurantMenuApi'
import { fetchRestaurantSummary } from '../lib/restaurantsApi'
import { useCartStore } from '../store/cartStore'

type LocationState = { name?: string; deliveryFee?: number } | null

export default function RestaurantDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navState = location.state as LocationState
  const stateName = navState?.name
  const stateDeliveryFee = navState?.deliveryFee
  const restaurantId = Number(id)
  const setRestaurant = useCartStore((s) => s.setRestaurant)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)
  const addLine = useCartStore((s) => s.addLine)
  const setQty = useCartStore((s) => s.setQty)
  const lines = useCartStore((s) => s.lines)
  const cartRid = useCartStore((s) => s.restaurantId)

  const [cartPanelOpen, setCartPanelOpen] = useState(false)

  const [title, setTitle] = useState(stateName ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<
    Awaited<ReturnType<typeof fetchRestaurantMenu>>
  >([])

  useEffect(() => {
    if (stateName) setTitle(stateName)
  }, [stateName])

  useEffect(() => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      setError('ID i pavlefshëm.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRestaurantMenu(restaurantId)
      .then((cats) => {
        if (cancelled) return
        setCategories(cats)
        if (!stateName) setTitle(`Restoranti #${restaurantId}`)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Menuja nuk u ngarkua.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [restaurantId, stateName])

  useEffect(() => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) return
    const st = useCartStore.getState()
    if (st.restaurantId !== restaurantId) return
    if (stateDeliveryFee !== undefined && Number.isFinite(stateDeliveryFee))
      setDeliveryFee(stateDeliveryFee)
  }, [restaurantId, stateDeliveryFee, setDeliveryFee])

  useEffect(() => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) return
    let cancelled = false
    fetchRestaurantSummary(restaurantId)
      .then((s) => {
        if (cancelled || !s) return
        const st = useCartStore.getState()
        if (st.restaurantId === restaurantId && st.deliveryFee == null) setDeliveryFee(s.deliveryFee)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [restaurantId, setDeliveryFee])

  function ensureRestaurantContext() {
    const name = title || `Restoranti ${restaurantId}`
    const fee =
      stateDeliveryFee !== undefined && Number.isFinite(stateDeliveryFee)
        ? stateDeliveryFee
        : undefined
    setRestaurant(restaurantId, name, fee)
  }

  function qtyInCartForItem(menuItemId: number): number {
    if (cartRid !== restaurantId) return 0
    return lines.find((l) => l.menuItemId === menuItemId)?.quantity ?? 0
  }

  return (
    <section className={customerCard}>
      <Link
        to="/app/restaurants"
        className="mb-4 inline-block text-sm text-amber-400/90 hover:text-amber-300"
      >
        ← Restorantet
      </Link>
      <h1 className="text-2xl font-bold text-zinc-100">
        {title || (loading ? 'Duke ngarkuar…' : `Restoranti #${id}`)}
      </h1>
      <p className={customerPanelSubtitle}>Zgjidh artikuj dhe shto në shportë.</p>

      {cartRid !== null && cartRid !== restaurantId ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
          Shporta përmban artikuj nga një restorant tjetër. Hap{' '}
          <Link to="/app/cart" className="font-semibold underline">
            shportën
          </Link>{' '}
          për t’i pastruar ose për të përfunduar porosinë atje.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : loading ? (
        <p className="mt-6 text-sm text-zinc-500">Duke ngarkuar menujen…</p>
      ) : categories.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">Nuk ka artikuj në menu për këtë restorant.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {categories.map((cat) => (
            <div key={cat.id}>
              <h2 className="text-lg font-semibold text-zinc-200">{cat.name}</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                {cat.items.map((item) => {
                  const qty = qtyInCartForItem(item.id)
                  const img = item.imageUrl ? apiPath(item.imageUrl) : null
                  return (
                    <li
                      key={item.id}
                      className="flex overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12151c] shadow-md shadow-black/25"
                    >
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-4">
                        <p className="font-semibold leading-snug text-zinc-100">{item.name}</p>
                        {item.description ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="text-base font-semibold tabular-nums text-sky-300/95">
                          {item.price.toFixed(2)} €
                        </p>
                      </div>
                      <div className="relative h-[6.75rem] w-[6.75rem] shrink-0 sm:h-[7.25rem] sm:w-[7.25rem]">
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-700/35 to-zinc-900/90 text-2xl text-zinc-600"
                            aria-hidden
                          >
                            🍽
                          </div>
                        )}
                        {!item.isAvailable ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-center text-[11px] font-medium leading-tight text-zinc-200">
                            Jo gati
                          </span>
                        ) : qty > 0 ? (
                          <div
                            className="absolute bottom-0 left-0 right-0 flex items-stretch border-t border-white/10 bg-black/75 backdrop-blur-sm"
                            role="group"
                            aria-label={`Sasia për ${item.name}`}
                          >
                            <button
                              type="button"
                              className="flex-1 py-2 text-lg leading-none text-zinc-100 hover:bg-white/10"
                              onClick={() => setQty(item.id, qty - 1)}
                            >
                              −
                            </button>
                            <span className="flex min-w-[2rem] items-center justify-center border-x border-white/10 text-sm font-bold tabular-nums text-white">
                              {qty}
                            </span>
                            <button
                              type="button"
                              className="flex-1 py-2 text-lg leading-none text-zinc-100 hover:bg-white/10"
                              onClick={() => setQty(item.id, qty + 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Shto ${item.name}`}
                            onClick={() => {
                              ensureRestaurantContext()
                              addLine({
                                menuItemId: item.id,
                                name: item.name,
                                unitPrice: item.price,
                              })
                            }}
                            className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-xl font-bold leading-none text-white shadow-lg transition hover:bg-sky-400 active:scale-95"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setCartPanelOpen(true)}
          className={`${customerBtnPrimary} inline-block w-full text-center sm:w-auto`}
        >
          Shiko shportën
        </button>
      </div>

      <CartSummaryPanel
        open={cartPanelOpen}
        onClose={() => setCartPanelOpen(false)}
        pageRestaurantId={restaurantId}
      />
    </section>
  )
}
