import { Link } from 'react-router-dom'
import type { PublicLandingContent } from '../../lib/publicSiteApi'
import type { RestaurantListItem } from '../../lib/restaurantsApi'
import { coverImageForRestaurant, isFreeDelivery } from '../../lib/restaurantCardImages'
import { formatDeliveryRange } from '../../lib/publicLandingApi'
import { landingGlassCardSm, landingTextGold } from '../../lib/landingTheme'
import { useAuthStore } from '../../store/authStore'
import { ScooterIcon } from './landingIcons'

type Props = {
  content: PublicLandingContent
  restaurants: RestaurantListItem[]
  loading?: boolean
}

function LandingRestaurantCard({ restaurant: r }: { restaurant: RestaurantListItem }) {
  const token = useAuthStore((s) => s.token)
  const cover = coverImageForRestaurant(r)
  const free = isFreeDelivery(r.deliveryFee)
  const to = token ? `/app/restaurants/${r.id}` : `/login?next=${encodeURIComponent(`/app/restaurants/${r.id}`)}`

  return (
    <Link
      to={to}
      className={`${landingGlassCardSm} group block overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-[#ffc107]/25 hover:shadow-[0_24px_48px_-16px_rgba(255,193,7,0.12)]`}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={cover}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0c12]/95 via-[#0a0c12]/20 to-transparent" />
        <span className="absolute left-3 top-3 rounded-md bg-[#ffc107] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-950">
          Hapur
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-white group-hover:text-amber-100">{r.name}</h3>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{r.categoryName}</p>
          </div>
          {r.reviewCount > 0 ? (
            <span className={`shrink-0 text-xs font-bold ${landingTextGold}`}>
              ★ {r.averageRating.toFixed(1)} ({r.reviewCount}+)
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span aria-hidden>⏱</span>
            {formatDeliveryRange(r.estimatedDeliveryMinutes)}
          </span>
          <span className="flex items-center justify-end gap-1.5">
            <ScooterIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            {free ? 'Falas' : `${r.deliveryFee.toFixed(2)} €`}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function FeaturedRestaurants({ content, restaurants, loading }: Props) {
  return (
    <section id="restorantet" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white lg:text-3xl">
              {content.restaurantsTitle} <span aria-hidden>⭐</span>
            </h2>
            <p className="mt-2 text-sm text-zinc-500">{content.restaurantsSubtitle}</p>
          </div>
          <Link
            to="/login?next=%2Fapp%2Frestaurants"
            className={`text-sm font-semibold ${landingTextGold} transition hover:text-amber-300`}
          >
            {content.restaurantsCtaLabel} →
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${landingGlassCardSm} h-72 animate-pulse bg-white/[0.03]`} />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className={`${landingGlassCardSm} mt-8 px-6 py-12 text-center`}>
            <p className="text-sm text-zinc-400">Ende nuk ka restorante të listuara në platformë.</p>
            <p className="mt-1 text-xs text-zinc-600">Kthehu së shpejti — po shtojmë partnerë të rinj.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {restaurants.map((r) => (
              <LandingRestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
