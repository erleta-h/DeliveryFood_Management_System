import type { ReactNode } from 'react'
import type { BrowseHeroStats } from '../lib/restaurantBrowseSections'

type Props = {
  stats: BrowseHeroStats
  searchSlot: ReactNode
  onOpenDeliveryMap?: () => void
  cityLabel?: string
}

export function RestaurantHero({ stats, searchSlot, onOpenDeliveryMap, cityLabel }: Props) {
  const etaRange =
    stats.avgEtaMinutes > 0
      ? `${Math.max(15, stats.avgEtaMinutes - 8)}–${stats.avgEtaMinutes + 12} min`
      : '20–35 min'

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#2a2238] via-[#1e2438] to-[#171c2a] p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] sm:rounded-3xl sm:p-6 lg:p-7">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-300/90">
            FoodDelivery · {cityLabel ?? 'Zona jote'}
          </p>
          <h1 className="landing-brand mt-2 text-2xl font-semibold leading-[1.15] tracking-tight text-zinc-50 sm:text-3xl lg:text-[2rem]">
            Zgjedh ushqimin tënd të preferuar
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
            Porosit nga restorantet më të vlerësuara — dërgesë në{' '}
            <span className="font-semibold text-orange-200">{etaRange}</span>.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
            <StatPill icon="⏱" label="Dërgesa" value={etaRange} />
            <StatPill
              icon="⭐"
              label="Vlerësimi mesatar"
              value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
            />
            <StatPill
              icon="🍽"
              label="Restorante"
              value={String(stats.restaurantCount)}
            />
            {stats.freeDeliveryCount > 0 ? (
              <StatPill
                icon="🚴"
                label="Dërgesë falas"
                value={String(stats.freeDeliveryCount)}
              />
            ) : null}
          </div>

          <div className="mt-5">{searchSlot}</div>

          {onOpenDeliveryMap ? (
            <button
              type="button"
              onClick={onOpenDeliveryMap}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-300/90 transition hover:text-sky-200"
            >
              <span aria-hidden>📍</span>
              Ndrysho adresën e dërgesës
            </button>
          ) : null}
        </div>

        <div className="relative hidden min-h-[12rem] sm:block lg:min-h-[14rem]">
          <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/[0.12] shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&h=480&fit=crop&q=85"
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0f121c]/80 via-transparent to-orange-500/10" />
          </div>
          <div className="absolute -bottom-3 -left-3 max-w-[11rem] rounded-xl border border-white/15 bg-[#1a1f2e]/95 p-3 shadow-xl backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-300">
              Porosi live
            </p>
            <p className="mt-1 text-sm font-bold text-zinc-100">Pizza · 24 min</p>
            <p className="text-xs text-zinc-500">Duke u përgatitur…</p>
          </div>
          <div className="absolute -right-2 top-4 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/25 to-orange-600/20 px-3 py-2 shadow-lg backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase text-amber-100">Promo</p>
            <p className="text-sm font-bold text-white">-15% sot</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 backdrop-blur-sm">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-zinc-100">{value}</p>
    </div>
  )
}
