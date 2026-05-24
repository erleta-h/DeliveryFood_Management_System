import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { CartLineRow, CartSecurityBadge } from './CartLineRow'
import { fetchRestaurantSummary } from '../lib/restaurantsApi'
import { useCartStore } from '../store/cartStore'

type Props = {
  open: boolean
  onClose: () => void
  pageRestaurantId: number
}

export function CartSummaryPanel({ open, onClose, pageRestaurantId }: Props) {
  const navigate = useNavigate()
  const restaurantId = useCartStore((s) => s.restaurantId)
  const restaurantName = useCartStore((s) => s.restaurantName)
  const deliveryFee = useCartStore((s) => s.deliveryFee)
  const lines = useCartStore((s) => s.lines)
  const setQty = useCartStore((s) => s.setQty)
  const removeLine = useCartStore((s) => s.removeLine)
  const setDeliveryFee = useCartStore((s) => s.setDeliveryFee)
  const clear = useCartStore((s) => s.clear)

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const feeKnown = deliveryFee != null
  const total = feeKnown ? subtotal + deliveryFee! : null
  const wrongRestaurant =
    restaurantId !== null && restaurantId !== pageRestaurantId && lines.length > 0

  const restaurantInitial = restaurantName.trim().charAt(0).toUpperCase() || 'R'

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
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Mbyll shportën"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-[420px] flex-col bg-[#12151c] shadow-[-12px_0_48px_rgba(0,0,0,0.5)] animate-[cart-panel-in_0.22s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-panel-title"
      >
        <style>{`
          @keyframes cart-panel-in {
            from { transform: translateX(100%); opacity: 0.9; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        <header className="flex shrink-0 items-center justify-between px-5 py-4">
          <h2 id="cart-panel-title" className="text-xl font-bold text-white">
            Shporta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Mbyll"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
          {wrongRestaurant ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100/90">
              Shporta përmban artikuj nga një restorant tjetër.{' '}
              <Link to="/app/cart" className="font-semibold text-[#F5B800] underline" onClick={onClose}>
                Hap shportën e plotë
              </Link>
            </p>
          ) : lines.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-zinc-400">Shporta është bosh</p>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/app/restaurants')
                }}
                className="mt-4 text-sm font-semibold text-[#F5B800] hover:underline"
              >
                Shfletoni restorantet
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-white/[0.06] pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Restoranti
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a2030] text-sm font-bold text-[#F5B800] ring-1 ring-white/10">
                      {restaurantInitial}
                    </div>
                    <span className="truncate font-semibold text-white">{restaurantName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate('/app/restaurants')
                    }}
                    className="shrink-0 text-sm font-semibold text-[#F5B800] hover:underline"
                  >
                    Ndrysho
                  </button>
                </div>
              </div>

              <ul>
                {lines.map((l) => (
                  <CartLineRow
                    key={l.menuItemId}
                    line={l}
                    onQty={(q) => setQty(l.menuItemId, q)}
                    onRemove={() => removeLine(l.menuItemId)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        {lines.length > 0 && !wrongRestaurant ? (
          <div className="shrink-0 border-t border-white/[0.06] px-5 py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Nëntotali</span>
                <span className="font-medium text-white">{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Tarifa e dërgesës</span>
                {feeKnown ? (
                  <span className="font-semibold text-[#F5B800]">{deliveryFee!.toFixed(2)} €</span>
                ) : (
                  <span className="text-zinc-600">…</span>
                )}
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <span className="text-lg font-bold text-white">Totali</span>
                {total !== null ? (
                  <span className="text-2xl font-bold tabular-nums text-[#F5B800]">
                    {total.toFixed(2)} €
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <Link
                to="/app/checkout"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-xl bg-[#F5B800] py-3.5 text-sm font-bold text-[#0c0e14] shadow-[0_4px_24px_rgba(245,184,0,0.35)] transition hover:bg-[#FFCA28]"
              >
                Te pagesa
              </Link>
              <Link
                to="/app/cart"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1a2030] py-3 text-sm font-medium text-zinc-200 transition hover:bg-[#222a3d]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
                Hap shportën e plotë
              </Link>
              <button
                type="button"
                onClick={() => clear()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1a2030] py-3 text-sm font-medium text-red-400 transition hover:bg-[#222a3d]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" />
                </svg>
                Zbraz shportën
              </button>
            </div>

            <CartSecurityBadge className="mt-4" />
          </div>
        ) : null}
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
