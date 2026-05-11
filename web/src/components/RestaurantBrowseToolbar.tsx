import type { FoodCategoryOption } from '../lib/restaurantsApi'
import type { PriceTierOption, SortOption } from '../lib/restaurantFilters'

export type { PriceTierOption, SortOption } from '../lib/restaurantFilters'

type Props = {
  categories: FoodCategoryOption[]
  categoryId: number | null
  onCategoryChange: (id: number | null) => void
  sortBy: SortOption
  onSortChange: (v: SortOption) => void
  priceTier: PriceTierOption
  onPriceTierChange: (v: PriceTierOption) => void
  openNow: boolean
  onOpenNowChange: (v: boolean) => void
}

/** Pilula kompakte — një shkallë më të vogla se më parë. */
const pillSelect =
  'restaurant-toolbar-select h-7 min-h-7 cursor-pointer appearance-none rounded-full border border-white/[0.12] bg-white/[0.06] py-0 pl-2.5 pr-6 text-[11px] font-medium leading-none text-zinc-200 shadow-sm outline-none transition hover:border-white/[0.18] hover:bg-white/[0.09] focus:border-sky-400/35 focus:ring-1 focus:ring-sky-400/25 sm:h-8 sm:min-h-8 sm:pl-3 sm:pr-7 sm:text-xs'

const chevronBg =
  "bg-[length:8px_4px] bg-[right_0.45rem_center] bg-no-repeat sm:bg-[right_0.55rem_center] [background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 12 8'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-width='1.5' d='m1 1.5 5 4 5-4'/%3E%3C/svg%3E\")]"

const pillButton =
  'inline-flex h-7 min-h-7 items-center justify-center rounded-full border px-2.5 text-[11px] font-medium leading-none transition sm:h-8 sm:min-h-8 sm:px-3 sm:text-xs'

/** Shirit filtrash — kompakt dhe i njëtrajtshëm me kërkimin. */
export function RestaurantBrowseToolbar({
  categories,
  categoryId,
  onCategoryChange,
  sortBy,
  onSortChange,
  priceTier,
  onPriceTierChange,
  openNow,
  onOpenNowChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
      <div className="relative min-w-0">
        <select
          aria-label="Lloji i ushqimit"
          className={`${pillSelect} ${chevronBg} max-w-[9.5rem] min-w-[6.5rem] sm:max-w-none sm:min-w-[7.75rem]`}
          value={categoryId ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onCategoryChange(v === '' ? null : Number(v))
          }}
        >
          <option value="">Lloji i ushqimit</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <select
          aria-label="Rendit sipas"
          className={`${pillSelect} ${chevronBg} min-w-[6rem] sm:min-w-[6.75rem]`}
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
        >
          <option value="rating">Vlerësimi</option>
          <option value="eta">Koha e dërgesës</option>
          <option value="name">Emri A–Z</option>
          <option value="fee">Tarifa e dërgesës</option>
          <option value="proximity">Afër meje (GPS)</option>
        </select>
      </div>

      <div className="relative">
        <select
          aria-label="Çmimi i dërgesës"
          className={`${pillSelect} ${chevronBg} min-w-[6.75rem] sm:min-w-[7.5rem]`}
          value={priceTier}
          onChange={(e) => onPriceTierChange(e.target.value as PriceTierOption)}
        >
          <option value="all">Çmimi · të gjitha</option>
          <option value="low">Dërgesë e ulët</option>
          <option value="medium">Mesatare</option>
          <option value="high">Më e lartë</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => onOpenNowChange(!openNow)}
        className={`${pillButton} ${
          openNow
            ? 'border-sky-400/45 bg-sky-500/20 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]'
            : 'border-white/[0.12] bg-white/[0.06] text-zinc-300 hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-zinc-100'
        }`}
      >
        Hapur tani
      </button>
    </div>
  )
}
