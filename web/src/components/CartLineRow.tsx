import { apiPath } from '../lib/apiBase'
import { imageUrlForFoodCategory } from '../lib/categoryBrowseImages'
import { rdYellow } from '../lib/restaurantDetailTheme'
import type { CartLine } from '../store/cartStore'

type Props = {
  line: CartLine
  onQty: (qty: number) => void
  onRemove: () => void
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" />
    </svg>
  )
}

export function CartLineRow({ line, onQty, onRemove }: Props) {
  const img = line.imageUrl ? apiPath(line.imageUrl) : imageUrlForFoodCategory(line.name)

  return (
    <li className="flex items-center gap-4 border-b border-white/[0.06] py-4 last:border-0">
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#1a2030]">
        <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{line.name}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums" style={{ color: rdYellow }}>
          {line.unitPrice.toFixed(2)} €
        </p>
      </div>

      <div className="inline-flex shrink-0 items-center rounded-lg border border-white/10 bg-[#0f1218]">
        <button
          type="button"
          onClick={() => onQty(line.quantity - 1)}
          className="px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
          aria-label="Zvogëlo sasinë"
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-sm font-semibold text-white">{line.quantity}</span>
        <button
          type="button"
          onClick={() => onQty(line.quantity + 1)}
          className="px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
          aria-label="Rrit sasinë"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/45 bg-red-500/10 text-red-400 transition hover:border-red-500/70 hover:bg-red-500/20"
        aria-label={`Hiq ${line.name}`}
      >
        <TrashIcon />
      </button>
    </li>
  )
}

export function CartSecurityBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 ${className}`}
    >
      <span className="text-lg text-emerald-400" aria-hidden>
        🛡
      </span>
      <div>
        <p className="text-sm font-semibold text-emerald-100">Porosia juaj është e sigurt</p>
        <p className="text-xs text-zinc-500">Të dhënat tuaja janë të mbrojtura.</p>
      </div>
    </div>
  )
}
