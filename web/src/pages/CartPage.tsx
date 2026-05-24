import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartLineRow, CartSecurityBadge } from '../components/CartLineRow'
import { CartRestaurantInfoBar } from '../components/CartRestaurantInfoBar'
import { rdYellow } from '../lib/restaurantDetailTheme'
import { fetchRestaurantSummary, type RestaurantSummary } from '../lib/restaurantsApi'
import { useCartStore } from '../store/cartStore'

const panelCard =
  'rounded-2xl border border-white/[0.08] bg-[#1c2030]/90 p-6 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-7'

/** Buton portokalli si mockup-i */
const btnCheckoutFull =
  'flex w-full items-center justify-center rounded-xl bg-[#FF7A18] py-3.5 text-sm font-bold text-white shadow-[0_4px_24px_rgba(255,122,24,0.4)] transition hover:bg-[#FF8F3A]'

function cartItemCountLabel(lines: { quantity: number }[]): string {
  const n = lines.reduce((s, l) => s + l.quantity, 0)
  if (n === 1) return '1 artikull'
  return `${n} artikuj`
}

export default function CartPage() {
  const restaurantId = useCartStore((s) => s.restaurantId)
  const restaurantName = useCartStore((s) => s.restaurantName)
  const deliveryFee = useCartStore((s) => s.deliveryFee)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)
  const lines = useCartStore((s) => s.lines)
  const setQty = useCartStore((s) => s.setQty)
  const removeLine = useCartStore((s) => s.removeLine)

  const [summary, setSummary] = useState<RestaurantSummary | null>(null)

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const feeNum = deliveryFee
  const feeKnown = feeNum != null
  const total = feeKnown && lines.length > 0 ? subtotal + feeNum : null

  useEffect(() => {
    if (!restaurantId || lines.length === 0) {
      setSummary(null)
      return
    }
    const ac = new AbortController()
    fetchRestaurantSummary(restaurantId, ac.signal)
      .then((s) => {
        if (!s || useCartStore.getState().restaurantId !== restaurantId) return
        setSummary(s)
        if (useCartStore.getState().deliveryFee == null) setDeliveryFee(s.deliveryFee)
      })
      .catch(() => setSummary(null))
    return () => ac.abort()
  }, [restaurantId, lines.length, setDeliveryFee])

  if (lines.length === 0) {
    return (
      <div className={panelCard}>
        <h1 className="text-2xl font-bold text-white">Shporta juaj</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Shporta është bosh — zgjidh restorant dhe artikuj.
        </p>
        <Link
          to="/app/restaurants"
          className={`${btnCheckoutFull} mt-6 max-w-xs`}
        >
          Shfletoni restorantet
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* Majtas */}
        <div className={`${panelCard} flex min-h-[280px] flex-col`}>
          <h1 className="text-2xl font-bold text-white">Shporta juaj</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {cartItemCountLabel(lines)} nga{' '}
            <span className="font-medium text-zinc-400">{restaurantName}</span>
          </p>

          <ul className="mt-5 flex-1">
            {lines.map((l) => (
              <CartLineRow
                key={l.menuItemId}
                line={l}
                onQty={(q) => setQty(l.menuItemId, q)}
                onRemove={() => removeLine(l.menuItemId)}
              />
            ))}
          </ul>

          {restaurantId ? (
            <Link
              to={`/app/restaurants/${restaurantId}`}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition hover:underline"
              style={{ color: rdYellow }}
            >
              <span aria-hidden>←</span> Vazhdo porosinë
            </Link>
          ) : null}
        </div>

        {/* Djathtas */}
        <aside className={`${panelCard} lg:sticky lg:top-6`}>
          <h2 className="text-lg font-bold text-white">Përmbledhje</h2>

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4 text-zinc-400">
              <dt>Nëntotali</dt>
              <dd className="font-medium tabular-nums text-zinc-300">{subtotal.toFixed(2)} €</dd>
            </div>
            <div className="flex justify-between gap-4 text-zinc-400">
              <dt>Tarifa e dërgesës</dt>
              <dd className="font-medium tabular-nums text-zinc-300">
                {feeKnown ? `${feeNum.toFixed(2)} €` : '…'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.08] pt-4">
            <span className="text-sm font-semibold text-zinc-300">Gjithsej</span>
            {total != null ? (
              <span className="text-2xl font-bold tabular-nums" style={{ color: rdYellow }}>
                {total.toFixed(2)} €
              </span>
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </div>

          <Link to="/app/checkout" className={`${btnCheckoutFull} mt-5`}>
            Te pagesa
          </Link>

          <CartSecurityBadge className="mt-4" />
        </aside>
      </div>

      <CartRestaurantInfoBar
        summary={summary}
        restaurantName={restaurantName}
        deliveryFee={feeNum}
      />
    </div>
  )
}
