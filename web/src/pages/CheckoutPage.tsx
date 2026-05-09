import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { customerField, customerPanelSubtitle } from '../lib/customerTheme'
import {
  FULFILLMENT_DELIVERY,
  FULFILLMENT_PICKUP,
  PAYMENT_COD,
  PAYMENT_STRIPE,
  placeOrder,
  setStripeCheckoutOrderSession,
} from '../lib/ordersApi'
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
  const deliveryFee = useCartStore((s) => s.deliveryFee)

  const [notes, setNotes] = useState('')
  const [fulfillmentType, setFulfillmentType] = useState<number>(FULFILLMENT_DELIVERY)
  const [paymentMethod, setPaymentMethod] = useState<number>(PAYMENT_COD)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const pickup = fulfillmentType === FULFILLMENT_PICKUP
  const total = subtotal + (pickup ? 0 : deliveryFee ?? 0)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token || !restaurantId || lines.length === 0) return

    if (!user?.phone?.trim()) {
      setError('Shto numrin e telefonit para se te dergosh porosine.')
      return
    }

    setBusy(true)

    const r = await placeOrder(token, {
      restaurantId,
      lines: lines.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
      })),
      customerNotes: notes.trim() || undefined,
      fulfillmentType,
      paymentMethod,
      oneTimeDeliveryAddress: null,
    })

    setBusy(false)

    if (r.ok) {
      if (r.requiresStripePayment) {
        setStripeCheckoutOrderSession(r.orderId)
        navigate(`/app/orders/${r.orderId}/pay`, { replace: true })
      } else {
        clear()
        navigate(`/app/orders/${r.orderId}`, { replace: true })
      }
    } else {
      setError(r.message)
    }
  }

  if (!token) {
    return (
      <section className="rounded-3xl border border-white/[0.1] bg-[#1a1d24]/90 p-8 text-zinc-200 shadow-xl backdrop-blur-md">
        <p className="text-zinc-400">Duhet te jesh i kycur.</p>
      </section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="rounded-3xl border border-white/[0.1] bg-[#1a1d24]/90 p-8 text-zinc-200 shadow-xl backdrop-blur-md">
        <h1 className="text-2xl font-bold text-white">Checkout</h1>
        <p className={customerPanelSubtitle}>Shporta eshte bosh.</p>
        <Link
          to="/app/restaurants"
          className="mt-6 inline-flex rounded-xl bg-[#009fe3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1aacf0]"
        >
          Shfleto restorantet
        </Link>
      </section>
    )
  }

  return (
    <div className="min-w-0 pb-12">
      <h1 className="text-3xl font-bold tracking-tight text-white">Checkout</h1>
      <p className="mt-1 text-base text-zinc-400">{restaurantName || 'Restoranti'}</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Si e merrni
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentType(FULFILLMENT_DELIVERY)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  !pickup ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                Dergese
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentType(FULFILLMENT_PICKUP)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  pickup ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                Pickup
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="co-notes" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Shenim per porosine
            </label>
            <textarea
              id="co-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${customerField} mt-2 min-h-[88px]`}
              rows={3}
              placeholder="p.sh. zile, kati, reference..."
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Pagesa
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod(PAYMENT_COD)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  paymentMethod === PAYMENT_COD
                    ? 'border-[#009fe3]/50 bg-[#009fe3]/15 text-[#7dd3fc]'
                    : 'border-white/[0.1] bg-[#14161c] text-zinc-400'
                }`}
              >
                Para ne dorezim
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod(PAYMENT_STRIPE)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  paymentMethod === PAYMENT_STRIPE
                    ? 'border-[#009fe3]/50 bg-[#009fe3]/15 text-[#7dd3fc]'
                    : 'border-white/[0.1] bg-[#14161c] text-zinc-400'
                }`}
              >
                Karte (Stripe)
              </button>
            </div>

            {paymentMethod === PAYMENT_STRIPE ? (
              <p className="mt-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100/85">
                Pas konfirmimit hapet faqja e pageses me karte (Stripe).
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <aside className="rounded-3xl border border-white/[0.1] bg-[#1c1f26] p-5">
          <h2 className="text-lg font-bold text-white">Permbledhje</h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-zinc-300">
              <span>Nentotali</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span>{pickup ? 'Pickup' : 'Dergesa'}</span>
              <span>{pickup ? '0.00 €' : `${(deliveryFee ?? 0).toFixed(2)} €`}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t border-white/[0.08] pt-4 text-base font-bold text-white">
            <span>Gjithsej</span>
            <span>{total.toFixed(2)} €</span>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-2xl bg-[#009fe3] px-4 py-3.5 text-center text-base font-semibold text-white transition hover:bg-[#1aacf0] disabled:opacity-45"
          >
            {busy
              ? 'Duke derguar...'
              : paymentMethod === PAYMENT_STRIPE
                ? 'Konfirmo dhe paguaj me karte'
                : 'Konfirmo porosine'}
          </button>
        </aside>
      </form>
    </div>
  )
}