import { loadStripe, type StripeElements, type StripePaymentElement } from '@stripe/stripe-js'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiPath } from '../lib/apiBase'
import { customerBtnPrimary, customerCard, customerPanelSubtitle } from '../lib/customerTheme'
import { fetchClientPublicConfig } from '../lib/publicConfigApi'
import {
  cancelUnpaidStripeOrder,
  clearStripeCheckoutOrderSession,
  setStripeCheckoutOrderSession,
} from '../lib/ordersApi'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

const STRIPE_NOT_CONFIGURED_MSG = 'Pagesa me kartë nuk është e konfiguruar në server.'

function isStripeConfigError(msg: string | null): boolean {
  if (!msg) return false
  return (
    msg === STRIPE_NOT_CONFIGURED_MSG ||
    msg.includes('Stripe nuk është konfiguruar') ||
    msg.includes('nuk është e konfiguruar në server')
  )
}

export default function OrderPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const clearCart = useCartStore((s) => s.clear)
  const orderId = Number(id)

  const mountRef = useRef<HTMLDivElement>(null)
  const stripeRef = useRef<Awaited<ReturnType<typeof loadStripe>>>(null)
  const elementsRef = useRef<StripeElements | null>(null)
  const paymentElRef = useRef<StripePaymentElement | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token || !Number.isFinite(orderId)) return

    let cancelled = false

    ;(async () => {
      try {
        setError(null)
        const cfg = await fetchClientPublicConfig()
        if (!cfg.stripePublishableKey?.trim()) {
          setError(STRIPE_NOT_CONFIGURED_MSG)
          return
        }

        const stripe = await loadStripe(cfg.stripePublishableKey)
        if (cancelled || !stripe) return
        stripeRef.current = stripe

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
          setError((raw as { message?: string }).message ?? `HTTP ${res.status}`)
          return
        }

        const clientSecret = (raw as { clientSecret?: string }).clientSecret
        if (!clientSecret) {
          setError('Mungon client secret nga Stripe.')
          return
        }

        const elements = stripe.elements({ clientSecret })
        elementsRef.current = elements
        const pay = elements.create('payment')
        paymentElRef.current = pay
        if (mountRef.current) pay.mount(mountRef.current)
        if (!cancelled) setReady(true)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gabim.')
      }
    })()

    return () => {
      cancelled = true
      paymentElRef.current?.unmount()
      paymentElRef.current = null
      elementsRef.current = null
      stripeRef.current = null
    }
  }, [token, orderId])

  useEffect(() => {
    if (Number.isFinite(orderId)) setStripeCheckoutOrderSession(orderId)
  }, [orderId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const stripe = stripeRef.current
    const elements = elementsRef.current
    if (!stripe || !elements) return

    setBusy(true)
    setError(null)
    const { error: payErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/app/orders/${orderId}`,
      },
      redirect: 'if_required',
    })
    setBusy(false)

    if (payErr) {
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
        fromStripe.length > 0 ?
          `${fromStripe} Porosia u anulua sepse pagesa nuk u krye; kthehu te shporta për ta provuar përsëri.`
        : 'Banka refuzoi pagesën. Porosia u anulua — kthehu te shporta për ta provuar përsëri.',
      )
      return
    }

    clearCart()
    clearStripeCheckoutOrderSession()
    navigate(`/app/orders/${orderId}`, { replace: true })
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
      <Link
        to={`/app/orders/${orderId}`}
        className="mb-4 inline-block text-sm text-amber-400/90 hover:text-amber-300"
      >
        ← Kthehu te porosia
      </Link>
      <h1 className="text-2xl font-bold text-zinc-100">Pagesa me kartë</h1>
      <p className={customerPanelSubtitle}>
        Plotëso të dhënat e kartës. Pas suksesit kthehesh te detaji i porosisë.
      </p>

      {isStripeConfigError(error) ? (
        <div className="mt-4 space-y-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
          <p className="font-medium text-amber-200">{error}</p>
          <p className="text-xs leading-relaxed text-amber-100/85">
            Kjo nuk është gabim në kod — API nuk po dërgon çelësin publik të Stripe (<code className="rounded bg-black/30 px-1">pk_test_…</code>).
            Pa të, forma e kartës nuk mund të ngarkohet.
          </p>
          <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-amber-100/90">
            <li>
              Hap{' '}
              <a
                href="https://dashboard.stripe.com/test/apikeys"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-sky-300 underline hover:text-sky-200"
              >
                Stripe Dashboard → API keys (Test mode)
              </a>
              .
            </li>
            <li>
              Në projekt, te dosja <code className="rounded bg-black/30 px-1">src/FoodDelivery.Api</code>, skedari{' '}
              <code className="rounded bg-black/30 px-1">.env</code> (kopjo nga <code className="rounded bg-black/30 px-1">.env.example</code>)
              shto:
            </li>
          </ol>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-[#0f1118] p-3 font-mono text-[11px] text-zinc-300">
            {`Stripe__PublishableKey=pk_test_xxxxxxxx
Stripe__SecretKey=sk_test_xxxxxxxx`}
          </pre>
          <p className="text-xs text-amber-100/80">
            <strong className="text-amber-200">Rëndësishme:</strong> të dyja duhet të jenë nga i njëjti llogari Stripe (Test).
            Pastaj <strong className="text-amber-200">rinis API-n</strong> (<code className="rounded bg-black/30 px-1">dotnet run</code>) dhe rifresko këtë faqe.
          </p>
        </div>
      ) : error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 max-w-lg space-y-4">
        <div ref={mountRef} className="min-h-[120px] rounded-xl border border-white/[0.08] bg-[#1a1d28]/80 p-3" />
        <button
          type="submit"
          disabled={!ready || busy}
          className={customerBtnPrimary}
        >
          {busy ? 'Duke përpunuar…' : 'Paguaj'}
        </button>
      </form>
    </section>
  )
}
