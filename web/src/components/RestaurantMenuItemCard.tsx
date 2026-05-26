import type { KeyboardEvent, MouseEvent } from 'react'
import { apiPath } from '../lib/apiBase'
import { imageUrlForFoodCategory } from '../lib/categoryBrowseImages'
import type { MenuItemWithMeta } from '../lib/restaurantDetailUi'

type Props = {
  item: MenuItemWithMeta
  categoryName: string
  qty: number
  onOpen: () => void
  onAdd: () => void
  onQtyChange: (qty: number) => void
}

/** Kartë horizontale — klikimi kudo hap modalin (përveç butonit + / sasi). */
export function RestaurantMenuItemCard({
  item,
  categoryName,
  qty,
  onOpen,
  onAdd,
  onQtyChange,
}: Props) {
  const img = item.imageUrl
    ? apiPath(item.imageUrl)
    : imageUrlForFoodCategory(categoryName)

  function handleCardClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-cart-action]')) return
    onOpen()
  }

  function handleCardKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKey}
      className={`group flex cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141a28] transition hover:border-white/[0.14] hover:bg-[#181f30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5B800]/50 ${
        !item.isAvailable ? 'opacity-80' : ''
      }`}
    >
      <div className="relative h-[7.5rem] w-[7.5rem] shrink-0 overflow-hidden sm:h-28 sm:w-28">
        <img
          src={img}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {!item.isAvailable ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-[11px] font-medium text-white">
            Jo në dispozicion
          </span>
        ) : null}
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col justify-between p-4 pr-14">
        <div className="text-left">
          <p className="font-bold text-zinc-50">{item.name}</p>
          {item.displayDescription ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
              {item.displayDescription}
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-base font-bold tabular-nums text-white">
          {(Number(item.price) || 0).toFixed(2)} €
        </p>

        {item.isAvailable ? (
          qty > 0 ? (
            <div
              data-cart-action
              className="absolute bottom-3 right-3 flex items-center rounded-lg border border-white/15 bg-[#0c0e14]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="px-2.5 py-1.5 text-lg text-white hover:bg-white/10"
                onClick={() => onQtyChange(qty - 1)}
              >
                −
              </button>
              <span className="min-w-[1.75rem] text-center text-sm font-bold">{qty}</span>
              <button
                type="button"
                className="px-2.5 py-1.5 text-lg text-white hover:bg-white/10"
                onClick={() => onQtyChange(qty + 1)}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-cart-action
              aria-label={`Shto ${item.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onAdd()
              }}
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5B800] text-xl font-bold leading-none text-[#0c0e14] shadow-[0_4px_16px_rgba(245,184,0,0.35)] transition hover:bg-[#FFCA28] active:scale-95"
            >
              +
            </button>
          )
        ) : null}
      </div>
    </li>
  )
}
