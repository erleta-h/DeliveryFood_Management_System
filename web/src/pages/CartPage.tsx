import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCard,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { fetchRestaurantSummary } from '../lib/restaurantsApi'
import { useCartStore } from '../store/cartStore'

export default function CartPage() {
  const restaurantId = useCartStore((s) => s.restaurantId)
  const restaurantName = useCartStore((s) => s.restaurantName)
  const deliveryFee = useCartStore((s) => s.deliveryFee)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)
  const lines = useCartStore((s) => s.lines)
  const setQty = useCartStore((s) => s.setQty)
  const clear = useCartStore((s) => s.clear)

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const feeNum = deliveryFee
  const feeKnown = feeNum != null
  const total = feeKnown && lines.length > 0 ? subtotal + feeNum : null

  useEffect(() => {
    if (!restaurantId || lines.length === 0 || deliveryFee != null) return
    const ac = new AbortController()
    fetchRestaurantSummary(restaurantId, ac.signal)
      .then((s) => {
        if (s && useCartStore.getState().restaurantId === restaurantId)
          setDeliveryFee(s.deliveryFee)
      })
      .catch(() => {})
    return () => ac.abort()
  }, [restaurantId, lines.length, deliveryFee, setDeliveryFee])

  return (
    <section className={customerCard}>
      <h1 className="text-2xl font-bold text-zinc-100">Shporta</h1>
      <p className={customerPanelSubtitle}>
        {restaurantId
          ? `Restoranti: ${restaurantName}`
          : 'Shporta është bosh — zgjidh restorant dhe artikuj.'}
      </p>

      {lines.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">
          Nuk ka artikuj.{' '}
          <Link to="/app/restaurants" className="text-amber-400 hover:text-amber-300">
            Shfletoni restorantet
          </Link>
          .
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {lines.map((l) => (
              <li
                key={l.menuItemId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#1f2433]/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-zinc-100">{l.name}</p>
                  <p className="text-xs text-zinc-500">{l.unitPrice.toFixed(2)} € / njësi</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-2 py-1 text-sm text-zinc-300"
                    onClick={() => setQty(l.menuItemId, l.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm text-zinc-200">{l.quantity}</span>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-2 py-1 text-sm text-zinc-300"
                    onClick={() => setQty(l.menuItemId, l.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 text-right text-sm text-zinc-400">
            <p>
              Nëntotali:{' '}
              <span className="font-semibold text-zinc-100">{subtotal.toFixed(2)} €</span>
            </p>
            <p>
              Tarifa e dërgesës:{' '}
              {feeKnown ? (
                <span className="font-semibold text-amber-200/90">{feeNum.toFixed(2)} €</span>
              ) : (
                <span className="text-zinc-500">Duke ngarkuar…</span>
              )}
            </p>
            <p className="border-t border-white/[0.08] pt-2 text-base text-zinc-200">
              Gjithsej:{' '}
              {total != null ? (
                <span className="font-bold text-amber-300">{total.toFixed(2)} €</span>
              ) : (
                <span className="text-sm font-normal text-zinc-500">—</span>
              )}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/app/restaurants/${restaurantId}`} className={customerBtnGhost}>
              Vazhdo porosinë
            </Link>
            <Link to="/app/checkout" className={customerBtnPrimary}>
              Te pagesa
            </Link>
            <button type="button" onClick={() => clear()} className={customerBtnGhost}>
              Zbraz shportën
            </button>
          </div>
        </>
      )}
    </section>
  )
}
