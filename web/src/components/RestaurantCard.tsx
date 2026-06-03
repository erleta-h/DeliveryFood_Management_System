import { Link } from 'react-router-dom'
import type { RestaurantListItem } from '../lib/restaurantsApi'
import { coverImageForRestaurant, isFreeDelivery } from '../lib/restaurantCardImages'

export type RestaurantCardVariant = 'featured' | 'default' | 'compact'

type Props = {
  restaurant: RestaurantListItem
  variant?: RestaurantCardVariant
}

export function RestaurantCard({ restaurant: r, variant = 'default' }: Props) {
  const cover = coverImageForRestaurant(r)
  const free = isFreeDelivery(r.deliveryFee)
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'

  const linkState = {
    name: r.name,
    deliveryFee: r.deliveryFee,
    averageRating: r.averageRating,
    reviewCount: r.reviewCount,
    categoryName: r.categoryName,
    estimatedDeliveryMinutes: r.estimatedDeliveryMinutes,
    minOrderAmount: r.minOrderAmount,
  }

  return (
    <Link
      to={`/app/restaurants/${r.id}`}
      state={linkState}
      className={`group restaurant-card block overflow-hidden rounded-2xl border border-white/[0.09] bg-[#1e2438]/90 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.65)] transition duration-300 hover:-translate-y-1 hover:border-orange-400/25 hover:shadow-[0_20px_48px_-12px_rgba(251,146,60,0.18)] ${
        isFeatured ? 'w-[min(18rem,78vw)] shrink-0' : isCompact ? 'w-[min(14rem,70vw)] shrink-0' : 'w-full'
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          isFeatured ? 'aspect-[16/10]' : isCompact ? 'aspect-[4/3]' : 'aspect-[16/9]'
        }`}
      >
        <img
          src={cover}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f121c]/95 via-[#0f121c]/35 to-transparent" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            Hapur
          </span>
          {free ? (
            <span className="rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
              Dërgesë falas
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <span aria-hidden>⏱</span>
            {r.estimatedDeliveryMinutes} min
          </span>
          {!free && r.deliveryFee > 0 ? (
            <span className="rounded-lg bg-black/55 px-2 py-1 text-[11px] text-zinc-200 backdrop-blur-sm">
              🛵 {r.deliveryFee.toFixed(2)} €
            </span>
          ) : null}
        </div>
      </div>

      <div className={`${isCompact ? 'p-2.5' : 'p-3.5 sm:p-4'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className={`truncate font-bold text-zinc-50 transition group-hover:text-orange-100 ${
                isCompact ? 'text-sm' : 'text-base sm:text-lg'
              }`}
            >
              {r.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-zinc-400">
              {r.categoryName}
              {r.city ? ` · ${r.city}` : ''}
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-200">
            ⭐ {r.averageRating.toFixed(1)}
          </span>
        </div>

        {!isCompact ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
            {r.minOrderAmount > 0 ? (
              <span>Min. {r.minOrderAmount.toFixed(2)} €</span>
            ) : null}
            {r.reviewCount > 0 ? (
              <>
                <span className="text-zinc-700">·</span>
                <span>{r.reviewCount} vlerësime</span>
              </>
            ) : null}
            {r.distanceKm != null ? (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-emerald-400/90">~{r.distanceKm.toFixed(1)} km</span>
              </>
            ) : null}
          </div>
        ) : null}

        {!isCompact && r.previewItems.length > 0 ? (
          <p className="mt-2 line-clamp-1 text-xs text-zinc-500">
            {r.previewItems
              .slice(0, 3)
              .map((p) => p.name)
              .join(' · ')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
