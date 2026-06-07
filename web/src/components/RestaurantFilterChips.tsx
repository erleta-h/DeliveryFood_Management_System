import type { QuickFilterId } from '../lib/restaurantFilters'
import type { FoodCategoryOption } from '../lib/restaurantsApi'
import type { PriceTierOption, SortOption } from '../lib/restaurantFilters'

const QUICK_FILTERS: { id: QuickFilterId; label: string; icon: string }[] = [
  { id: 'rating45', label: '4.5+', icon: '⭐' },
  { id: 'freeDelivery', label: 'Dërgesë falas', icon: '🚴' },
  { id: 'fast30', label: 'Nën 30 min', icon: '⏱' },
]

type Props = {
  quickFilters: Set<QuickFilterId>
  onToggleQuick: (id: QuickFilterId) => void
  sortBy: SortOption
  onSortChange: (v: SortOption) => void
  priceTier: PriceTierOption
  onPriceTierChange: (v: PriceTierOption) => void
  openNow: boolean
  onOpenNowChange: (v: boolean) => void
  categories: FoodCategoryOption[]
  categoryId: number | null
  onCategoryChange: (id: number | null) => void
}

const chipBase =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition duration-200'

function chipActive() {
  return `${chipBase} border-orange-400/50 bg-orange-500/20 text-orange-50 shadow-[0_0_20px_-4px_rgba(251,146,60,0.45)]`
}

function chipIdle() {
  return `${chipBase} border-white/[0.12] bg-white/[0.05] text-zinc-300 hover:border-orange-400/25 hover:bg-orange-500/10 hover:text-zinc-100`
}

/** Lista e hapur në Windows/Chrome — stili `restaurant-toolbar-select` në index.css. */
const filterSelect =
  'restaurant-toolbar-select h-8 min-h-8 shrink-0 cursor-pointer appearance-none rounded-full border border-white/[0.12] bg-[#1b2233] py-0 pl-3 pr-8 text-xs font-medium text-zinc-100 outline-none transition hover:border-white/[0.18] focus:border-orange-400/45 focus:ring-2 focus:ring-orange-400/15'

export function RestaurantFilterChips({
  quickFilters,
  onToggleQuick,
  sortBy,
  onSortChange,
  priceTier,
  onPriceTierChange,
  openNow,
  onOpenNowChange,
  categories,
  categoryId,
  onCategoryChange,
}: Props) {
  return (
    <div
      className="-mx-1 flex gap-2 overflow-x-auto pb-0.5 pt-0.5 scrollbar-thin [scrollbar-color:rgba(255,255,255,0.12)_transparent]"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {QUICK_FILTERS.map((f) => {
        const on = quickFilters.has(f.id)
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onToggleQuick(f.id)}
            className={on ? chipActive() : chipIdle()}
          >
            <span aria-hidden>{f.icon}</span>
            {f.label}
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => onOpenNowChange(!openNow)}
        className={openNow ? chipActive() : chipIdle()}
      >
        <span aria-hidden>🟢</span>
        Hapur tani
      </button>
      <select
        aria-label="Rendit sipas"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className={filterSelect}
      >
        <option value="rating">Vlerësimi</option>
        <option value="eta">Koha e dërgesës</option>
        <option value="name">Emri A–Z</option>
        <option value="fee">Tarifa dërgese</option>
        <option value="proximity">Afër meje</option>
      </select>
      <select
        aria-label="Çmimi i dërgesës"
        value={priceTier}
        onChange={(e) => onPriceTierChange(e.target.value as PriceTierOption)}
        className={filterSelect}
      >
        <option value="all">Çmimi · të gjitha</option>
        <option value="low">Dërgesë e ulët</option>
        <option value="medium">Mesatare</option>
        <option value="high">Më e lartë</option>
      </select>
      <select
        aria-label="Kategoria"
        value={categoryId ?? ''}
        onChange={(e) => {
          const v = e.target.value
          onCategoryChange(v === '' ? null : Number(v))
        }}
        className={`${filterSelect} max-w-[11rem]`}
      >
        <option value="">Të gjitha kategoritë</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
