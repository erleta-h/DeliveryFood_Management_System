import type { Stripe, StripeCardCvcElement, StripeCardExpiryElement, StripeCardNumberElement } from '@stripe/stripe-js'
import { useEffect, useRef } from 'react'
import { stripeCardElementStyle, stripePaymentAppearance } from '../../lib/stripeAppearance'

const stripeFieldMount =
  'min-h-[46px] rounded-[10px] border border-white/[0.12] bg-[#141820] px-3.5 py-3 transition focus-within:border-[#FF7A18]/55 focus-within:ring-2 focus-within:ring-[#FF7A18]/15'

type Props = {
  stripe: Stripe
  clientSecret: string
  onReady: () => void
  cardNumberRef: React.MutableRefObject<StripeCardNumberElement | null>
  cardExpiryRef: React.MutableRefObject<StripeCardExpiryElement | null>
  cardCvcRef: React.MutableRefObject<StripeCardCvcElement | null>
}

export function StripeCardFields({
  stripe,
  clientSecret,
  onReady,
  cardNumberRef,
  cardExpiryRef,
  cardCvcRef,
}: Props) {
  const numberMount = useRef<HTMLDivElement>(null)
  const expiryMount = useRef<HTMLDivElement>(null)
  const cvcMount = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elements = stripe.elements({
      clientSecret,
      appearance: stripePaymentAppearance,
    })

    const cardNumber = elements.create('cardNumber', {
      style: stripeCardElementStyle,
      showIcon: true,
      placeholder: '1234 1234 1234 1234',
    })
    const cardExpiry = elements.create('cardExpiry', {
      style: stripeCardElementStyle,
      placeholder: 'MM / YY',
    })
    const cardCvc = elements.create('cardCvc', {
      style: stripeCardElementStyle,
      placeholder: 'CVC',
    })

    cardNumberRef.current = cardNumber
    cardExpiryRef.current = cardExpiry
    cardCvcRef.current = cardCvc

    if (numberMount.current) cardNumber.mount(numberMount.current)
    if (expiryMount.current) cardExpiry.mount(expiryMount.current)
    if (cvcMount.current) cardCvc.mount(cvcMount.current)

    let mounted = 0
    const markReady = () => {
      mounted += 1
      if (mounted >= 3) onReady()
    }
    cardNumber.on('ready', markReady)
    cardExpiry.on('ready', markReady)
    cardCvc.on('ready', markReady)

    return () => {
      cardNumber.unmount()
      cardExpiry.unmount()
      cardCvc.unmount()
      cardNumberRef.current = null
      cardExpiryRef.current = null
      cardCvcRef.current = null
    }
  }, [stripe, clientSecret, onReady, cardNumberRef, cardExpiryRef, cardCvcRef])

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Numri i kartës</span>
        <div ref={numberMount} className={stripeFieldMount} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Data e skadimit</span>
          <div ref={expiryMount} className={stripeFieldMount} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Kodi i sigurisë (CVC)</span>
          <div ref={cvcMount} className={stripeFieldMount} />
        </label>
      </div>
    </div>
  )
}
