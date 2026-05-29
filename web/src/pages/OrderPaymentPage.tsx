import { loadStripe, type StripeCardCvcElement, type StripeCardExpiryElement, type StripeCardNumberElement } from '@stripe/stripe-js'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PaymentLegalFooter } from '../components/payment/PaymentLegalFooter'
import { PaymentMethodSelector, type PaymentUiMethod } from '../components/payment/PaymentMethodSelector'
import { PaymentSecurityBanner } from '../components/payment/PaymentSecurityBanner'
import { StripeCardFields } from '../components/payment/StripeCardFields'
import {
  BILLING_COUNTRIES,
  DEFAULT_BILLING_COUNTRY,
  type BillingCountryCode,
} from '../lib/billingCountries'
import { apiPath } from '../lib/apiBase'
import { customerField, customerSelect } from '../lib/customerTheme'
import { fetchClientPublicConfig } from '../lib/publicConfigApi'
import {
  cancelUnpaidStripeOrder,
  clearStripeCheckoutOrderSession,
  fetchMyOrder,
  setStripeCheckoutOrderSession,
} from '../lib/ordersApi'
import { rdYellow } from '../lib/restaurantDetailTheme'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

const STRIPE_NOT_CONFIGURED_MSG = 'Pagesa me kartë nuk është e konfiguruar në server.'

const btnPay =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7A18] py-3.5 text-sm font-bold text-white shadow-[0_4px_24px_rgba(255,122,24,0.4)] transition hover:bg-[#FF8F3A] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none'

function isStripeConfigError(msg: string | null): boolean {
  if (!msg) return false
  return (
    msg === STRIPE_NOT_CONFIGURED_MSG ||
    msg.includes('Stripe nuk është konfiguruar') ||
    msg.includes('nuk është e konfiguruar në server')
  )
}

function stripePayErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'incomplete_number':
      return 'Numri i kartës është i paplotë — shkruaj të 16 shifrat (p.sh. 4242 4242 4242 4242 për test).'
    case 'incomplete_expiry':
      return 'Data e skadimit është e paplotë (MM / VV).'
    case 'incomplete_cvc':
      return 'Kodi CVC mungon ose është i shkurtër.'
    case 'invalid_number':
      return 'Numri i kartës nuk është i vlefshëm.'
    case 'invalid_expiry_year_past':
      return 'Karta ka skaduar.'
    default:
      return fallback
  }
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  )
}

export default function OrderPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const clearCart = useCartStore((s) => s.clear)
  const orderId = Number(id)

  const stripeRef = useRef<Awaited<ReturnType<typeof loadStripe>>>(null)
  const cardNumberRef = useRef<StripeCardNumberElement | null>(null)
  const cardExpiryRef = useRef<StripeCardExpiryElement | null>(null)
  const cardCvcRef = useRef<StripeCardCvcElement | null>(null)
  const clientSecretRef = useRef<string | null>(null)

  const [paymentMethod, setPaymentMethod] = useState<PaymentUiMethod>('card')
  const [cardholderName, setCardholderName] = useState('')
  const [billingCountry, setBillingCountry] = useState<BillingCountryCode>(DEFAULT_BILLING_COUNTRY)
  const [saveCard, setSaveCard] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stripeLoaded, setStripeLoaded] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const onStripeReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) return
    fetchMyOrder(token, orderId)
      .then((o) => {
        if (o) setTotal(o.total)
      })
      .catch(() => {})
  }, [token, orderId])

  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) return

    let cancelled = false

    ;(async () => {
      try {
        setError(null)
        setReady(false)
        const cfg = await fetchClientPublicConfig()
        if (!cfg.stripePublishableKey?.trim()) {
          setError(STRIPE_NOT_CONFIGURED_MSG)
          return
        }

        const stripe = await loadStripe(cfg.stripePublishableKey)
        if (cancelled || !stripe) return
        stripeRef.current = stripe
        setStripeLoaded(true)

        const res = await fetch(apiPath('/api/stripe/payment-intent'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        })

        const raw = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg =
            (raw as { message?: string; error?: string }).message ??
            (raw as { error?: string }).error ??
            `HTTP ${res.status}`
          setError(msg)
          return
        }

        const secret = (raw as { clientSecret?: string }).clientSecret
        if (!secret) {
          setError('Mungon client secret nga Stripe.')
          return
        }

        clientSecretRef.current = secret
        if (!cancelled) setClientSecret(secret)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gabim.')
      }
    })()

    return () => {
      cancelled = true
      stripeRef.current = null
      clientSecretRef.current = null
    }
  }, [token, orderId])

  useEffect(() => {
    if (Number.isFinite(orderId)) setStripeCheckoutOrderSession(orderId)
  }, [orderId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (paymentMethod !== 'card') {
      setError('Për këtë porosi duhet të paguash me kartë bankare.')
      return
    }

    const stripe = stripeRef.current
    const card = cardNumberRef.current
    const secret = clientSecretRef.current
    if (!stripe || !card || !secret) return

    setBusy(true)
    setError(null)

    const { error: payErr } = await stripe.confirmCardPayment(secret, {
      payment_method: {
        card,
        billing_details: {
          name: cardholderName.trim() || undefined,
          address: {
            country: billingCountry,
          },
        },
      },
      setup_future_usage: saveCard ? 'off_session' : undefined,
    })

    setBusy(false)

    if (payErr) {
      if (payErr.type === 'validation_error') {
        setError(stripePayErrorMessage(payErr.code, payErr.message ?? 'Kontrollo të dhënat e kartës.'))
        return
      }

      if (token) {
        const c = await cancelUnpaidStripeOrder(token, orderId)
        if (!c.ok) {
          setError(
            (payErr.message ?? 'Banka refuzoi pagesën.') +
              (c.message ? ` (${c.message})` : ''),
          )
          return
        }
      }
      clearStripeCheckoutOrderSession()
      const fromStripe = payErr.message?.trim() ?? ''
      setError(
        fromStripe.length > 0
          ? `${fromStripe} Porosia u anulua sepse pagesa nuk u krye; kthehu te shporta për ta provuar përsëri.`
          : 'Banka refuzoi pagesën. Porosia u anulua — kthehu te shporta për ta provuar përsëri.',
      )
      return
    }

    try {
      await fetch(apiPath('/api/stripe/confirm-after-payment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      })
    } catch { /* webhook will handle it as fallback */ }

    clearCart()
    clearStripeCheckoutOrderSession()
    navigate(`/app/orders/${orderId}?payment=success`, { replace: true })
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-[#1c2030]/90 p-8">
        <p className="text-zinc-400">Duhet të jesh i kyçur.</p>
      </section>
    )
  }

  const payLabel =
    total != null
      ? `Konfirmo dhe paguaj ${total.toFixed(2)} €`
      : 'Konfirmo dhe paguaj'

  return (
    <div className="mx-auto max-w-xl pb-10">
      <Link
        to={`/app/orders/${orderId}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold transition hover:underline"
        style={{ color: '#FF7A18' }}
      >
        <span aria-hidden>←</span> Kthehu te porosia
      </Link>

      <h1 className="mt-5 text-3xl font-bold text-white">Pagesa</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Zgjidh mënyrën e pagesës dhe përfundo porosinë.
      </p>

      {isStripeConfigError(error) ? (
        <div className="mt-6 space-y-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
          <p className="font-medium text-amber-200">{error}</p>
          <p className="text-xs leading-relaxed text-amber-100/85">
            Vendos çelësat Stripe në <code className="rounded bg-black/30 px-1">src/FoodDelivery.Api/.env</code>,
            pastaj rinis API-në dhe rifresko faqen.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-[#0f1118] p-3 font-mono text-[11px] text-zinc-300">
            {`Stripe__PublishableKey=pk_test_xxxxxxxx
Stripe__SecretKey=sk_test_xxxxxxxx`}
          </pre>
        </div>
      ) : error && !isStripeConfigError(error) ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} autoComplete="on" className="mt-8 space-y-6">
        <PaymentMethodSelector
          selected={paymentMethod}
          onSelect={setPaymentMethod}
          lockToCard
        />

        {paymentMethod === 'card' ? (
          <div>
            <h2 className="mb-4 text-sm font-bold text-white">Detajet e kartës</h2>

            {stripeLoaded && clientSecret && stripeRef.current ? (
              <StripeCardFields
                stripe={stripeRef.current}
                clientSecret={clientSecret}
                onReady={onStripeReady}
                cardNumberRef={cardNumberRef}
                cardExpiryRef={cardExpiryRef}
                cardCvcRef={cardCvcRef}
              />
            ) : (
              <div className="space-y-4">
                <div className="h-12 animate-pulse rounded-[10px] bg-white/[0.06]" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-12 animate-pulse rounded-[10px] bg-white/[0.06]" />
                  <div className="h-12 animate-pulse rounded-[10px] bg-white/[0.06]" />
                </div>
              </div>
            )}

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Emri në kartë</span>
              <input
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                autoComplete="cc-name"
                name="cc-name"
                placeholder="Emri i plotë si në kartë"
                className={customerField}
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Vendi / Shteti</span>
              <select
                value={billingCountry}
                onChange={(e) => setBillingCountry(e.target.value as BillingCountryCode)}
                autoComplete="country"
                name="country"
                className={customerSelect}
              >
                {BILLING_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <p className="mt-2 text-xs text-zinc-500">
              Kartë test Stripe: <span className="font-mono text-zinc-400">4242 4242 4242 4242</span> · skadim
              çdo datë e ardhshme · CVC 3 shifra.
            </p>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#141820] accent-[#FF7A18]"
              />
              <span className="text-sm text-zinc-400">Ruaje kartën për herën tjetër</span>
            </label>
          </div>
        ) : null}

        <PaymentSecurityBanner />

        <button type="submit" disabled={!ready || busy || paymentMethod !== 'card'} className={btnPay}>
          <LockIcon />
          {busy ? 'Duke përpunuar…' : payLabel}
        </button>

        <PaymentLegalFooter />
      </form>

      {paymentMethod !== 'card' ? (
        <p className="mt-4 text-center text-xs" style={{ color: rdYellow }}>
          Zgjidh «Kartë bankare» për të vazhduar me pagesën online.
        </p>
      ) : null}
    </div>
  )
}
