import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  customerBtnPrimary,
  customerCard,
  customerField,
  customerLabelSm,
  customerPanelSubtitle,
} from '../lib/customerTheme'
import { FULFILLMENT_DELIVERY, FULFILLMENT_PICKUP, placeOrder } from '../lib/ordersApi'
import { fetchRestaurantSummary } from '../lib/restaurantsApi'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const restaurantId = useCartStore((s) => s.restaurantId)
  const restaurantName = useCartStore((s) => s.restaurantName)
  const lines = useCartStore((s) => s.lines)
  const clear = useCartStore((s) => s.clear)

  const [notes, setNotes] = useState('')
  const [fulfillmentType, setFulfillmentType] = useState<number>(FULFILLMENT_DELIVERY)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const deliveryFee = useCartStore((s) => s.deliveryFee)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const pickup = fulfillmentType === FULFILLMENT_PICKUP
  const feeNum = pickup ? 0 : deliveryFee
  const feeKnown = pickup || feeNum != null
  const total = feeKnown && lines.length > 0 ? subtotal + (pickup ? 0 : (feeNum ?? 0)) : null

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token || !restaurantId || lines.length === 0) return
    if (!user?.phone?.trim()) {
      setError('Shto numrin e telefonit te «Adresat» para se të dërgosh porosinë.')
      return
    }
    setBusy(true)
    const r = await placeOrder(token, {
      restaurantId,
      lines: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      customerNotes: notes.trim() || undefined,
      fulfillmentType,
    })
    setBusy(false)
    if (r.ok) {
      clear()
      navigate(`/app/orders/${r.orderId}`, { replace: true })
    } else setError(r.message)
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
      <h1 className="text-2xl font-bold text-zinc-100">Pagesa & porosia</h1>
      <p className={customerPanelSubtitle}>
        Konfirmo porosinë. Telefoni nga profili yt kopjohet në porosi që restoranti të mund të të
        kontaktojë. Për marrje në restoran nuk ka tarifë dërgese — adresa nga profili përdoret vetëm si
        referencë kontakti derisa shtojmë fusha të posaçme.
      </p>

      {lines.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">
          Shporta është bosh.{' '}
          <Link to="/app/restaurants" className="text-amber-400">
            Kthehu te restorantet
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 max-w-lg space-y-5">
          <fieldset className="space-y-2">
            <legend className={customerLabelSm}>Si e merrni porosinë?</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillmentType === FULFILLMENT_DELIVERY}
                onChange={() => setFulfillmentType(FULFILLMENT_DELIVERY)}
              />
              Dërgesë në adresën e ruajtur
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillmentType === FULFILLMENT_PICKUP}
                onChange={() => setFulfillmentType(FULFILLMENT_PICKUP)}
              />
              Marrje në restoran (pickup)
            </label>
          </fieldset>
          <div className="rounded-xl border border-white/[0.08] bg-[#1f2433]/50 px-4 py-3 text-sm text-zinc-300">
            <p>
              <span className="text-zinc-500">Restoranti:</span> {restaurantName}
            </p>
            <p className="mt-1">
              <span className="text-zinc-500">Nëntotali:</span> {subtotal.toFixed(2)} €
            </p>
            <p className="mt-1">
              <span className="text-zinc-500">Tarifa e dërgesës:</span>{' '}
              {pickup ? (
                <span className="font-medium text-emerald-300/90">0,00 € (pickup)</span>
              ) : feeKnown ? (
                <span className="font-medium text-amber-200/90">{(feeNum ?? 0).toFixed(2)} €</span>
              ) : (
                <span className="text-zinc-500">Duke ngarkuar…</span>
              )}
            </p>
            <p className="mt-1">
              <span className="text-zinc-500">Gjithsej:</span>{' '}
              {total != null ? (
                <span className="font-semibold text-amber-300">{total.toFixed(2)} €</span>
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </p>
          </div>
          <div>
            <label htmlFor="co-notes" className={customerLabelSm}>
              Shënim për restorantin (opsional)
            </label>
            <textarea
              id="co-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${customerField} min-h-[88px]`}
              rows={3}
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={customerBtnPrimary}>
              {busy ? 'Duke dërguar…' : 'Konfirmo porosinë'}
            </button>
            <Link
              to="/app/cart"
              className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300"
            >
              Kthehu te shporta
            </Link>
          </div>
        </form>
      )}
    </section>
  )
}
