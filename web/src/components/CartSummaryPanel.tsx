import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  customerBtnGhost,
  customerBtnPrimary,
  customerCardMuted,
} from '../lib/customerTheme'
import { fetchRestaurantSummary } from '../lib/restaurantsApi'
import { useCartStore } from '../store/cartStore'

type Props = {
  open: boolean
  onClose: () => void
  /** Restoranti i faqes aktuale (për të mos përzier me shportën e një restoranti tjetër). */
  pageRestaurantId: number
}

export function CartSummaryPanel({ open, onClose, pageRestaurantId }: Props) {
  const restaurantId = useCartStore((s) => s.restaurantId)
  const restaurantName = useCartStore((s) => s.restaurantName)
  const deliveryFee = useCartStore((s) => s.deliveryFee)
  const lines = useCartStore((s) => s.lines)
  const setQty = useCartStore((s) => s.setQty)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)
  const clear = useCartStore((s) => s.clear)

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const feeNum = deliveryFee
  const feeKnown = feeNum != null
  const total = feeKnown ? subtotal + feeNum : null

  const wrongRestaurant =
    restaurantId !== null && restaurantId !== pageRestaurantId && lines.length > 0

  useEffect(() => {
    if (!open) return
    if (!restaurantId || lines.length === 0 || wrongRestaurant) return
    if (deliveryFee !== null) return

    const ac = new AbortController()
    fetchRestaurantSummary(restaurantId, ac.signal)
      .then((s) => {
        if (s && useCartStore.getState().restaurantId === restaurantId)
          setDeliveryFee(s.deliveryFee)
      })
      .catch(() => {})
    return () => ac.abort()
  }, [open, restaurantId, lines.length, deliveryFee, wrongRestaurant, setDeliveryFee])

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [open, onKeyDown])

  if (!open) return null

  const panel = (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Mbyll shportën"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col border-l border-white/[0.1] bg-[#171a24] shadow-[0_0_80px_rgba(0,0,0,0.45)] animate-[cart-panel-in_0.22s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-panel-title"
      >
        <style>{`
          @keyframes cart-panel-in {
            from { transform: translateX(100%); opacity: 0.85; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <h2 id="cart-panel-title" className="text-lg font-bold text-zinc-100">
            Shporta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-amber-400/30 hover:text-zinc-200"
          >
            Mbyll
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
          {wrongRestaurant ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100/90">
              Shporta përmban artikuj nga një restorant tjetër. Hap{' '}
              <Link
                to="/app/cart"
                className="font-semibold text-amber-300 underline"
                onClick={onClose}
              >
                faqen e shportës
              </Link>{' '}
              për ta menaxhuar.
            </p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nuk ka artikuj. Shto nga menuja më poshtë.
            </p>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-400">Restoranti:</span>{' '}
                <span className="font-medium text-zinc-200">{restaurantName}</span>
              </p>
              <ul className="mt-4 space-y-3">
                {lines.map((l) => (
                  <li
                    key={l.menuItemId}
                    className={`${customerCardMuted} flex flex-wrap items-center justify-between gap-3`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-100">{l.name}</p>
                      <p className="text-xs text-zinc-500">
                        {l.unitPrice.toFixed(2)} € × {l.quantity} ={' '}
                        <span className="font-medium text-amber-200/90">
                          {(l.unitPrice * l.quantity).toFixed(2)} €
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-white/15 px-2.5 py-1 text-sm text-zinc-300"
                        onClick={() => setQty(l.menuItemId, l.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm text-zinc-200">{l.quantity}</span>
                      <button
                        type="button"
                        className="rounded-lg border border-white/15 px-2.5 py-1 text-sm text-zinc-300"
                        onClick={() => setQty(l.menuItemId, l.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-2 border-t border-white/[0.08] pt-4 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Nëntotali</span>
                  <span className="font-semibold text-zinc-100">{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Tarifa e dërgesës</span>
                  {feeKnown ? (
                    <span className="font-semibold text-amber-200/90">
                      {feeNum.toFixed(2)} €
                    </span>
                  ) : (
                    <span className="text-zinc-500">Duke ngarkuar…</span>
                  )}
                </div>
                <div className="flex justify-between border-t border-white/[0.08] pt-3 text-base">
                  <span className="font-semibold text-zinc-200">Gjithsej</span>
                  {total !== null ? (
                    <span className="font-bold text-amber-300">{total.toFixed(2)} €</span>
                  ) : (
                    <span className="text-sm font-medium text-zinc-500">—</span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  to="/app/checkout"
                  className={`${customerBtnPrimary} block text-center`}
                  onClick={onClose}
                >
                  Te pagesa
                </Link>
                <Link
                  to="/app/cart"
                  className={`${customerBtnGhost} block text-center`}
                  onClick={onClose}
                >
                  Hap shportën e plotë
                </Link>
                <button type="button" onClick={() => clear()} className={customerBtnGhost}>
                  Zbraz shportën
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
