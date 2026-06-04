import { imageUrlForFoodCategory } from '../lib/categoryBrowseImages'
import { etaRangeLabel } from '../lib/restaurantDetailUi'
import type { RestaurantSummary } from '../lib/restaurantsApi'

type Props = {
  summary: RestaurantSummary | null
  restaurantName: string
  deliveryFee: number | null
}

function InfoCell({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="shrink-0 text-zinc-400">{icon}</span>
      <p className="text-sm font-medium text-zinc-200">{text}</p>
    </div>
  )
}

export function CartRestaurantInfoBar({ summary, restaurantName, deliveryFee }: Props) {
  const category = summary?.categoryName ?? 'Restorant'
  const logo = imageUrlForFoodCategory(category)
  const address = summary
    ? [summary.addressLine, summary.city].filter(Boolean).join(', ')
    : '—'
  const rating = summary?.averageRating ?? 0
  const eta = summary ? etaRangeLabel(summary.estimatedDeliveryMinutes) : '—'
  const closeHour = summary ? 22 + (summary.id % 2) : null
  const hours = closeHour != null ? `Hapur deri në ${closeHour}:00` : '—'
  const fee =
    deliveryFee != null ? `${deliveryFee.toFixed(2)} €` : summary ? `${summary.deliveryFee.toFixed(2)} €` : '—'

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1c2030]/90 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="grid divide-y divide-white/[0.06] lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:divide-x lg:divide-y-0">
        <div className="flex gap-4 px-5 py-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#1a2030] ring-2 ring-white/10">
            <img src={logo} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-white">{restaurantName}</p>
              {rating > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-[#F5B800]">
                  ★ {rating.toFixed(1)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-zinc-500">{address}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{hours}</p>
          </div>
        </div>

        <InfoCell
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="6" cy="17" r="2" />
              <circle cx="18" cy="17" r="2" />
              <path d="M4 17h16M5 11h12l2-4H7l-2 4Z" strokeLinejoin="round" />
            </svg>
          }
          text={`Dërgesa ${eta}`}
        />

        <InfoCell
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          }
          text="Pagesë me kartë (Stripe)"
        />

        <InfoCell
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 21s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10Z" />
              <circle cx="12" cy="11" r="2" />
            </svg>
          }
          text={`Tarifa e dërgesës ${fee}`}
        />
      </div>
    </div>
  )
}