import type { RestaurantSummary } from '../lib/restaurantsApi'
import { rdPanel } from '../lib/restaurantDetailTheme'

type Props = {
  summary: RestaurantSummary | null
  categoryName: string
  restaurantId: number
  onShowMap?: () => void
}

export function RestaurantDetailInfoBar({
  summary,
  categoryName,
  restaurantId,
  onShowMap,
}: Props) {
  const address = summary
    ? [summary.addressLine, summary.city].filter(Boolean).join(', ')
    : '—'
  const hour = 22 + (restaurantId % 2)

  return (
    <div className={`mx-4 mb-4 sm:mx-6 ${rdPanel} grid divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
      <div className="flex gap-3 p-4">
        <span className="text-lg text-zinc-500" aria-hidden>
          📍
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Adresa</p>
          <p className="mt-0.5 text-sm font-medium text-zinc-100">{address}</p>
          {onShowMap ? (
            <button
              type="button"
              onClick={onShowMap}
              className="mt-1 text-xs font-semibold text-[#F5B800] hover:underline"
            >
              Shiko në hartë &gt;
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex gap-3 p-4">
        <span className="text-lg text-zinc-500" aria-hidden>
          🕒
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Orari i punës
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-100">
            Hapur çdo ditë: 09:00 – {hour}:00
          </p>
        </div>
      </div>
      <div className="flex gap-3 p-4">
        <span className="text-lg text-zinc-500" aria-hidden>
          🏷
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Lloji i ushqimit
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-100">
            {categoryName.replace('&', ',').replace('  ', ' ')}
          </p>
        </div>
      </div>
    </div>
  )
}
