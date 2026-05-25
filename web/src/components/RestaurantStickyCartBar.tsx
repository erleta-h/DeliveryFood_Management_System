type Props = {
  itemCount: number
  subtotal: number
  deliveryFee: number | null
  restaurantName: string
  onOpenCart: () => void
}

export function RestaurantStickyCartBar({
  itemCount,
  subtotal,
  deliveryFee,
  restaurantName,
  onOpenCart,
}: Props) {
  if (itemCount <= 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-white/10 bg-[#0f121c]/98 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5B800] text-[#0c0e14]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {itemCount} artikuj në shportë
            </p>
            <p className="truncate text-xs text-zinc-500">{restaurantName}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-lg font-bold tabular-nums text-white">{subtotal.toFixed(2)} €</p>
            {deliveryFee != null ? (
              <p className="text-[11px] text-zinc-500">Tarifa: {deliveryFee.toFixed(2)} €</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F5B800] px-4 py-3 text-sm font-bold text-[#0c0e14] shadow-[0_4px_24px_rgba(245,184,0,0.4)] transition hover:bg-[#FFCA28] sm:px-5"
          >
            <span className="sm:hidden tabular-nums">{subtotal.toFixed(2)} € · </span>
            Shiko shportën
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
