import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CouponInput } from '../components/checkout/CouponInput'
import { RestaurantGoogleMap } from '../components/RestaurantGoogleMap'
import { customerField, customerPanelSubtitle } from '../lib/customerTheme'
import type { AppliedCoupon } from '../lib/couponsApi'
import { fetchClientPublicConfig } from '../lib/publicConfigApi'
import {
  FULFILLMENT_DELIVERY,
  FULFILLMENT_PICKUP,
  PAYMENT_COD,
  PAYMENT_STRIPE,
  placeOrder,
  setStripeCheckoutOrderSession,
} from '../lib/ordersApi'
import { fetchRestaurantSummary, type RestaurantSummary } from '../lib/restaurantsApi'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

const woltBlue =
  'rounded-2xl bg-[#009fe3] px-4 py-3.5 text-center text-base font-semibold text-white shadow-[0_8px_32px_rgba(0,159,227,0.35)] transition hover:bg-[#1aacf0] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none'

const rowBase =
  'flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 text-left transition last:border-b-0 hover:bg-white/[0.02]'

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const restaurantId = useCartStore((s) => s.restaurantId)
  const restaurantName = useCartStore((s) => s.restaurantName)
  const lines = useCartStore((s) => s.lines)
  const clear = useCartStore((s) => s.clear)

  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<number>(PAYMENT_COD)
  const [fulfillmentType, setFulfillmentType] = useState<number>(FULFILLMENT_DELIVERY)
  const [deliveryTo, setDeliveryTo] = useState<'saved' | 'oneTime'>('saved')
  const [otLine1, setOtLine1] = useState('')
  const [otLine2, setOtLine2] = useState('')
  const [otCity, setOtCity] = useState('')
  const [otPostal, setOtPostal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  const deliveryFee = useCartStore((s) => s.deliveryFee)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)

  const [summary, setSummary] = useState<RestaurantSummary | null>(null)
  const [mapsBrowserKey, setMapsBrowserKey] = useState<string | null>(null)

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const pickup = fulfillmentType === FULFILLMENT_PICKUP
  const feeNum = pickup ? 0 : deliveryFee
  const feeKnown = pickup || feeNum != null
  const discountAmount = appliedCoupon?.discountAmount ?? 0
  const total =
    feeKnown && lines.length > 0 ? Math.max(0, subtotal - discountAmount) + (pickup ? 0 : (feeNum ?? 0)) : null

  const minOrder = summary?.minOrderAmount ?? 0
  const meetsMinOrder = minOrder <= 0 || subtotal >= minOrder

  useEffect(() => {
    setAppliedCoupon(null)
  }, [subtotal])

  useEffect(() => {
    let cancelled = false
    fetchClientPublicConfig()
      .then((cfg) => {
        if (cancelled) return
        const k = cfg.googleMapsBrowserApiKey?.trim()
        if (k) setMapsBrowserKey(k)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!restaurantId || lines.length === 0) return
    let cancelled = false
    const ac = new AbortController()
    fetchRestaurantSummary(restaurantId, ac.signal)
      .then((s) => {
        if (!s || cancelled) return
        if (useCartStore.getState().restaurantId !== restaurantId) return
        setSummary(s)
        if (useCartStore.getState().deliveryFee == null) setDeliveryFee(s.deliveryFee)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [restaurantId, lines.length, setDeliveryFee])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token || !restaurantId || lines.length === 0) return
    if (!meetsMinOrder) {
      setError(`Shuma minimale e porosisë është ${minOrder.toFixed(2)} €.`)
      return
    }
    if (!user?.phone?.trim()) {
      setError('Shto numrin e telefonit te «Adresat» para se të dërgosh porosinë.')
      return
    }
    if (!pickup && deliveryTo === 'oneTime') {
      const l1 = otLine1.trim()
      const c = otCity.trim()
      if (l1.length < 3) {
        setError('Shkruaj adresën e plotë (rruga / lokacioni), të paktën 3 karaktere.')
        return
      }
      if (c.length < 2) {
        setError('Shkruaj qytetin.')
        return
      }
    }
    setBusy(true)
    const r = await placeOrder(token, {
      restaurantId,
      lines: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      customerNotes: notes.trim() || undefined,
      fulfillmentType,
      paymentMethod,
      oneTimeDeliveryAddress:
        !pickup && deliveryTo === 'oneTime'
          ? {
              line1: otLine1.trim(),
              city: otCity.trim(),
              postalCode: otPostal.trim() || undefined,
              line2: otLine2.trim() || undefined,
            }
          : null,
      couponCode: appliedCoupon?.code,
    })
    setBusy(false)
    if (r.ok) {
      const needsStripe = r.requiresStripePayment || paymentMethod === PAYMENT_STRIPE
      if (needsStripe) {
        setStripeCheckoutOrderSession(r.orderId)
        navigate(`/app/orders/${r.orderId}/pay`, { replace: true })
      } else {
        clear()
        navigate(`/app/orders/${r.orderId}`, { replace: true })
      }
    } else setError(r.message)
  }

  const savedAddressLabel =
    user?.line1?.trim() ?
      `${user.line1.trim()}${user.city ? `, ${user.city}` : ''}`
    : user?.city?.trim() ? user.city.trim()
    : 'Shto adresën te «Adresat»'

  const mapLat = summary?.latitude
  const mapLng = summary?.longitude
  const showMap =
    mapsBrowserKey &&
    mapLat != null &&
    mapLng != null &&
    Number.isFinite(mapLat) &&
    Number.isFinite(mapLng)

  if (!token) {
    return (
      <section className="rounded-3xl border border-white/[0.1] bg-[#1a1d24]/90 p-8 text-zinc-200 shadow-xl backdrop-blur-md">
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="rounded-3xl border border-white/[0.1] bg-[#1a1d24]/90 p-8 text-zinc-200 shadow-xl backdrop-blur-md">
        <h1 className="text-2xl font-bold text-white">Checkout</h1>
        <p className={customerPanelSubtitle}>Shporta është bosh.</p>
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
      {/* Hero: hartë / gradient si Wolt */}
      <div className="relative -mx-4 mb-8 min-h-[200px] overflow-hidden sm:mx-0 sm:rounded-3xl sm:border sm:border-white/[0.08]">
        {showMap ? (
          <RestaurantGoogleMap
            apiKey={mapsBrowserKey!}
            lat={mapLat!}
            lng={mapLng!}
            className="h-[220px] w-full sm:h-[260px]"
          />
        ) : (
          <div className="h-[220px] w-full bg-gradient-to-br from-zinc-800 via-[#1a1f2e] to-black sm:h-[260px]" />
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/75 to-transparent sm:from-[#12141a]/95"
          aria-hidden
        />
        <Link
          to="/app/cart"
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-black/55 sm:left-4 sm:top-4"
        >
          <span aria-hidden>←</span> Kthehu
        </Link>
        {summary ? (
          <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-2xl border border-white/20 bg-black/55 px-3 py-2 text-center shadow-lg backdrop-blur-md sm:right-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">
              ~{summary.estimatedDeliveryMinutes} min
            </p>
            <p className="text-[9px] text-zinc-400">vlerësim</p>
          </div>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5 pt-8 sm:px-6 sm:pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Checkout</h1>
          <p className="mt-1 text-base text-zinc-400">{restaurantName || 'Restoranti'}</p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-8 lg:grid-cols-[1fr_min(100%,380px)] lg:items-start"
      >
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          {/* Dërgesë / Marrje */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Si e merrni
            </p>
            <div className="inline-flex rounded-full bg-[#14161c] p-1 ring-1 ring-white/[0.06]">
              <button
                type="button"
                onClick={() => setFulfillmentType(FULFILLMENT_DELIVERY)}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${
                  !pickup ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="text-lg" aria-hidden>
                  🚴
                </span>
                Dërgesë
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType(FULFILLMENT_PICKUP)}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${
                  pickup ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="text-lg" aria-hidden>
                  🚶
                </span>
                Pickup
              </button>
            </div>
          </div>

          {/* Rreshta «Ku?» / dhuratë / shënim */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#16181f] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {!pickup ? (
              <>
                <Link to="/app/addresses" className={rowBase}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg">
                    📍
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Ku?</p>
                    <p className="truncate font-medium text-zinc-100">{savedAddressLabel}</p>
                    <p className="mt-1 text-xs text-zinc-500">Ndrysho te «Adresat»</p>
                  </div>
                  <ChevronRight className="shrink-0 text-zinc-500" />
                </Link>

                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Adresa e dorëzimit për këtë porosi
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryTo('saved')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        deliveryTo === 'saved'
                          ? 'bg-[#009fe3]/20 text-[#4dc4f5]'
                          : 'bg-white/[0.05] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      E ruajtur
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryTo('oneTime')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        deliveryTo === 'oneTime'
                          ? 'bg-[#009fe3]/20 text-[#4dc4f5]'
                          : 'bg-white/[0.05] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Tjetër (një herë)
                    </button>
                  </div>
                </div>

                {deliveryTo === 'oneTime' ? (
                  <div className="space-y-3 border-b border-white/[0.06] px-4 py-4">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase text-zinc-500">Rruga / lokacioni</span>
                      <input
                        value={otLine1}
                        onChange={(e) => setOtLine1(e.target.value)}
                        maxLength={256}
                        autoComplete="street-address"
                        className={`${customerField} mt-1`}
                        placeholder="p.sh. Rruga B 5"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase text-zinc-500">Qyteti</span>
                      <input
                        value={otCity}
                        onChange={(e) => setOtCity(e.target.value)}
                        maxLength={100}
                        autoComplete="address-level2"
                        className={`${customerField} mt-1`}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[11px] font-semibold uppercase text-zinc-500">Kodi postar</span>
                        <input
                          value={otPostal}
                          onChange={(e) => setOtPostal(e.target.value)}
                          maxLength={20}
                          autoComplete="postal-code"
                          className={`${customerField} mt-1`}
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-[11px] font-semibold uppercase text-zinc-500">Shtesë (opsional)</span>
                        <input
                          value={otLine2}
                          onChange={(e) => setOtLine2(e.target.value)}
                          maxLength={200}
                          className={`${customerField} mt-1`}
                          placeholder="Kati, apartamenti…"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex items-start gap-3 px-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg">
                  🏪
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Marrje në vend</p>
                  <p className="mt-1 font-medium text-zinc-100">
                    {summary?.addressLine || summary?.city ?
                      [summary.addressLine, summary.city].filter(Boolean).join(', ')
                    : 'Adresa e restorantit do të shfaqet në konfirmim.'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Nuk aplikohet tarifë dërgese.</p>
                </div>
              </div>
            )}

            <div className={`${rowBase} cursor-not-allowed opacity-45`} aria-disabled>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg">
                🎁
              </span>
              <div className="flex-1">
                <p className="font-medium text-zinc-300">Dërgo si dhuratë</p>
                <p className="text-xs text-zinc-500">Së shpejti në aplikacion</p>
              </div>
            </div>

            <div className="px-4 py-3">
              <label htmlFor="co-notes" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Shënim për kurierin / restorantin
              </label>
              <textarea
                id="co-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${customerField} mt-2 min-h-[88px] rounded-xl border-white/[0.08] bg-[#0f1115]`}
                rows={3}
                placeholder="p.sh. zile, kati, referencë…"
              />
            </div>
          </div>

          {/* Pagesa */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Pagesa</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod(PAYMENT_COD)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  paymentMethod === PAYMENT_COD
                    ? 'border-[#009fe3]/50 bg-[#009fe3]/15 text-[#7dd3fc]'
                    : 'border-white/[0.1] bg-[#14161c] text-zinc-400 hover:border-white/20'
                }`}
              >
                Para në dorëzim
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod(PAYMENT_STRIPE)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  paymentMethod === PAYMENT_STRIPE
                    ? 'border-[#009fe3]/50 bg-[#009fe3]/15 text-[#7dd3fc]'
                    : 'border-white/[0.1] bg-[#14161c] text-zinc-400 hover:border-white/20'
                }`}
              >
                Kartë (Stripe)
              </button>
            </div>
            {paymentMethod === PAYMENT_STRIPE ? (
              <p className="mt-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-100/85">
                Pas konfirmimit hapet faqja e pagesës me kartë (Stripe).
              </p>
            ) : (
              <p className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-zinc-400">
                Paguani kur porosia mbërrin — deliver-i mbledh shumën në dorë.
              </p>
            )}
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <aside className="order-1 lg:sticky lg:top-6 lg:order-2">
          <SummaryCard
            token={token}
            subtotal={subtotal}
            pickup={pickup}
            feeKnown={feeKnown}
            feeNum={feeNum}
            discountAmount={discountAmount}
            appliedCoupon={appliedCoupon}
            onCouponApplied={setAppliedCoupon}
            onCouponRemoved={() => setAppliedCoupon(null)}
            total={total}
            meetsMinOrder={meetsMinOrder}
            minOrder={minOrder}
            busy={busy}
            paymentMethod={paymentMethod}
            woltBlueClass={woltBlue}
          />
        </aside>
      </form>
    </div>
  )
}

function SummaryCard({
  token,
  subtotal,
  pickup,
  feeKnown,
  feeNum,
  discountAmount,
  appliedCoupon,
  onCouponApplied,
  onCouponRemoved,
  total,
  meetsMinOrder,
  minOrder,
  busy,
  paymentMethod,
  woltBlueClass,
}: {
  token: string
  subtotal: number
  pickup: boolean
  feeKnown: boolean
  feeNum: number | null
  discountAmount: number
  appliedCoupon: AppliedCoupon | null
  onCouponApplied: (coupon: AppliedCoupon) => void
  onCouponRemoved: () => void
  total: number | null
  meetsMinOrder: boolean
  minOrder: number
  busy: boolean
  paymentMethod: number
  woltBlueClass: string
}) {
  const submitBlocked = busy || !meetsMinOrder

  return (
    <div className="rounded-3xl border border-white/[0.1] bg-[#1c1f26] p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">Përmbledhja e porosisë</h2>
          <p className="text-xs text-zinc-500">përfshirë taksat (nëse vlejnë)</p>
        </div>
      </div>

      <div className="mt-4">
        <CouponInput
          token={token}
          subtotal={subtotal}
          applied={appliedCoupon}
          onApplied={onCouponApplied}
          onRemoved={onCouponRemoved}
        />
      </div>

      <Link
        to="/app/support"
        className="mt-3 inline-block text-xs font-medium text-[#009fe3] hover:underline"
      >
        Si funksionojnë tarifat
      </Link>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4 text-zinc-300">
          <dt>Nëntotali</dt>
          <dd className="tabular-nums font-medium text-zinc-100">{subtotal.toFixed(2)} €</dd>
        </div>
        {discountAmount > 0 ? (
          <div className="flex justify-between gap-4 text-emerald-300">
            <dt>Zbritja{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</dt>
            <dd className="tabular-nums font-medium">−{discountAmount.toFixed(2)} €</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 text-zinc-300">
          <dt>Tarifa e shërbimit</dt>
          <dd className="tabular-nums text-zinc-400">0,00 €</dd>
        </div>
        <div className="flex justify-between gap-4 text-zinc-300">
          <dt>{pickup ? 'Marrje në restoran' : 'Dërgesa'}</dt>
          <dd className="tabular-nums font-medium text-zinc-100">
            {pickup ? (
              '0,00 €'
            ) : feeKnown ? (
              `${(feeNum ?? 0).toFixed(2)} €`
            ) : (
              <span className="text-zinc-500">…</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-between border-t border-white/[0.08] pt-4 text-base font-bold text-white">
        <span>Totali</span>
        <span className="tabular-nums text-lg">
          {total != null ? `${total.toFixed(2)} €` : '—'}
        </span>
      </div>

      {!meetsMinOrder && minOrder > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center">
          <p className="text-sm font-semibold text-amber-100">Porosia minimale nuk është arritur</p>
          <p className="mt-0.5 text-xs text-amber-200/80">Minimumi: {minOrder.toFixed(2)} €</p>
        </div>
      ) : null}

      <button type="submit" disabled={submitBlocked} className={`mt-5 w-full ${woltBlueClass}`}>
        {busy ?
          'Duke dërguar…'
        : !meetsMinOrder && minOrder > 0 ?
          <>
            <span className="block">Nuk mund të dërgohet ende</span>
            <span className="mt-1 block text-sm font-normal opacity-90">
              Porosia minimale: {minOrder.toFixed(2)} €
            </span>
          </>
        : paymentMethod === PAYMENT_STRIPE ?
          'Konfirmo dhe paguaj me kartë'
        : 'Konfirmo porosinë'}
      </button>
    </div>
  )
}
