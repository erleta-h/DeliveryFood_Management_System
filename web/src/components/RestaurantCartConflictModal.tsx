import { useEffect } from 'react'
import { customerBtnGhost } from '../lib/customerTheme'

type Props = {
  open: boolean
  restaurantName: string
  onCancel: () => void
  onClearCart: () => void
}

export function RestaurantCartConflictModal({
  open,
  restaurantName,
  onCancel,
  onClearCart,
}: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="cart-conflict-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e2438] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cart-conflict-title" className="text-lg font-bold text-zinc-50">
          Ke artikuj nga një restaurant tjetër
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Për të porositur nga <span className="font-semibold text-zinc-200">{restaurantName}</span>,
          duhet ta pastrosh shportën aktuale.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className={customerBtnGhost}>
            Anulo
          </button>
          <button
            type="button"
            onClick={onClearCart}
            className="rounded-lg bg-[#F5B800] px-4 py-2 text-sm font-bold text-[#0c0e14] hover:bg-[#FFCA28]"
          >
            Pastro shportën
          </button>
        </div>
      </div>
    </div>
  )
}
